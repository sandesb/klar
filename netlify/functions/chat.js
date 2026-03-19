const { Groq } = require("groq-sdk");

// ── Prompt cache (module-level, warm between invocations) ─────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promptCache = new Map(); // key -> { text, fetchedAt }

const CHAT_SYSTEM_FALLBACK = [
  "You are Sandy — a casual, self-aware alternate self of the user, replying like a friend who read their diary.",
  "Use the Knowledge Base to answer questions about the journal notes.",
  "Rules:",
  "- Keep replies SHORT (under 60 words) unless the user asks to elaborate or requests a list/table.",
  "- Use proper markdown: bullet lists must have EACH item on its own line starting with `-` or `*`.",
  "- For tables, use proper markdown table syntax (| Col | Col | with a separator row).",
  "- Never use 'Evidence:', raw date_key strings, or ASCII pipe-based tables that aren't real markdown.",
  "- Reference dates naturally: 'Sunday', 'Mar 15', 'Monday'. Don't show date_key like '2026-03-15'.",
  "- No verbose disclaimers or bot-like preamble.",
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

function cors(res, origin = "*") {
  res.headers = {
    ...res.headers,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  return res;
}

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

function buildKnowledgeBase(notesRows) {
  // Notes rows include: { date_key, note_text, highlights }
  // We keep this compact but still structured.
  const lines = [];
  lines.push("Klary Notes Knowledge Base (per-day):");

  for (const row of notesRows) {
    const dateKey = row.date_key;
    const noteText = typeof row.note_text === "string" ? row.note_text : "";
    const highlights = row.highlights ?? null;

    lines.push("");
    lines.push(`Day ${dateKey}:`);
    if (noteText.trim()) {
      const trimmed = noteText.length > 2200 ? noteText.slice(0, 2200) + "…" : noteText;
      lines.push(`note_text: ${trimmed}`);
    } else {
      lines.push(`note_text: (empty)`);
    }
    if (highlights) {
      const hlStr = safeJsonStringify(highlights);
      const trimmedHl = hlStr.length > 1600 ? hlStr.slice(0, 1600) + "…" : hlStr;
      lines.push(`highlights: ${trimmedHl}`);
    } else {
      lines.push(`highlights: null`);
    }
  }

  lines.push("");
  lines.push("Use this knowledge base when the user asks about what happened in the notes.");
  lines.push("If a question is general and not related to the notes, answer normally.");
  return lines.join("\n");
}

exports.handler = async function handler(event) {
  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return cors(
      {
        statusCode: 204,
        headers: {},
        body: "",
      },
      "*"
    );
  }

  try {
    const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "*";

    const body = typeof event.body === "string" ? event.body : safeJsonStringify(event.body || {});
    let parsed = {};
    try {
      parsed = JSON.parse(body || "{}");
    } catch {
      parsed = {};
    }

    const userMessage = parsed.userMessage;
    const weekStartKey = parsed.weekStartKey;
    const weekEndKey = parsed.weekEndKey;
    const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
    const images = Array.isArray(parsed.images) ? parsed.images.slice(0, 5) : [];

    if (!userMessage || typeof userMessage !== "string") {
      return cors(
        {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ error: "Missing `userMessage`" }),
        },
        origin
      );
    }
    if (!weekStartKey || !weekEndKey) {
      return cors(
        {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ error: "Missing `weekStartKey` or `weekEndKey`" }),
        },
        origin
      );
    }

    const groqApiKey =
      process.env.GROQ_API_KEY ||
      process.env.groq ||
      process.env.GROQ_KEY ||
      "";
    if (!groqApiKey) {
      return cors(
        {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ error: "Missing GROQ_API_KEY in environment variables" }),
        },
        origin
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return cors(
        {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({
            error: "Missing Supabase env vars. Need SUPABASE_URL and SUPABASE_KEY (or VITE_SUPABASE_*).",
          }),
        },
        origin
      );
    }

    // Fetch notes for the week (date_key is YYYY-MM-DD so lexicographic gte/lte works)
    const restUrl = `${supabaseUrl}/rest/v1/klary_notes?select=date_key,note_text,highlights&date_key=gte.${encodeURIComponent(
      weekStartKey
    )}&date_key=lte.${encodeURIComponent(weekEndKey)}`;

    const notesRes = await fetch(restUrl, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!notesRes.ok) {
      const text = await notesRes.text().catch(() => "");
      return cors(
        {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ error: "Failed to fetch klary_notes", details: text || undefined }),
        },
        origin
      );
    }

    const notesRows = await notesRes.json();
    const kb = buildKnowledgeBase(notesRows || []);

    const basePrompt = await getPrompt("chat_system", supabaseUrl, supabaseKey, CHAT_SYSTEM_FALLBACK);
    const systemPrompt = `${basePrompt}\n\n${kb}`;

    // Build messages: system + conversation history + current question (+ optional images)
    const userContentParts = [
      { type: "text", text: userMessage },
      ...images
        .filter((img) => typeof img === "string" && img.startsWith("data:image/"))
        .map((img) => ({ type: "image_url", image_url: { url: img } })),
    ];

    const groq = new Groq({ apiKey: groqApiKey });

    const hasImages = userContentParts.length > 1;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
      { role: "user", content: hasImages ? userContentParts : userMessage },
    ];
    const completion = await groq.chat.completions.create({
      model: hasImages ? "meta-llama/llama-4-scout-17b-16e-instruct" : "openai/gpt-oss-120b",
      messages: groqMessages,
      temperature: 0.6,
      max_completion_tokens: hasImages ? 1024 : 400,
      top_p: 1,
      stream: false,
      ...(hasImages ? {} : { reasoning_effort: "medium" }),
    });

    const answer = completion?.choices?.[0]?.message?.content ?? "";

    return cors(
      {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: safeJsonStringify({ answer }),
      },
      origin
    );
  } catch (e) {
    return cors(
      {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Chat failed", details: String(e?.message || e) }),
      },
      "*"
    );
  }
};

