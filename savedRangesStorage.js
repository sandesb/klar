import { supabaseSelect, supabaseInsert, supabaseUpdate, supabaseDelete } from "./supabaseClient.js";

const TABLE = "savedRange";

export async function loadSavedRanges() {
  try {
    const rows = await supabaseSelect(TABLE);
    return rows.map((r) => r.data);
  } catch {
    return [];
  }
}

export async function saveSavedRange(entry) {
  const data = { ...entry, deducted: entry.deducted ?? [], added: entry.added ?? [] };
  await supabaseInsert(TABLE, { id: entry.id, data });
}

export async function updateSavedRange(id, updates) {
  try {
    const rows = await supabaseSelect(TABLE, `id=eq.${id}`);
    if (!rows.length) return;
    const current = rows[0].data;
    const next = { ...current };
    if (updates.deducted != null) next.deducted = updates.deducted;
    if (updates.added != null) next.added = updates.added;
    if (updates.end != null) next.end = typeof updates.end === "string" ? updates.end : updates.end.toISOString();
    if (updates.start != null) next.start = typeof updates.start === "string" ? updates.start : updates.start.toISOString();
    await supabaseUpdate(TABLE, `id=eq.${id}`, { data: next });
  } catch (e) {
    console.error("updateSavedRange failed:", e);
  }
}

export async function deleteSavedRange(id) {
  await supabaseDelete(TABLE, `id=eq.${id}`);
}
