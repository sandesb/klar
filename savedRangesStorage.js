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
  list.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteSavedRange(id) {
  const list = loadSavedRanges().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
