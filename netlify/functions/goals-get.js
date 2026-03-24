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

  try {
    let url = `${supabaseUrl}/rest/v1/klary_goals?select=date_key,goals`;
    if (date_key) {
      url += `&date_key=eq.${encodeURIComponent(date_key)}&limit=1`;
    } else {
      url += `&order=date_key.asc`;
    }

    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => String(res.status));
      return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const rows = await res.json();

    // If fetching a single date_key, return just that row's goals array
    if (date_key) {
      const goals = rows?.[0]?.goals ?? [];
      return {
        statusCode: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify({ goals }),
      };
    }

    // Otherwise return all rows as { date_key -> goals[] } map
    const map = {};
    for (const row of rows) {
      map[row.date_key] = row.goals ?? [];
    }
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ data: map }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
