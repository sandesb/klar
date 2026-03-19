export async function transcribeAudio(blob) {
  const endpoint = import.meta.env.DEV
    ? "/api/transcribe"
    : "/.netlify/functions/transcribe";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    const err = new Error(`Transcription failed (${res.status}): ${msg}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  return json.text ?? "";
}
