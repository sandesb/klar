const { Groq } = require("groq-sdk");

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

function tryParseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const trimmed = String(raw).trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {}
    }
    return null;
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: safeJsonStringify({ error: "Method not allowed" }) };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Missing GROQ_API_KEY in Netlify env." }),
      };
    }

    const body = typeof event.body === "string" ? event.body : safeJsonStringify(event.body || {});
    const parsed = JSON.parse(body || "{}");
    const mode = parsed?.mode;

    const rawNote = typeof parsed?.note_text === "string" ? parsed.note_text : "";
    const goals = Array.isArray(parsed?.goals) ? parsed.goals : [];
    const weekly_goals = Array.isArray(parsed?.weekly_goals) ? parsed.weekly_goals : [];
    const daily_goals_by_day = parsed?.daily_goals_by_day && typeof parsed.daily_goals_by_day === "object" ? parsed.daily_goals_by_day : {};

    const systemDaily = [
      "You verify daily goals based only on the journal note text.",
      "Return ONLY valid JSON (no markdown, no backticks).",
      "Schema:",
      "{",
      '  "results": [ { "id": string, "completed": boolean, "evidence": string|null } ]',
      "}",
      "Rules:",
      "- Use each goal id exactly as provided.",
      "- Set completed=true only when the note explicitly shows the goal was done/completed.",
      "- If ambiguous or only planned, set completed=false.",
      "- Evidence: short phrase or null.",
    ].join("\n");

    const systemWeekly = [
      "You verify weekly goals based only on daily goals data for the same week.",
      "Return ONLY valid JSON (no markdown, no backticks).",
      "Schema:",
      "{",
      '  "results": [ { "id": string, "completed": boolean, "evidence": string|null } ]',
      "}",
      "Rules:",
      "- Use each weekly goal id exactly as provided.",
      "- A weekly goal is completed if there exists at least one day where a daily goal item semantically matches the weekly goal text and that daily goal has done=true.",
      "- If weekly goal appears only with done=false or no matching item, completed=false.",
      "- Evidence: short description like '2026-03-22, 2026-03-23' or null.",
    ].join("\n");

    let userPrompt = "";
    let systemPrompt = "";
    if (mode === "daily") {
      systemPrompt = systemDaily;
      userPrompt = [
        "Journal note:",
        rawNote,
        "",
        "Goals to verify:",
        ...goals.map((g) => `- [${g.id}] ${g.text}`),
        "",
        "Return JSON only.",
      ].join("\n");
    } else if (mode === "weekly") {
      systemPrompt = systemWeekly;
      userPrompt = [
        "Weekly goals (id + text):",
        JSON.stringify(weekly_goals || [], null, 2),
        "",
        "Daily goals by day (each daily goal includes done boolean):",
        JSON.stringify(daily_goals_by_day || {}, null, 2),
        "",
        "Return JSON only.",
      ].join("\n");
    } else {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Invalid mode. Use 'daily' or 'weekly'." }),
      };
    }

    const groq = new Groq({ apiKey: apiKey });
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 700,
      top_p: 1,
      stream: false,
      reasoning_effort: "medium",
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "";
    const parsedJson = tryParseJson(raw);

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: safeJsonStringify({ raw, parsed: parsedJson }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: safeJsonStringify({ error: "Goals auto-check failed", details: String(e?.message || e) }),
    };
  }
};

