const { Groq } = require("groq-sdk");

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

// ── Prompt cache (module-level, warm between invocations) ─────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promptCache = new Map(); // key -> { text, fetchedAt }

const HIGHLIGHTS_FALLBACK = [
  "You are an assistant that extracts structured highlights from a daily journal note.",
  "",
  "Return ONLY valid JSON (no markdown, no backticks).",
  "Schema:",
  "{",
  '  "literal_bullets": string[],',
  '  "checks": {',
  '    "cold_shower": { "done": boolean, "evidence": string|null },',
  '    "morning_meditation": { "done": boolean, "minutes": number|null, "evidence": string|null },',
  '    "gym": { "done": boolean, "minutes": number|null, "body_parts": string[], "evidence": string|null },',
  '    "evening_meditation": { "done": boolean, "minutes": number|null, "evidence": string|null },',
  '    "special_incidents": [',
  '      { "text": string, "sentiment": "positive"|"negative"|"neutral" }',
  "    ]",
  "  }",
  "}",
  "",
  "Rules:",
  "- If something is not mentioned, set done=false and minutes=null.",
  '- Interpret "1 hr", "one hour" as 60 minutes, "15 minutes" as 15, etc.',
  '- "morning_meditation": if the note implies it happened after cold shower in the morning, mark done=true and set minutes.',
  '- "evening_meditation": if meditation is mentioned later in the day, set done and minutes accordingly.',
  '- For gym, if body parts are mentioned, put them into "body_parts" (e.g. ["forearms","triceps"]).',
  '- "special_incidents" should include unusual events, messages, storms, accidents, visits, etc.',
  '- sentiment=positive: meaningful personal experience, joy, wins, good surprises.',
  '- sentiment=negative: harm/injury, accidents, failures, rejections, setbacks.',
  '- sentiment=neutral: notable observation with no direct personal consequence.',
].join("\n");

async function getPrompt(key, supabaseUrl, supabaseKey, fallback) {
  const cached = promptCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.text;
  }
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/klary_prompts?select=prompt_text&key=eq.${encodeURIComponent(key)}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      const text = rows?.[0]?.prompt_text;
      if (text) {
        promptCache.set(key, { text, fetchedAt: Date.now() });
        return text;
      }
    }
  } catch {}
  return fallback;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Missing GROQ_API_KEY in Netlify environment variables" }),
      };
    }

    const body = typeof event.body === "string" ? event.body : safeJsonStringify(event.body || {});
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch {
      parsed = {};
    }

    const text = parsed.text;
    const instruction = typeof parsed.instruction === "string" ? parsed.instruction.trim() : "";
    if (!text || typeof text !== "string") {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Missing `text`" }),
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    const systemPrompt = await getPrompt("highlights_system", supabaseUrl, supabaseKey, HIGHLIGHTS_FALLBACK);
    const prompt = instruction
      ? `${systemPrompt}\n\nAdditional instruction:\n${instruction}\n\nJournal note:\n${text}`
      : `${systemPrompt}\n\nJournal note:\n${text}`;

    const groq = new Groq({ apiKey });
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 1,
      stream: true,
      reasoning_effort: "medium",
    });

    let assembled = "";
    for await (const chunk of chatCompletion) {
      const delta = chunk?.choices?.[0]?.delta?.content || "";
      assembled += delta;
    }

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
      body: assembled,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: safeJsonStringify({ error: "Groq highlights failed" }),
    };
  }
};
