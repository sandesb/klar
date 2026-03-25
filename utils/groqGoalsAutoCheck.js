/**
 * Goal auto-check (daily + weekly) via Groq.
 * Returns JSON in the form: { raw, parsed }
 */
export async function verifyGoalsAutoCheck({ mode, note_text, goals, weekly_goals, daily_goals_by_day }) {
  const endpoint = import.meta.env.DEV ? "/api/goals-autocheck" : "/.netlify/functions/goals-autocheck";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, note_text, goals, weekly_goals, daily_goals_by_day }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Goals auto-check failed (${res.status})`);
  }

  return res.json(); // { raw, parsed }
}

