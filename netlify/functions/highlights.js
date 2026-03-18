const { Groq } = require("groq-sdk");

function safeJsonStringify(x) {
  try {
    return JSON.stringify(x);
  } catch {
    return "";
  }
}

exports.handler = async function handler(event) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
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
    if (!text || typeof text !== "string") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: safeJsonStringify({ error: "Missing `text`" }),
      };
    }

    const groq = new Groq({ apiKey });

    const prompt = [
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
      '    "special_incidents": string[]',
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
      "",
      "Journal note:",
      text,
    ].join("\n");

    // We accumulate the stream server-side and return one final JSON string.
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

