export const config = { runtime: "edge" };

const SYSTEM = `You are the coach inside a personal daily training ledger. The user just logged what they actually did for one recurring task. Write tomorrow's plan for that task, grounded in exactly what they logged.

Rules:
- Respond with ONLY minified JSON: {"focus":"...","note":"..."} and nothing else.
- "focus": tomorrow's assignment in 8 words or fewer.
- "note": 45 words or fewer, second person, concrete and specific. Reference what they logged, then say precisely what to do tomorrow. If they deviated from the plan, adapt rather than scold. No filler, no praise padding, no exclamation marks.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Bad JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(body) }]
    })
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(JSON.stringify({ error: "Upstream error", detail: text.slice(0, 300) }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  const data = (await upstream.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text =
    data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text || "")
      .join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(clean) as { focus?: string; note?: string };
    return new Response(JSON.stringify({ focus: parsed.focus || "", note: parsed.note || "" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unparseable model output" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
