import { useState, type FormEvent } from "react";
import { LockKeyhole, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/pt/store";

/** Real account sign-in. Shared locations are private, so only the signed-in owner can see them. */
export function LocationAuthGate() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setNote("Check your email and confirm your address, then sign in.");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not sign in", "error");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast(r.error instanceof Error ? r.error.message : "Google sign-in failed", "error");
  }

  return (
    <div className="grid h-full place-items-center p-6">
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-line-strong bg-deep text-cyan"><MapPin className="size-5" /></span>
          <div>
            <h2 className="font-display text-base font-semibold text-text">Location Center</h2>
            <p className="text-xs text-text-3">Sign in to manage consent-based location sharing.</p>
          </div>
        </div>
        <p className="flex gap-2 rounded-md border border-line bg-deep/60 p-2.5 text-xs text-text-2">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-cyan" />
          Shared locations are private. Only your account can see them.
        </p>
        <label className="block text-xs text-text-2">Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-surface mt-1 w-full bg-transparent px-2.5 py-2 text-sm text-text outline-none" />
        </label>
        <label className="block text-xs text-text-2">Password
          <input type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-surface mt-1 w-full bg-transparent px-2.5 py-2 text-sm text-text outline-none" />
        </label>
        {note && <p className="text-xs text-success">{note}</p>}
        <Button type="submit" variant="brand" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        <Button type="button" variant="hud" className="w-full" onClick={() => void google()}>Continue with Google</Button>
        <button type="button" className="w-full text-center text-xs text-cyan hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account yet? Create one" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
