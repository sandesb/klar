const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const TABLE = "klary_goals";

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fetchGoals(dateKey) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=goals&date_key=eq.${encodeURIComponent(dateKey)}&limit=1`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`goals fetch failed: ${res.status}`);
  const rows = await res.json();
  const goals = rows?.[0]?.goals;
  return Array.isArray(goals) ? goals : [];
}

async function upsertGoals(dateKey, goals) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=date_key`;
  const res = await fetch(url, {
    method: "POST",
    headers: sbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ date_key: dateKey, goals }),
  });
  if (!res.ok) throw new Error(`goals upsert failed: ${res.status}`);
}

/**
 * @param {string} dateKey - YYYY-MM-DD
 * @returns {Promise<Array<{ id: string, text: string, done: boolean }>>}
 */
export async function loadGoalsForDay(dateKey) {
  try {
    return await fetchGoals(dateKey);
  } catch {
    return [];
  }
}

/**
 * @param {string} dateKey
 * @param {Array<{ id: string, text: string, done: boolean }>} goals
 */
export async function saveGoalsForDay(dateKey, goals) {
  await upsertGoals(dateKey, goals);
}

/**
 * Weekly goals use the key "week:YYYY-MM-DD" (week start Sunday).
 * @param {string} weekStartDateKey - YYYY-MM-DD of the Sunday
 * @returns {Promise<Array<{ id: string, text: string, done: boolean }>>}
 */
export async function loadWeeklyGoals(weekStartDateKey) {
  try {
    return await fetchGoals(`week:${weekStartDateKey}`);
  } catch {
    return [];
  }
}

/**
 * @param {string} weekStartDateKey
 * @param {Array<{ id: string, text: string, done: boolean }>} goals
 */
export async function saveWeeklyGoals(weekStartDateKey, goals) {
  await upsertGoals(`week:${weekStartDateKey}`, goals);
}

/**
 * Delete all goals stored under a given key.
 * @param {string} dateKey - "YYYY-MM-DD" or "week:YYYY-MM-DD"
 */
export async function deleteGoalsForKey(dateKey) {
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?date_key=eq.${encodeURIComponent(dateKey)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: sbHeaders({ Prefer: "return=minimal" }),
  });
  if (!res.ok) throw new Error(`goals delete failed: ${res.status}`);
}

export function createGoalId() {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
