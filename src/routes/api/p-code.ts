import { createFileRoute } from "@tanstack/react-router";
import { handlePCode } from "@/lib/p/p-code.server";

export const Route = createFileRoute("/api/p-code")({
  server: { handlers: { POST: ({ request }) => handlePCode(request) } },
});
