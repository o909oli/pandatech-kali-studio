import { APICallError, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.server";
import { chatModel, chatProviderOptions, NOT_CONFIGURED, resolveAiConnection } from "./ai-config.server";


const Body = z.object({
  task: z.string().max(40),
  prompt: z.string().max(4000),
  detail: z.enum(["concise", "detailed"]).optional(),
  context: z.array(z.object({ label: z.string().max(200), content: z.string().max(12000) })).max(12),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(14),
  file: z.object({ path: z.string().max(400), selection: z.boolean() }).optional(),
});

const EDIT = new Set(["find_bug", "fix", "refactor", "improve", "docs", "tests", "explain_error", "new_file"]);

function instructions(b: z.infer<typeof Body>) {
  const edit = EDIT.has(b.task);
  return `You are P, the AI coding assistant inside Pandatechs Studio by Pandatechs Enterprises. The user is "panda" ("boss").
Be a precise senior engineer with a dry, friendly tone. ${b.detail === "detailed" ? "Explain thoroughly." : "Be concise."}
Never claim you ran, saved, compiled or tested anything: you only propose. Never ask for passwords or secrets.
Never name any underlying operating system distribution, AI company or model; you run on "Pandatechs technology".

TASK: ${b.task}${b.file ? `\nACTIVE FILE: ${b.file.path}${b.file.selection ? " (the user selected part of it; it is in the context as 'Selected text')" : ""}` : ""}
${edit ? `OUTPUT FORMAT: a short explanation (max 6 bullet points), then exactly ONE fenced code block containing the COMPLETE replacement for ${b.file?.selection ? "the selected text" : "the whole file"}${b.task === "tests" || b.task === "new_file" ? " (the complete new file)" : ""}. No other code blocks.` : ""}
${b.task === "draft_command" ? "OUTPUT FORMAT: one sentence, then one ```bash block with a single command. Prefer safe, read-only or project-local commands. Never use sudo unless asked." : ""}
If the user asks for a plan, reply with one sentence then a \`\`\`json block: {"goal": string, "steps": string[], "files": string[], "dependencies": string[], "risks": string[], "permissions": string[]}.

SHARED CONTEXT (the user chose exactly these items):
${b.context.map((c) => `--- ${c.label} ---\n${c.content}`).join("\n\n") || "(none)"}`;
}

const enc = new TextEncoder();
const line = (o: unknown) => enc.encode(JSON.stringify(o) + "\n");

function friendly(err: unknown) {
  const status = APICallError.isInstance(err) ? (err.statusCode ?? 500) : 500;
  if (status === 402) return "P is out of AI credits for now. Add credits to the workspace to continue.";
  if (status === 429) return "P is getting a lot of requests. Try again in a few seconds.";
  return "P couldn't finish that reply. Please try again.";
}

export async function handlePCode(request: Request): Promise<Response> {
  const conn = resolveAiConnection();
  if (!conn) return Response.json({ error: NOT_CONFIGURED }, { status: 503 });
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const messages: ModelMessage[] = [
    ...body.history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
    { role: "user", content: body.prompt || body.history.at(-1)?.content || body.task },
  ];
  const result = streamText({
    model: chatModel(conn, conn.kind === "lovable" ? runIdFetch.fetch : undefined),
    instructions: instructions(body),
    messages,
    abortSignal: request.signal,
    providerOptions: chatProviderOptions(conn) as never,
  });
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") controller.enqueue(line({ t: "text", d: part.text }));
          else if (part.type === "error") controller.enqueue(line({ t: "error", message: friendly(part.error) }));
        }
        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        if (!request.signal.aborted) controller.enqueue(line({ t: "error", message: friendly(err) }));
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
