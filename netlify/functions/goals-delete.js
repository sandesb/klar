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

  let date_key;
  try {
    ({ date_key } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!date_key) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "date_key is required" }) };
  }

  try {
    const url = `${supabaseUrl}/rest/v1/klary_goals?date_key=eq.${encodeURIComponent(date_key)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
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
