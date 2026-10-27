import { useEffect, useRef, useState } from "react";
import hologram from "@/assets/p-hologram.webp";
import talking from "@/assets/p-talking.mp4.asset.json";
import idle from "@/assets/p-idle.mp4.asset.json";
import talkingWebm from "@/assets/p-talking.webm.asset.json";
import idleWebm from "@/assets/p-idle.webm.asset.json";
import { useDesktop } from "@/lib/pt/store";
import { useSpeaking } from "@/lib/pt/voice";
import { cn } from "@/lib/utils";

/**
 * P in motion. Two seamless loops cross-fade: an idle loop (breathing, blinking)
 * and a talking loop (mouth moving) that plays while P is responding or her
 * voice is speaking. For phoneme-accurate lip sync, Copilot can drive a
 * viseme rig from the TTS engine — see docs/COPILOT_INTEGRATION.md §8.
 */
export function PHologram({ className }: { className?: string | undefined }) {
  const state = useDesktop((s) => s.assistantState);
  const reduceMotion = useDesktop((s) => s.reduceMotion);
  const speaking = useSpeaking();
  const talkingNow = speaking || state === "responding";
  const talkRef = useRef<HTMLVideoElement>(null);
  const idleRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = talkRef.current;
    if (!v) return;
    if (talkingNow && !reduceMotion) void v.play().catch(() => undefined);
    else v.pause();
  }, [talkingNow, reduceMotion]);

  useEffect(() => {
    const v = idleRef.current;
    if (!v) return;
    if (reduceMotion) v.pause();
    else void v.play().catch(() => undefined);
  }, [reduceMotion]);

  const mask = "radial-gradient(closest-side at 50% 52%, black 72%, transparent 100%)";
  return (
    <div className={cn("relative aspect-[9/16] h-full", className)} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <img src={hologram} alt="" aria-hidden className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-500", ready && !reduceMotion ? "opacity-0" : "opacity-100")} />
      <video
        ref={idleRef}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        onPlaying={() => setReady(true)}
        aria-hidden
        className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", reduceMotion && "hidden")}
      >
        <source src={idleWebm.url} type="video/webm" />
        <source src={idle.url} type="video/mp4" />
      </video>
      <video
        ref={talkRef}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-300", talkingNow && !reduceMotion ? "opacity-100" : "opacity-0")}
      >
        <source src={talkingWebm.url} type="video/webm" />
        <source src={talking.url} type="video/mp4" />
      </video>
      <span className="sr-only">{talkingNow ? "P is speaking" : "P is listening"}</span>
    </div>
  );
}
