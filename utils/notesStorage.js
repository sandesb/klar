import { supabaseSelect, supabaseUpsert } from "../supabaseClient.js";

const TABLE = "klary_notes";

/**
 * Fetch a note row by date_key. Returns { note_text, highlights } or null.
 */
export async function fetchNoteRow(dateKey) {
  try {
    const rows = await supabaseSelect(TABLE, `date_key=eq.${dateKey}`);
    if (!rows || rows.length === 0) return null;
    return rows[0];
  } catch (e) {
    console.error("fetchNoteRow error:", e);
    return null;
  }
}

/**
 * Save/update note_text for a given date_key.
 */
export async function saveNoteText(dateKey, noteText) {
  try {
    await supabaseUpsert(TABLE, {
      date_key: dateKey,
      note_text: noteText,
    });
    return true;
  } catch (e) {
    console.error("saveNoteText error:", e);
    return false;
  }
}

/**
 * Save/update highlights JSONB for a given date_key.
 */
export async function saveHighlights(dateKey, highlightsJson) {
  try {
    await supabaseUpsert(TABLE, {
      date_key: dateKey,
      highlights: highlightsJson,
    });
    return true;
  } catch (e) {
    console.error("saveHighlights error:", e);
    return false;
  }
}

/**
 * Fetch multiple note rows for a list of date_keys (batch load for a week).
 */
export async function fetchNoteRows(dateKeys) {
  if (!dateKeys || dateKeys.length === 0) return {};
  try {
    const filter = `date_key=in.(${dateKeys.map((k) => `"${k}"`).join(",")})`;
    const rows = await supabaseSelect(TABLE, filter);
    const map = {};
    for (const row of rows || []) {
      map[row.date_key] = row;
    }
    return map;
  } catch (e) {
    console.error("fetchNoteRows error:", e);
    return {};
  }
}
