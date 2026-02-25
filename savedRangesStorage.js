import { jsonbinGet, jsonbinPut } from "./jsonbinClient.js";

const SAVED_RANGES_BIN_ID = "699ea37f43b1c97be99bd92e";

export async function loadSavedRanges() {
  try {
    const record = await jsonbinGet(SAVED_RANGES_BIN_ID);
    if (record == null || !Array.isArray(record)) return [];
    return record;
  } catch {
    return [];
  }
}

export async function saveSavedRange(entry) {
  const list = await loadSavedRanges();
  list.push({ ...entry, deducted: entry.deducted ?? [], added: entry.added ?? [] });
  await jsonbinPut(SAVED_RANGES_BIN_ID, list);
}

export async function updateSavedRange(id, updates) {
  const list = await loadSavedRanges();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const next = { ...list[idx] };
  if (updates.deducted != null) next.deducted = updates.deducted;
  if (updates.added != null) next.added = updates.added;
  if (updates.end != null) next.end = typeof updates.end === "string" ? updates.end : updates.end.toISOString();
  if (updates.start != null) next.start = typeof updates.start === "string" ? updates.start : updates.start.toISOString();
  list[idx] = next;
  await jsonbinPut(SAVED_RANGES_BIN_ID, list);
}

export async function deleteSavedRange(id) {
  const list = (await loadSavedRanges()).filter((e) => e.id !== id);
  await jsonbinPut(SAVED_RANGES_BIN_ID, list);
}
