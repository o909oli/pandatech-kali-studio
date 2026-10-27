import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cpu, Database, HardDrive, Lock, Network, Shield, Wifi } from "lucide-react";
import { Stage } from "@/components/pt/ui/Stage";
import { Wordmark } from "@/components/pt/ui/Brand";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/panda-mascot.webp";
import bg from "@/assets/login-network.webp";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/boot-preview")({
  head: () => pageHead("Startup", "Pandatechs Desktop startup screen preview."),
  component: BootPreview,
});

const STEPS = [
  { t: "Initialising secure environment", icon: Shield },
  { t: "Loading core modules", icon: Cpu },
  { t: "Checking storage", icon: HardDrive },
  { t: "Starting network services", icon: Network },
  { t: "Preparing P assistant", icon: Database },
  { t: "Ready", icon: Lock },
];

function BootPreview() {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= STEPS.length - 1) {
      const t = setTimeout(() => void navigate({ to: "/login-preview" }), 1200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setI((n) => n + 1), 850);
    return () => clearTimeout(t);
  }, [i, navigate]);
  const pct = Math.round(((i + 1) / STEPS.length) * 100);
  const step = STEPS[i] ?? STEPS[0]!;
  const Cur = step.icon;

  return (
    <Stage>
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_45%,transparent,var(--pt-deep))]" />
      <div className="absolute inset-6 rounded-2xl border border-line-strong shadow-[inset_0_0_80px_-30px_var(--pt-glow)]" aria-hidden />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center">
        <Wordmark className="h-14" />
        <img src={mascot} alt="Pandatechs panda mascot" width={420} className="max-h-[22rem] w-auto drop-shadow-[0_0_40px_var(--pt-glow)]" />
        <div className="w-[34rem]">
          <p className="mb-2 flex items-center justify-center gap-2 font-display text-sm tracking-[0.2em] text-text-2 uppercase">
            <Cur className="size-4 text-cyan" /> {step.t}…
          </p>
          <div className="h-2 overflow-hidden rounded-full border border-line-strong bg-deep" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Startup progress">
            <div className="relative h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }}>
              <span className="animate-sweep absolute inset-0 bg-gradient-to-r from-transparent via-ice/50 to-transparent" />
            </div>
          </div>
          <p className="mt-1.5 font-display text-xs tabular-nums text-text-3">{pct}%</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-10 flex justify-center gap-8 text-text-3">
        {[Shield, Cpu, HardDrive, Wifi, Lock].map((Icon, k) => (
          <span key={k} className={k <= i ? "text-cyan" : ""}><Icon className="size-5" /></span>
        ))}
      </div>
      <div className="absolute right-10 top-10 flex gap-2">
        <Button variant="hud" size="sm" onClick={() => void navigate({ to: "/login-preview" })}>Skip</Button>
      </div>
      <p className="absolute bottom-3 w-full text-center font-display text-[10px] tracking-[0.2em] text-text-3 uppercase">Startup preview — the real boot splash is configured by the system, see docs</p>
    </Stage>
  );
}
