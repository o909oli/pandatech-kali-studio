import { createFileRoute } from "@tanstack/react-router";
import { describeAi, resolveAiConnection } from "@/lib/p/ai-config.server";

/** Tells the UI whether P's AI is connected and where it runs. Never returns keys or URLs. */
export const Route = createFileRoute("/api/p-status")({
  server: {
    handlers: {
      GET: () => {
        const ai = describeAi(resolveAiConnection());
        const voice = Boolean(process.env["LOVABLE_API_KEY"]);
        return Response.json({ ai, voice: voice ? "natural" : "browser" }, { headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
