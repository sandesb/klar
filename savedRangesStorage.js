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

export function updateSavedRange(id, { deducted, added }) {
  const list = loadSavedRanges();
  const idx = list.findIndex((e) => e.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], deducted: deducted || [], added: added || [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteSavedRange(id) {
  const list = loadSavedRanges().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
