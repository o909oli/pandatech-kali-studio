import { createFileRoute } from "@tanstack/react-router";
import { handlePChat } from "@/lib/p/p-chat.server";

export const Route = createFileRoute("/api/p-chat")({
  server: { handlers: { POST: ({ request }) => handlePChat(request) } },
});
