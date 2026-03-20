export function formatHfModelId(input) {
  return (input || "").trim();
}

function unsupportedError() {
  return new Error("Local LLM is native-only. Use Android/iOS build (not web).");
}

export async function downloadModelFromHf() {
  throw unsupportedError();
}

export async function loadLlamaModel() {
  throw unsupportedError();
}

export async function unloadLlamaModel() {
  return;
}

export function isLlamaModelLoaded() {
  return false;
}

export async function generateLlamaResponse() {
  throw unsupportedError();
}
