const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Supabase env vars missing" }) };
  }

  let date_key, goals;
  try {
    ({ date_key, goals } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!date_key || !Array.isArray(goals)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: "date_key (string) and goals (array) are required" }),
    };
  }

  try {
    const url = `${supabaseUrl}/rest/v1/klary_goals?on_conflict=date_key`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ date_key, goals }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => String(res.status));
      return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
