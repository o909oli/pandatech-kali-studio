import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Info, Loader2, Lock, User } from "lucide-react";
import { Stage } from "@/components/pt/ui/Stage";
import { Wordmark } from "@/components/pt/ui/Brand";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/panda-mascot.webp";
import bg from "@/assets/login-network.webp";
import { pageHead } from "@/lib/pt/head";
import { useDesktop } from "@/lib/pt/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login-preview")({
  head: () => pageHead("Sign in", "Pandatechs Desktop sign-in screen preview."),
  component: LoginPreview,
});

type Phase = "ready" | "working" | "error" | "locked" | "success";

/**
 * VISUAL PREVIEW ONLY. This form does not authenticate anyone and never reads
 * or stores a password. Real sign-in is handled by the system display manager
 * (see docs/COPILOT_INTEGRATION.md §9).
 */
function LoginPreview() {
  const navigate = useNavigate();
  const welcomeSeen = useDesktop((s) => s.welcomeSeen);
  const [phase, setPhase] = useState<Phase>("ready");
  const [show, setShow] = useState(false);
  const pw = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.current) pw.current.value = "";
    setPhase("working");
    setTimeout(() => {
      setPhase("success");
      setTimeout(() => void navigate({ to: welcomeSeen ? "/desktop" : "/welcome" }), 700);
    }, 900);
  };

  return (
    <Stage>
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_50%,transparent,var(--pt-deep))]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <Wordmark className="h-14" />
        <img src={mascot} alt="" width={300} className="max-h-72 w-auto drop-shadow-[0_0_36px_var(--pt-glow)]" />
        <form onSubmit={submit} className={cn("panel w-[26rem] space-y-3 p-5", phase === "error" && "animate-shake")} aria-label="Sign in preview">
          <label className="input-surface flex items-center gap-2.5 px-3 py-2.5">
            <User className="size-4 text-text-3" />
            <input defaultValue="panda" aria-label="Username" autoComplete="off" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <label className="input-surface flex items-center gap-2.5 px-3 py-2.5">
            <Lock className="size-4 text-text-3" />
            <input ref={pw} type={show ? "text" : "password"} placeholder="Password" aria-label="Password" autoComplete="off" className="w-full bg-transparent text-sm outline-none placeholder:text-text-3" />
            <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="text-text-3 hover:text-text">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </label>
          {phase === "error" && <p role="alert" className="text-xs text-danger">Incorrect username or password. (Preview of the error state.)</p>}
          {phase === "locked" && <p role="alert" className="text-xs text-warning">Too many attempts. Try again in 5 minutes. (Preview.)</p>}
          {phase === "success" && <p className="text-xs text-success">Welcome back, panda.</p>}
          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={phase === "working" || phase === "success" || phase === "locked"}>
            {phase === "working" ? <><Loader2 className="animate-spin-med" /> Signing in…</> : "Log In"}
          </Button>
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-text-3"><Info className="mt-px size-3.5 shrink-0 text-cyan" />Preview only. Nothing you type here is checked or saved; system sign-in is handled by the operating system.</p>
        </form>
        <div className="flex items-center gap-2 text-[11px] text-text-3">
          Preview state:
          {(["ready", "error", "locked"] as Phase[]).map((p) => (
            <button key={p} type="button" onClick={() => setPhase(p)} className={cn("rounded-full border px-2.5 py-0.5 capitalize", phase === p ? "border-cyan/60 text-text" : "border-line hover:text-text-2")}>{p}</button>
          ))}
          <button type="button" onClick={() => void navigate({ to: "/desktop" })} className="ml-3 text-cyan hover:underline">Skip to desktop</button>
        </div>
      </div>
    </Stage>
  );
}
