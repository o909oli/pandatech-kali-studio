import { useSyncExternalStore } from "react";

/**
 * Voice output for P using the browser's built-in speech engine.
 * On the native build Copilot can swap this for a local TTS (e.g. Piper)
 * that also emits viseme timings for exact lip sync.
 */
let speaking = false;
const listeners = new Set<() => void>();
const emit = (v: boolean) => {
  speaking = v;
  listeners.forEach((l) => l());
};

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(markdown: string) {
  if (!voiceSupported()) return false;
  const text = markdown
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/[*_`#>|-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 800));
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /female|samantha|zira|aria|jenny|google uk english female/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en"));
  if (preferred) u.voice = preferred;
  u.rate = 1.02;
  u.pitch = 1.05;
  u.onstart = () => emit(true);
  u.onend = () => emit(false);
  u.onerror = () => emit(false);
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (voiceSupported()) window.speechSynthesis.cancel();
  emit(false);
}

export function useSpeaking() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => speaking,
    () => false,
  );
}
