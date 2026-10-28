import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev";
const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Kore";

const Body = z.object({ text: z.string().min(1).max(1200) });

/** Streams P's voice (24 kHz PCM over SSE) straight through to the browser. */
export async function handlePSpeech(request: Request): Promise<Response> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return Response.json({ error: "Natural voice is not configured here; using the system voice." }, { status: 503 });
  let text: string;
  try {
    text = Body.parse(await request.json()).text;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${GATEWAY_URL}/v1/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: `Say in a calm, warm, confident voice with a hint of playful wit: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
        stream_format: "sse",
      }),
      signal: request.signal,
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return Response.json({ error: err instanceof Error ? err.message : "Voice failed." }, { status: 502 });
  }
}
