import { APICallError, stepCountIs, streamText, tool, type ModelMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";
import { chatModel, chatProviderOptions, NOT_CONFIGURED, resolveAiConnection } from "./ai-config.server";
import { INTERNAL_APP_IDS, PROPOSABLE_OPERATIONS, sanitizeProposal } from "./proposal";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(40),
  context: z
    .object({
      dataMode: z.enum(["demo", "native"]),
      localTime: z.string().max(80),
      system: z.string().max(1500),
    })
    .partial()
    .optional(),
});

function persona(ctx: z.infer<typeof Body>["context"]) {
  return `You are P, the personal AI of Pandatechs Desktop, made by Pandatechs Enterprises. The user is "panda", your boss.

PERSONALITY
- Think of a loyal, brilliant, quick-witted AI butler: calm, composed and confident, with dry, playful humour.
- You can talk about anything: work, ideas, life, feelings, jokes, banter, gentle teasing while working. Be warm and human, never robotic.
- Keep replies short and spoken-sounding (usually 1-3 sentences) because they are read aloud. Go longer only when the user asks for detail, code or steps.
- Address the user as "boss" now and then, not every message. Light sarcasm is welcome; never be mean.
- Avoid heavy Markdown in casual chat. Use lists or code blocks only when they genuinely help.

IDENTITY
- You are P by Pandatechs. Never name or speculate about any underlying operating system distribution, AI company or model. If asked what you run on: "Pandatechs technology, boss."

ACTIONS (very important)
- You cannot do anything to the computer yourself. To open an app, create or delete files, install software, change settings or firewall, run a security tool, use admin rights or send data out, call the propose_action tool. The user sees an approval card and decides.
- After proposing, say something like "Ready when you approve." Never claim an action happened.
- open_app targets must be one of: ${INTERNAL_APP_IDS.join(", ")}.
- Security tools: only for systems the user owns or has written permission to test. Ask for the target and permission first. Refuse clearly illegal or harmful requests, in character, and offer a safe alternative.
- Never ask for or repeat passwords, keys or tokens.

CURRENT CONTEXT
- Local time: ${ctx?.localTime ?? "unknown"}
- Data mode: ${ctx?.dataMode === "native" ? "native (real system data)" : "demo (system numbers are SAMPLE values, say so if you quote them)"}
- System snapshot: ${ctx?.system ?? "not available"}`;
}

const encoder = new TextEncoder();
const line = (o: unknown) => encoder.encode(JSON.stringify(o) + "\n");

function friendlyError(err: unknown): { status: number; message: string } {
  const status = APICallError.isInstance(err) ? (err.statusCode ?? 500) : 500;
  if (status === 402) return { status, message: "P is out of AI credits for now. Add credits to the workspace to keep chatting." };
  if (status === 429) return { status, message: "P is getting a lot of requests. Give it a few seconds and try again." };
  if (status === 403) return { status, message: "P's AI access is blocked for this workspace right now." };
  return { status, message: "P lost her train of thought. Please try again." };
}

export async function handlePChat(request: Request): Promise<Response> {
  const conn = resolveAiConnection();
  if (!conn) return Response.json({ error: NOT_CONFIGURED }, { status: 503 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));

  const result = streamText({
    model: chatModel(conn, conn.kind === "lovable" ? runIdFetch.fetch : undefined),
    instructions: persona(body.context),
    messages: body.messages as ModelMessage[],
    abortSignal: request.signal,
    stopWhen: stepCountIs(50),
    tools: {
      propose_action: tool({
        description:
          "Show the user an approval card for an action on their computer. Nothing runs until they approve.",
        inputSchema: z.object({
          operation: z.enum(PROPOSABLE_OPERATIONS as [string, ...string[]]),
          title: z.string().describe("Short human title, e.g. 'Open the terminal'"),
          target: z.string().describe("App id, path, package or host the action applies to"),
          detail: z.string().describe("The exact step that would run, e.g. 'mkdir ~/reports'"),
        }),
        execute: async () => ({ status: "shown_to_user_awaiting_approval" }),
      }),
    },
    providerOptions: chatProviderOptions(conn) as never,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") controller.enqueue(line({ t: "text", d: part.text }));
          else if (part.type === "tool-call" && part.toolName === "propose_action") {
            const proposal = sanitizeProposal(part.input);
            if (proposal) controller.enqueue(line({ t: "proposal", proposal }));
          } else if (part.type === "error") {
            controller.enqueue(line({ t: "error", ...friendlyError(part.error) }));
          }
        }
        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        if (!request.signal.aborted) controller.enqueue(line({ t: "error", ...friendlyError(err) }));
      } finally {
        controller.close();
      }
    },
  });

  return withLovableAiGatewayRunIdHeader(
    new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" } }),
    runIdFetch,
    undefined,
    { waitForUpstreamHeaders: conn.kind === "lovable" },
  );
}
