const STORAGE_KEY = "klary_saved_ranges";

export function loadSavedRanges() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSavedRange(entry) {
  const list = loadSavedRanges();
  list.push({ ...entry, deducted: entry.deducted || [], added: entry.added || [] });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function updateSavedRange(id, updates) {
  const list = loadSavedRanges();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const next = { ...list[idx] };
  if (updates.deducted != null) next.deducted = updates.deducted;
  if (updates.added != null) next.added = updates.added;
  if (updates.end != null) next.end = typeof updates.end === "string" ? updates.end : updates.end.toISOString();
  if (updates.start != null) next.start = typeof updates.start === "string" ? updates.start : updates.start.toISOString();
  list[idx] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteSavedRange(id) {
  const list = loadSavedRanges().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
