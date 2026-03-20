const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

function restUrl(table) {
  return `${SUPABASE_URL}/rest/v1/${table}`;
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function supabaseSelect(table, filters = "") {
  const url = `${restUrl(table)}?select=*${filters ? "&" + filters : ""}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase SELECT ${table} failed: ${res.status}`);
  return res.json();
}

export async function supabaseInsert(table, row) {
  const res = await fetch(restUrl(table), {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase INSERT ${table} failed: ${res.status}`);
  return res.json();
}

export async function supabaseUpsert(table, row, onConflict = "date_key") {
  const url = `${restUrl(table)}?on_conflict=${onConflict}`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase UPSERT ${table} failed: ${res.status}`);
  return res.json();
}

export async function supabaseUpdate(table, filters, updates) {
  const res = await fetch(`${restUrl(table)}?${filters}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Supabase UPDATE ${table} failed: ${res.status}`);
  return res.json();
}

export async function supabaseDelete(table, filters) {
  const res = await fetch(`${restUrl(table)}?${filters}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table} failed: ${res.status}`);
}

// ── Supabase Storage — note images ───────────────────────────────

// Public base URL for note images — reconstruct full src with: NOTE_IMG_BASE + filename
export const NOTE_IMG_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/klary/note/`;

// Returns only the filename (e.g. "1773932546286-8r2ull427r8.png")
export async function uploadNoteImage(file) {
  const ext = (file.name || "image").split(".").pop().toLowerCase() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `note/${filename}`;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/klary/${storagePath}`;
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    throw new Error(`Image upload failed: ${msg}`);
  }

  return filename; // caller stores only the filename in note text
}

// Deletes a note image from the klary/note/ bucket by filename
export async function deleteNoteImage(filename) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/klary`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [`note/${filename}`] }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    throw new Error(`Storage delete failed: ${msg}`);
  }
}

// ── Prompt management ────────────────────────────────────────────

export async function fetchAllPrompts() {
  const url = `${restUrl("klary_prompts")}?select=key,type,label,prompt_text,updated_at&order=type.asc,key.asc`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase SELECT klary_prompts failed: ${res.status}`);
  return res.json(); // [{ key, type, label, prompt_text, updated_at }]
}

export async function upsertPrompt(key, type, label, promptText) {
  return supabaseUpsert(
    "klary_prompts",
    { key, type, label, prompt_text: promptText, updated_at: new Date().toISOString() },
    "key"
  );
}

// ── Chat memory (klary_chat) ─────────────────────────────────────

const CHAT_TABLE = "klary_chat";

function buildChatSearchText(messages = []) {
  // Keep it simple and deterministic for search_text updates.
  try {
    return (messages || [])
      .map((m) => (typeof m?.content === "string" ? m.content : ""))
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

/**
 * Create a new chat thread with empty messages.
 * Returns the created row (or at least its id).
 */
export async function createChatThread({ title = null, weekStartKey = null, weekEndKey = null } = {}) {
  const payload = {
    title: title || null,
    week_start_key: weekStartKey || null,
    week_end_key: weekEndKey || null,
    messages: [],
    search_text: "",
  };
  const created = await supabaseInsert(CHAT_TABLE, payload);
  const row = Array.isArray(created) ? created[0] : created;
  return row || null; // { id, ... } expected
}

export async function fetchLatestChatThread() {
  const url = `${restUrl(CHAT_TABLE)}?select=*&order=updated_at.desc&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase SELECT ${CHAT_TABLE} latest failed: ${res.status}`);
  const rows = await res.json();
  return rows?.[0] ?? null;
}

export async function fetchChatThreadsList({ search = "", limit = 20 } = {}) {
  const trimmed = (search || "").trim();
  let url =
    `${restUrl(CHAT_TABLE)}?select=id,title,created_at,updated_at&order=updated_at.desc&limit=${limit}`;
  if (trimmed) {
    url += `&search_text=ilike.*${encodeURIComponent(trimmed)}*`;
  }
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase SELECT ${CHAT_TABLE} list failed: ${res.status}`);
  return res.json(); // [{ id,title,created_at,updated_at }]
}

export async function fetchChatThreadById(id) {
  const safeId = encodeURIComponent(String(id));
  const res = await fetch(
    `${restUrl(CHAT_TABLE)}?select=id,title,messages,created_at,updated_at&id=eq.${safeId}&limit=1`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`Supabase SELECT ${CHAT_TABLE} by id failed: ${res.status}`);
  const rows = await res.json();
  return rows?.[0] ?? null;
}

/**
 * Persist messages for a thread.
 * messages: [{ role: 'user'|'assistant', content: string }]
 */
export async function upsertChatThreadMessages({
  id,
  title = null,
  weekStartKey = null,
  weekEndKey = null,
  messages = [],
} = {}) {
  if (!id) throw new Error("upsertChatThreadMessages: missing `id`");
  const searchText = buildChatSearchText(messages);
  const updates = {
    messages,
    search_text: searchText,
  };
  if (title !== null && title !== undefined) updates.title = title;
  if (weekStartKey !== null && weekStartKey !== undefined) updates.week_start_key = weekStartKey;
  if (weekEndKey !== null && weekEndKey !== undefined) updates.week_end_key = weekEndKey;

  await supabaseUpdate(CHAT_TABLE, `id=eq.${encodeURIComponent(String(id))}`, updates);
  return true;
}
