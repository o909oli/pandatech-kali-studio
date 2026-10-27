import { useSyncExternalStore } from "react";
import { createParser } from "eventsource-parser";

/**
 * P's voice.
 * - Output: natural voice streamed from the app's /api/p-speech route (Lovable AI);
 *   falls back to the browser's built-in voice if that fails.
 * - Input: the browser's speech recognition where available (Chrome / Edge).
 * On the native build Copilot can swap both for local engines (see docs §8).
 */
let speaking = false;
let listening = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const setSpeaking = (v: boolean) => {
  speaking = v;
  emit();
};
const setListening = (v: boolean) => {
  listening = v;
  emit();
};

let current: AbortController | null = null;

const toSpeech = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, " (code shown on screen) ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1100);

function browserSpeak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => /female|samantha|zira|aria|jenny|libby|sonia/i.test(x.name)) ?? voices.find((x) => x.lang.startsWith("en"));
  if (v) u.voice = v;
  u.onstart = () => setSpeaking(true);
  u.onend = () => setSpeaking(false);
  u.onerror = () => setSpeaking(false);
  window.speechSynthesis.speak(u);
}

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

async function streamVoice(text: string, signal: AbortSignal) {
  const context = new AudioContext({ sampleRate: 24000 });
  const sources = new Set<AudioBufferSourceNode>();
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let played = 0;
  let playback: Promise<void> = Promise.resolve();
  const stopAll = () => sources.forEach((s) => s.stop());
  signal.addEventListener("abort", stopAll, { once: true });
  try {
    if (context.state === "suspended") await context.resume();
    const res = await fetch("/api/p-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`voice ${res.status}`);
    const parser = createParser({
      onEvent(event) {
        const p = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (p.type === "error" || p.error) throw new Error("voice error");
        if (p.type === "speech.audio.done") {
          completed = true;
          return;
        }
        if (p.type !== "speech.audio.delta" || !p.audio) return;
        const d = decodePCM(pending, Uint8Array.from(atob(p.audio), (c) => c.charCodeAt(0)));
        pending = new Uint8Array(d.pending);
        if (!d.samples.length) return;
        played += d.samples.length;
        const buffer = context.createBuffer(1, d.samples.length, 24000);
        buffer.copyToChannel(d.samples, 0);
        const src = context.createBufferSource();
        src.buffer = buffer;
        src.connect(context.destination);
        sources.add(src);
        playback = new Promise<void>((resolve) => {
          src.onended = () => {
            sources.delete(src);
            resolve();
          };
        });
        playhead = Math.max(playhead, context.currentTime + 0.05);
        if (!speaking) setSpeaking(true);
        src.start(playhead);
        playhead += buffer.duration;
      },
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      for (;;) {
        const n = await reader.read();
        if (n.done) break;
        parser.feed(n.value);
      }
    } finally {
      reader.releaseLock();
    }
    if (!completed || !played) throw new Error("incomplete voice");
    await playback;
  } finally {
    signal.removeEventListener("abort", stopAll);
    stopAll();
    await context.close().catch(() => undefined);
  }
}

export function speak(markdown: string) {
  const text = toSpeech(markdown);
  if (!text || typeof window === "undefined") return;
  stopSpeaking();
  const ctrl = new AbortController();
  current = ctrl;
  void streamVoice(text, ctrl.signal)
    .catch(() => {
      if (!ctrl.signal.aborted) browserSpeak(text);
    })
    .finally(() => {
      if (current === ctrl && !(typeof window !== "undefined" && window.speechSynthesis?.speaking)) setSpeaking(false);
    });
}

export function stopSpeaking() {
  current?.abort();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setSpeaking(false);
}

/* ---------------- voice input ---------------- */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export const listenSupported = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

let rec: Recognition | null = null;

export function listen(onPartial: (t: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!listenSupported()) return reject(new Error("Voice input isn't supported in this browser. Try Chrome or Edge."));
    stopSpeaking();
    const W = window as unknown as Record<string, new () => Recognition>;
    const Ctor = W["SpeechRecognition"] ?? W["webkitSpeechRecognition"];
    if (!Ctor) return reject(new Error("Voice input unavailable."));
    rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0]?.transcript ?? "";
        else interim += r[0]?.transcript ?? "";
      }
      onPartial((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setListening(false);
      reject(new Error(e.error === "not-allowed" ? "Microphone permission was denied." : "I didn't catch that."));
    };
    rec.onend = () => {
      setListening(false);
      resolve(finalText.trim());
    };
    setListening(true);
    rec.start();
  });
}

export function stopListening() {
  rec?.stop();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useSpeaking() {
  return useSyncExternalStore(subscribe, () => speaking, () => false);
}
export function useListening() {
  return useSyncExternalStore(subscribe, () => listening, () => false);
}
