const CACHE_PREFIX = "klary_highlights_";

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function getCacheKey(dateKey, text) {
  return `${CACHE_PREFIX}${dateKey}_${hashString(text)}`;
}

export function loadHighlightsCache(dateKey, text) {
  try {
    const raw = localStorage.getItem(getCacheKey(dateKey, text));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHighlightsCache(dateKey, text, data) {
  try {
    localStorage.setItem(getCacheKey(dateKey, text), JSON.stringify(data));
  } catch {}
}

export async function fetchHighlightsStream({ text, onDelta, signal }) {
  // Local dev: Vite middleware is `/api/highlights`.
  // Netlify static deploy: Functions are `/.netlify/functions/<name>`.
  const endpoint = import.meta.env.DEV ? "/api/highlights" : "/.netlify/functions/highlights"

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Highlights failed (${res.status})`);
  }

  if (!res.body) {
    const full = await res.text();
    onDelta?.(full);
    return full;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onDelta?.(chunk);
  }

  return full;
}

