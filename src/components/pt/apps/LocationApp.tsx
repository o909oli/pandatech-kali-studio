import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import {
  Copy, ExternalLink, LogOut, MapPin, MessageSquareText, Phone, Plus, Share2, ShieldCheck, Square, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { LocationAuthGate } from "@/components/pt/location/LocationAuthGate";
import { EmptyState, Panel } from "@/components/pt/ui/bits";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/pt/store";
import { timeAgo } from "@/lib/pt/format";
import {
  DURATION_HOURS, STATUS_LABEL, effectiveStatus, inviteText, isValidPhone, normalisePhone, shareUrl, smsHref, telHref,
  type DurationHours, type ShareStatus,
} from "@/lib/location/rules";
import { cn } from "@/lib/utils";

const LocationMap = lazy(() => import("@/components/pt/location/LocationMap").then((m) => ({ default: m.LocationMap })));

type Req = Database["public"]["Tables"]["location_requests"]["Row"];

const STATUS_TONE: Record<ShareStatus, string> = {
  pending: "border-warning/50 text-warning",
  sharing: "border-success/50 text-success",
  stopped: "border-line-strong text-text-3",
  declined: "border-danger/50 text-danger",
  expired: "border-line-strong text-text-3",
};

function StatusChip({ status }: { status: ShareStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-display text-[9px] font-semibold uppercase tracking-[0.14em]", STATUS_TONE[status])}>
      <span className={cn("size-1 rounded-full bg-current", status === "sharing" && "animate-breathe")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LocationApp() {
  const { user, loading, signOut } = useAuth();
  if (loading) return <div className="grid h-full place-items-center text-sm text-text-3">Loading…</div>;
  if (!user) return <LocationAuthGate />;
  return <LocationWorkspace userId={user.id} email={user.email ?? ""} onSignOut={() => void signOut()} />;
}

function useNow(ms = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function LocationWorkspace({ userId, email, onSignOut }: { userId: string; email: string; onSignOut: () => void }) {
  const qc = useQueryClient();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const requests = useQuery({
    queryKey: ["location-requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("location_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pings = useQuery({
    queryKey: ["location-pings", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_pings")
        .select("lat, lng, recorded_at")
        .eq("request_id", selectedId!)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`loc-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "location_requests" }, () => {
        void qc.invalidateQueries({ queryKey: ["location-requests", userId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_pings" }, () => {
        void qc.invalidateQueries({ queryKey: ["location-pings"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc, userId]);

  const list = requests.data ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? null;

  const points = useMemo(
    () =>
      list
        .filter((r) => r.last_lat != null && r.last_lng != null)
        .map((r) => ({
          id: r.id,
          lat: r.last_lat!,
          lng: r.last_lng!,
          accuracy: r.last_accuracy,
          label: r.contact_name,
          live: effectiveStatus(r, now) === "sharing",
        })),
    [list, now],
  );
  const trail = useMemo<[number, number][]>(() => (pings.data ?? []).map((p) => [p.lat, p.lng]), [pings.data]);

  const counts = useMemo(() => {
    const c = { sharing: 0, pending: 0 };
    for (const r of list) {
      const s = effectiveStatus(r, now);
      if (s === "sharing") c.sharing++;
      if (s === "pending") c.pending++;
    }
    return c;
  }, [list, now]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[22rem_1fr] gap-3 p-3">
      <aside className="flex min-h-0 flex-col gap-3">
        <div className="panel flex items-center gap-3 p-3">
          <span className="grid size-10 place-items-center rounded-lg border border-line-strong bg-deep text-cyan"><MapPin className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">{counts.sharing} sharing live · {counts.pending} waiting</p>
            <p className="truncate text-[11px] text-text-3">{email}</p>
          </div>
          <Button variant="quiet" size="icon-sm" aria-label="Sign out" onClick={onSignOut}><LogOut /></Button>
        </div>

        {creating ? (
          <NewRequestForm
            userId={userId}
            onCancel={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              setSelectedId(id);
              void qc.invalidateQueries({ queryKey: ["location-requests", userId] });
            }}
          />
        ) : (
          <Button variant="brand" onClick={() => setCreating(true)}><Plus className="size-4" /> New location request</Button>
        )}

        <Panel title="Requests" bodyClassName="scroll-thin overflow-y-auto" className="flex-1">
          {requests.isLoading ? (
            <p className="p-4 text-xs text-text-3">Loading…</p>
          ) : list.length === 0 ? (
            <EmptyState title="No requests yet" body="Create a request, then send the link by text message or share it during a call." />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((r) => {
                const s = effectiveStatus(r, now);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                      className={cn("flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-surface/50", r.id === selectedId && "bg-electric/10")}
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-text">{r.contact_name}</span>
                        <span className="ml-auto"><StatusChip status={s} /></span>
                      </span>
                      <span className="text-[11px] text-text-3">
                        {r.phone ? `${r.phone} · ` : ""}
                        {r.last_seen_at ? `Updated ${timeAgo(r.last_seen_at, now)}` : `Created ${timeAgo(r.created_at, now)}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </aside>

      <section className="flex min-h-0 flex-col gap-3">
        <div className="panel relative min-h-0 flex-1 overflow-hidden !p-0">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-text-3">Loading map…</div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-text-3">Loading map…</div>}>
              <LocationMap points={points} trail={selected ? trail : []} selectedId={selectedId} onSelect={setSelectedId} />
            </Suspense>
          </ClientOnly>
          {points.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <span className="rounded-full border border-line-strong bg-deep/85 px-3 py-1 text-xs text-text-2">
                Locations appear here once someone accepts your request
              </span>
            </div>
          )}
        </div>
        {selected ? <RequestDetail req={selected} now={now} onDeleted={() => setSelectedId(null)} /> : <ConsentNote />}
      </section>
    </div>
  );
}

function ConsentNote() {
  return (
    <div className="panel flex items-start gap-3 p-3 text-xs text-text-2">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
      <p>
        Location is only shared when the phone owner opens your link and taps <b className="text-text">Allow</b>. A phone number or call
        alone never reveals a location. Sharing runs while their page stays open, and they can stop at any time.
      </p>
    </div>
  );
}

function NewRequestForm({ userId, onCreated, onCancel }: { userId: string; onCreated: (id: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [hours, setHours] = useState<DurationHours>(24);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (phone && !isValidPhone(phone)) return toast("That phone number does not look right", "warning");
    setBusy(true);
    const { data, error } = await supabase
      .from("location_requests")
      .insert({
        owner_id: userId,
        contact_name: name.trim().slice(0, 80),
        phone: phone ? normalisePhone(phone) : null,
        requester_name: from.trim().slice(0, 80) || null,
        message: message.trim().slice(0, 300) || null,
        expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) return toast(error?.message ?? "Could not create the request", "error");
    toast("Request created. Now send the link.", "success");
    onCreated(data.id);
  }

  const field = "input-surface mt-1 w-full bg-transparent px-2.5 py-1.5 text-sm text-text outline-none";
  return (
    <form onSubmit={submit} className="panel space-y-2.5 p-3">
      <h3 className="hud-label !text-text-2">New location request</h3>
      <label className="block text-xs text-text-2">Who are you asking?
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amani" className={field} />
      </label>
      <label className="block text-xs text-text-2">Their phone number (for text or call)
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7…" className={field} />
      </label>
      <label className="block text-xs text-text-2">Your name, shown to them
        <input maxLength={80} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Lon" className={field} />
      </label>
      <label className="block text-xs text-text-2">Message (optional)
        <textarea maxLength={300} rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Let me know you got home safe" className={cn(field, "resize-none")} />
      </label>
      <div className="text-xs text-text-2">Link works for
        <div className="mt-1 flex gap-1.5">
          {DURATION_HOURS.map((h) => (
            <button key={h} type="button" onClick={() => setHours(h)}
              className={cn("flex-1 rounded-md border px-2 py-1 text-xs", hours === h ? "border-cyan/60 bg-electric/20 text-text" : "border-line text-text-2 hover:border-line-strong")}>
              {h < 24 ? `${h} h` : `${h / 24} day${h > 24 ? "s" : ""}`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="brand" size="sm" className="flex-1" disabled={busy}>Create link</Button>
        <Button type="button" variant="hud" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function RequestDetail({ req, now, onDeleted }: { req: Req; now: number; onDeleted: () => void }) {
  const qc = useQueryClient();
  const status = effectiveStatus(req, now);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin ? shareUrl(origin, req.token) : "";
  const text = inviteText({ from: req.requester_name, message: req.message, url });
  const active = status === "pending" || status === "sharing";

  async function copy() {
    await navigator.clipboard.writeText(url);
    toast("Link copied", "success");
  }
  async function share() {
    if (navigator.share) await navigator.share({ title: "Share your location", text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text);
      toast("Invite copied", "success");
    }
  }
  async function stop() {
    const { error } = await supabase.from("location_requests").update({ status: "stopped", stopped_at: new Date().toISOString() }).eq("id", req.id);
    if (error) return toast(error.message, "error");
    toast("Sharing stopped. The link no longer works.", "success");
    void qc.invalidateQueries({ queryKey: ["location-requests"] });
  }
  async function remove() {
    const { error } = await supabase.from("location_requests").delete().eq("id", req.id);
    if (error) return toast(error.message, "error");
    toast("Request and its location history deleted", "success");
    void qc.invalidateQueries({ queryKey: ["location-requests"] });
    onDeleted();
  }

  return (
    <div className="panel grid grid-cols-[1fr_auto] gap-4 p-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-sm font-semibold text-text">{req.contact_name}</h3>
          <StatusChip status={status} />
        </div>
        {req.last_lat != null && req.last_lng != null ? (
          <p className="font-mono text-xs text-text-2">
            {req.last_lat.toFixed(5)}, {req.last_lng.toFixed(5)}
            {req.last_accuracy != null && <span className="text-text-3"> · ±{Math.round(req.last_accuracy)} m</span>}
            {req.last_seen_at && <span className="text-text-3"> · {timeAgo(req.last_seen_at, now)}</span>}
          </p>
        ) : (
          <p className="text-xs text-text-3">{status === "pending" ? "No location yet. They have not accepted." : "No location was shared."}</p>
        )}
        {active && <p className="truncate font-mono text-[11px] text-cyan">{url}</p>}
        <p className="text-[11px] text-text-3">
          {active ? `Link ends ${new Date(req.expires_at).toLocaleString()}` : "This link no longer works. Create a new request to ask again."}
        </p>
      </div>
      <div className="flex flex-wrap content-start justify-end gap-1.5">
        {active && (
          <>
            {req.phone && (
              <>
                <Button asChild variant="brand" size="xs"><a href={smsHref(req.phone, text)}><MessageSquareText /> Text link</a></Button>
                <Button asChild variant="hud" size="xs"><a href={telHref(req.phone)}><Phone /> Call</a></Button>
              </>
            )}
            <Button variant="hud" size="xs" onClick={() => void copy()}><Copy /> Copy link</Button>
            <Button variant="hud" size="xs" onClick={() => void share()}><Share2 /> Share</Button>
            <Button variant="danger" size="xs" onClick={() => void stop()}><Square /> Stop</Button>
          </>
        )}
        {req.last_lat != null && (
          <Button asChild variant="hud" size="xs">
            <a href={`https://www.openstreetmap.org/?mlat=${req.last_lat}&mlon=${req.last_lng}#map=17/${req.last_lat}/${req.last_lng}`} target="_blank" rel="noreferrer"><ExternalLink /> Open map</a>
          </Button>
        )}
        <Button variant="quiet" size="xs" onClick={() => void remove()}><Trash2 /> Delete</Button>
      </div>
    </div>
  );
}
