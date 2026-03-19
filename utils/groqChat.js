export async function fetchChatCompletion({
  userMessage,
  messages = [],
  weekStartKey,
  weekEndKey,
  images = [],
  signal,
}) {
  // Local dev: you can still use Vite proxy/middleware if you add one.
  // Netlify static: call the function URL.
  const endpoint = import.meta.env.DEV ? "/api/chat" : "/.netlify/functions/chat";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage, messages, weekStartKey, weekEndKey, images }),
    signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Chat failed (${res.status})`);
  }

  const json = await res.json();
  return json?.answer ?? "";
}

