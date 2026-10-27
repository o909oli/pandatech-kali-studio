import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bot, FolderOpen, Lock, Palette } from "lucide-react";
import { Stage } from "@/components/pt/ui/Stage";
import { Wordmark } from "@/components/pt/ui/Brand";
import { PHologram } from "@/components/pt/assistant/PHologram";
import { Button } from "@/components/ui/button";
import bg from "@/assets/login-network.webp";
import { pageHead } from "@/lib/pt/head";
import { setDesktop } from "@/lib/pt/store";

export const Route = createFileRoute("/welcome")({
  head: () => pageHead("Welcome", "First-run welcome to Pandatechs Desktop and your assistant P."),
  component: Welcome,
});

const POINTS = [
  { icon: Bot, t: "Meet P", d: "Ask in plain words. P explains, finds and opens things for you." },
  { icon: Lock, t: "You stay in control", d: "Anything that changes your system waits for your approval." },
  { icon: FolderOpen, t: "Everything in reach", d: "Files, terminal, editor, monitor, network and security together." },
  { icon: Palette, t: "Make it yours", d: "Pick an accent colour and wallpaper in Settings." },
];

function Welcome() {
  const navigate = useNavigate();
  const done = () => {
    setDesktop({ welcomeSeen: true });
    void navigate({ to: "/desktop" });
  };
  return (
    <Stage>
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_70%_50%,transparent,var(--pt-deep))]" />
      <div className="absolute inset-0 grid grid-cols-[1fr_32rem] items-center gap-10 px-24">
        <div className="animate-rise">
          <Wordmark className="mb-8 h-14" />
          <h1 className="font-display text-5xl font-semibold leading-tight text-text">Welcome to <span className="text-brand">Pandatechs Desktop</span></h1>
          <p className="mt-3 max-w-xl text-lg text-text-2">Built for professionals. Designed for excellence.</p>
          <ul className="mt-8 grid max-w-2xl grid-cols-2 gap-3">
            {POINTS.map((p) => (
              <li key={p.t} className="panel flex gap-3 p-4">
                <p.icon className="mt-0.5 size-5 shrink-0 text-cyan" />
                <div><p className="font-display text-sm font-semibold">{p.t}</p><p className="text-xs text-text-2">{p.d}</p></div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <Button variant="brand" size="xl" onClick={done}>Enter desktop</Button>
            <Button variant="hud" size="xl" onClick={() => { setDesktop({ welcomeSeen: true }); void navigate({ to: "/assistant" }); }}>Talk to P</Button>
          </div>
        </div>
        <div className="h-[44rem] justify-self-center py-6"><PHologram /></div>
      </div>
    </Stage>
  );
}
