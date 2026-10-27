import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, LocateFixed, MapPinOff, ShieldCheck } from "lucide-react";
import { Emblem } from "@/components/pt/ui/Brand";
import { Button } from "@/components/ui/button";
import { consentToShare, getShareInfo, sendPosition, stopSharing, type ShareInfo } from "@/lib/location/share.functions";
import { isValidToken, type ShareStatus } from "@/lib/location/rules";

export const Route = createFileRoute("/locate/$token")({
  loader: async ({ params }): Promise<ShareInfo> => {
    if (!isValidToken(params.token)) return { found: false, status: "expired", requesterName: null, message: null, expiresAt: null };
    return getShareInfo({ data: { token: params.token } });
  },
  head: () => ({
    meta: [
      { title: "Share your location | Pandatechs" },
      { name: "description", content: "Someone asked you to share your location. Review the request and choose whether to allow it." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Share your location | Pandatechs" },
      { property: "og:description", content: "Review the request and choose whether to share your location. You can stop at any time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LocatePage,
});

type Phase = "ask" | "sharing" | "resume" | "ended" | "blocked";

function LocatePage() {
  const { token } = Route.useParams();
  const info = Route.useLoaderData();
  const consent = useServerFn(consentToShare);
  const send = useServerFn(sendPosition);
  const stop = useServerFn(stopSharing);

  const initial: Phase = !info.found ? "ended" : info.status === "pending" ? "ask" : info.status === "sharing" ? "resume" : "ended";
  const [phase, setPhase] = useState<Phase>(initial);
  const [endedAs, setEndedAs] = useState<ShareStatus>(info.found ? info.status : "expired");
  const [lastSent, setLastSent] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watch = useRef<number | null>(null);
  const lastPing = useRef(0);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const halt = useCallback(() => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    void wake.current?.release().catch(() => {});
    wake.current = null;
  }, []);
  useEffect(() => halt, [halt]);

  const begin = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("This browser cannot share a location.");
      setPhase("blocked");
      return;
    }
    setError(null);
    setPhase("sharing");
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    void nav.wakeLock?.request("screen").then((l) => (wake.current = l)).catch(() => {});
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const t = Date.now();
        if (t - lastPing.current < 5000) return;
        lastPing.current = t;
        setAccuracy(pos.coords.accuracy);
        void send({ data: { token, position: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy } } })
          .then((r) => {
            if (r.ok) setLastSent(Date.now());
            else {
              halt();
              setEndedAs(r.status);
              setPhase("ended");
            }
          })
          .catch(() => setError("Connection lost. Trying again…"));
      },
      (err) => {
        halt();
        setError(err.code === err.PERMISSION_DENIED ? "Location permission is blocked. Allow location for this site in your browser settings, then try again." : "Your location could not be read. Check that location is turned on.");
        setPhase("blocked");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [halt, send, token]);

  async function allow() {
    const r = await consent({ data: { token } });
    if (!r.ok) {
      setEndedAs(r.status);
      setPhase("ended");
      return;
    }
    begin();
  }

  async function end(decline: boolean) {
    halt();
    await stop({ data: { token, decline } }).catch(() => {});
    setEndedAs(decline ? "declined" : "stopped");
    setPhase("ended");
  }

  const who = info.requesterName?.trim() || "Someone";

  return (
    <main className="grid min-h-screen place-items-center bg-deep px-4 py-8 text-text">
      <div className="panel w-full max-w-md space-y-5 p-6">
        <div className="flex items-center gap-3">
          <Emblem glow className="size-10" />
          <div>
            <p className="hud-label">Pandatechs</p>
            <h1 className="font-display text-lg font-semibold">Location sharing</h1>
          </div>
        </div>

        {phase === "ask" && (
          <>
            <p className="text-sm text-text-2"><b className="text-text">{who}</b> is asking you to share your location.</p>
            {info.message && <p className="rounded-md border border-line bg-deep/60 p-3 text-sm italic text-text-2">“{info.message}”</p>}
            <ul className="space-y-2 text-xs text-text-2">
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> Your phone will ask for permission first. Nothing is shared until you tap Allow.</li>
              <li className="flex gap-2"><LocateFixed className="mt-0.5 size-4 shrink-0 text-cyan" /> Your live position is sent only while this page stays open.</li>
              <li className="flex gap-2"><MapPinOff className="mt-0.5 size-4 shrink-0 text-warning" /> You can stop at any time. Stopping ends the link.</li>
            </ul>
            <div className="flex gap-2">
              <Button variant="brand" className="flex-1" onClick={() => void allow()}>Allow and share</Button>
              <Button variant="hud" onClick={() => void end(true)}>No thanks</Button>
            </div>
          </>
        )}

        {phase === "resume" && (
          <>
            <p className="text-sm text-text-2">You agreed to share your location with <b className="text-text">{who}</b>. Sharing paused when this page closed.</p>
            <div className="flex gap-2">
              <Button variant="brand" className="flex-1" onClick={begin}>Resume sharing</Button>
              <Button variant="danger" onClick={() => void end(false)}>Stop</Button>
            </div>
          </>
        )}

        {phase === "sharing" && (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3">
              <span className="relative grid size-9 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-success/30" /><LocateFixed className="relative size-5 text-success" /></span>
              <div className="text-sm">
                <p className="font-medium text-success">Sharing your location with {who}</p>
                <p className="text-xs text-text-3">
                  {lastSent ? `Last sent ${new Date(lastSent).toLocaleTimeString()}${accuracy ? ` · ±${Math.round(accuracy)} m` : ""}` : "Finding your position…"}
                </p>
              </div>
            </div>
            {error && <p className="text-xs text-warning">{error}</p>}
            <p className="text-xs text-text-3">Keep this page open. Closing it pauses sharing.</p>
            <Button variant="danger" className="w-full" onClick={() => void end(false)}>Stop sharing</Button>
          </>
        )}

        {phase === "blocked" && (
          <>
            <p className="text-sm text-warning">{error}</p>
            <div className="flex gap-2">
              <Button variant="brand" className="flex-1" onClick={begin}>Try again</Button>
              <Button variant="hud" onClick={() => void end(false)}>Stop</Button>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto size-10 text-cyan" />
            <p className="text-sm font-medium">
              {!info.found
                ? "This link is not valid."
                : endedAs === "stopped"
                  ? "Sharing has stopped."
                  : endedAs === "declined"
                    ? "You declined. Nothing was shared."
                    : "This link has expired."}
            </p>
            <p className="text-xs text-text-3">No location is being shared. You can close this page.</p>
          </div>
        )}
      </div>
    </main>
  );
}
