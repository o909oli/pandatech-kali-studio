import { createFileRoute } from "@tanstack/react-router";
import { handlePSpeech } from "@/lib/p/p-speech.server";

export const Route = createFileRoute("/api/p-speech")({
  server: { handlers: { POST: ({ request }) => handlePSpeech(request) } },
});
