import { demoStudio } from "../demo/studio";
import { nativeStudio } from "../native/studio";
import { desktopStore } from "../store";
import type { StudioIntegration } from "./types";

/** Picks the Studio implementation from the single desktop `mode` switch. */
export function getStudio(): StudioIntegration {
  return desktopStore.get().mode === "native" ? nativeStudio : demoStudio;
}
