const endpoint = import.meta.env.DEV
  ? "/api/tts"
  : "/.netlify/functions/tts";

let audioCtx = null;
let currentSource = null;

// Must be called during a direct user gesture (e.g. clicking the speaker button).
// This unlocks the AudioContext so async playback works later.
export function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

export function stopSpeaking() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
}

export async function speak(text) {
  stopSpeaking();

  if (!audioCtx) {
    // Fallback: create context now (may be blocked by browser if no prior gesture)
    audioCtx = new AudioContext();
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    const err = new Error(`TTS request failed (${res.status}): ${msg}`);
    err.status = res.status;
    throw err;
  }

  const arrayBuffer = await res.arrayBuffer();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  const source = audioCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(audioCtx.destination);
  currentSource = source;

  return new Promise((resolve) => {
    source.onended = () => {
      currentSource = null;
      resolve();
    };
    source.start(0);
  });
}
