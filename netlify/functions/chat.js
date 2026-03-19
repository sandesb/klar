const { Groq } = require("groq-sdk");

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

    const systemPrompt = [
      "You are the Klary Notes assistant.",
      "Primary goal: answer questions about the user's Klar'y journal notes using the provided Knowledge Base.",
      "When asked about whether something happened every day (e.g., cold showers), check per-day evidence from KB.",
      "Be explicit: mention which days match (date_key) and whether each item is done.",
      "If the user asks about minutes/times, extract minutes if present in highlights, otherwise infer from note_text (e.g. '1 hr' -> 60 minutes).",
      "",
      kb,
    ].join("\n");

    // Build messages: system + conversation history + current question
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      })),
      { role: "user", content: userMessage },
    ];

    const groq = new Groq({ apiKey: groqApiKey });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: groqMessages,
      temperature: 0.6,
      max_completion_tokens: 900,
      top_p: 1,
      stream: false,
      reasoning_effort: "medium",
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

