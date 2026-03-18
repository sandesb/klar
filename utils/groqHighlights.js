/**
 * Fetch highlights from Groq via the backend endpoint (Vite middleware or Netlify function).
 * Highlights are now stored in Supabase via notesStorage.js, not localStorage.
 */
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

