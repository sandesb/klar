import { downloadModel, getModelPath, isModelDownloaded } from "@react-native-ai/llama";
import { initLlama } from "llama.rn";

const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "<|eot_id|>",
  "<|end_of_text|>",
  "<|im_end|>",
  "<|EOT|>",
  "<|END_OF_TURN_TOKEN|>",
  "<|end_of_turn|>",
  "<|endoftext|>",
];

let activeContext = null;

function normalizePath(path) {
  if (!path) return "";
  if (path.startsWith("file://")) return path;
  if (path.startsWith("/")) return `file://${path}`;
  return path;
}

export function formatHfModelId(input) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  if (trimmed.includes(".gguf")) return trimmed;

  // Support llama.cpp shorthand:
  // unsloth/Qwen3-0.6B-GGUF:Q4_K_M -> unsloth/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q4_K_M.gguf
  if (trimmed.includes(":")) {
    const [repo, quantRaw] = trimmed.split(":");
    const quant = (quantRaw || "").trim().replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
    const modelBase = repo.split("/").pop()?.replace(/-GGUF$/i, "") || "model";
    const fileName = `${modelBase}-${quant}.gguf`;
    return `${repo}/${fileName}`;
  }

  return trimmed;
}

export async function downloadModelFromHf(modelId, onProgress) {
  const normalizedModelId = formatHfModelId(modelId);
  if (!normalizedModelId) throw new Error("Model id is required.");

  const downloaded = await isModelDownloaded(normalizedModelId);
  if (downloaded) {
    const existingPath = await getModelPath(normalizedModelId);
    return normalizePath(existingPath);
  }

  const modelPath = await downloadModel(normalizedModelId, (progress) => {
    if (onProgress) onProgress(progress);
  });
  return normalizePath(modelPath);
}

export async function loadLlamaModel(modelPath, options = {}, onProgress) {
  const normalizedPath = normalizePath(modelPath);
  if (!normalizedPath) throw new Error("Model path is required.");

  if (activeContext) {
    await activeContext.release();
    activeContext = null;
  }

  activeContext = await initLlama(
    {
      model: normalizedPath,
      use_mlock: true,
      n_ctx: options.nCtx ?? 2048,
      n_gpu_layers: options.nGpuLayers ?? 99,
      use_progress_callback: true,
    },
    (progress) => {
      if (onProgress) onProgress(progress);
    }
  );

  return {
    gpu: activeContext.gpu,
    reasonNoGPU: activeContext.reasonNoGPU,
    devices: activeContext.devices || [],
    systemInfo: activeContext.systemInfo,
    modelDesc: activeContext.model?.desc,
  };
}

export async function unloadLlamaModel() {
  if (!activeContext) return;
  await activeContext.release();
  activeContext = null;
}

export function isLlamaModelLoaded() {
  return !!activeContext;
}

export async function generateLlamaResponse({
  prompt,
  systemPrompt = "You are a helpful offline assistant running on-device in a mobile app.",
  maxTokens = 256,
  temperature = 0.7,
  onToken,
}) {
  if (!activeContext) throw new Error("No model loaded.");
  if (!prompt?.trim()) throw new Error("Prompt is empty.");

  const result = await activeContext.completion(
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt.trim() },
      ],
      n_predict: maxTokens,
      temperature,
      stop: STOP_WORDS,
    },
    (tokenData) => {
      if (onToken) onToken(tokenData);
    }
  );

  return result?.content || result?.text || "";
}
