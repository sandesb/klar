const { Groq } = require("groq-sdk");

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
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing GROQ_API_KEY" }),
      };
    }

    let parsed = {};
    try {
      parsed = JSON.parse(event.body || "{}");
    } catch {
      parsed = {};
    }

    const text = (parsed.text || "").trim();
    if (!text) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing `text`" }),
      };
    }

    const groq = new Groq({ apiKey });
    const wav = await groq.audio.speech.create({
      model: "canopylabs/orpheus-v1-english",
      voice: "autumn",
      response_format: "wav",
      input: text,
    });

    const buffer = Buffer.from(await wav.arrayBuffer());

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "TTS failed", details: String(e?.message || e) }),
    };
  }
};
