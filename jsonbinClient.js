const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

function getHeaders() {
  const key = import.meta.env.VITE_JSONBIN_MASTER_KEY;
  if (!key) throw new Error("VITE_JSONBIN_MASTER_KEY is not set");
  return {
    "Content-Type": "application/json",
    "X-Master-Key": key,
  };
}

export async function jsonbinGet(binId) {
  const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`JSONBin GET failed: ${res.status}`);
  const data = await res.json();
  return data.record;
}

export async function jsonbinPut(binId, body) {
  const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`JSONBin PUT failed: ${res.status}`);
}
