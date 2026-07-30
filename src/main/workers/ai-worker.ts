/**
 * AI Worker Thread — runs ONNX model inference in isolation so the main
 * Electron process event loop is never blocked.
 *
 * Protocol (postMessage):
 *   Main → Worker  { type: 'embed', id: number, source: string }
 *   Worker → Main  { type: 'ready' }
 *                  { type: 'result', id: number, embedding: Float32Array }
 *                  { type: 'error',  id: number, message: string }
 */

import { parentPort } from "worker_threads"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

// ---------------------------------------------------------------------------
// ESM __dirname polyfill — MUST happen before any import of @huggingface/transformers
// so the ONNX runtime can resolve its native binary paths.
// We use dynamic import() below precisely to guarantee this ordering.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Expose on globalThis so any internal require() inside onnxruntime-node
// or transformers that checks globalThis.__dirname also gets the right path.
;(globalThis as Record<string, unknown>)["__dirname"] = __dirname
;(globalThis as Record<string, unknown>)["__filename"] = __filename

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmbedMessage {
  type: "embed"
  id: number
  source: string // file path or "text:<content>"
}

type InboundMessage = EmbedMessage

// ---------------------------------------------------------------------------
// Model cache directory (mirrors ai.service.ts helper)
// ---------------------------------------------------------------------------

function getModelCacheDir(): string {
  const userDataPath =
    (process.env["GALLEO_USER_DATA"] as string | undefined) ??
    path.join(process.cwd(), ".data")
  const cacheDir = path.join(userDataPath, "models")
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

const MODEL_NAME = "Xenova/siglip-base-patch16-224"

// ---------------------------------------------------------------------------
// Lazily-imported transformers types (resolved after globalThis is set)
// ---------------------------------------------------------------------------

type TransformersModule = typeof import("@huggingface/transformers")
type PreTrainedTokenizer = Awaited<ReturnType<TransformersModule["AutoTokenizer"]["from_pretrained"]>>
type Processor = Awaited<ReturnType<TransformersModule["AutoProcessor"]["from_pretrained"]>>
type PreTrainedModel = Awaited<ReturnType<TransformersModule["AutoModel"]["from_pretrained"]>>

// ---------------------------------------------------------------------------
// Model state (module-level singletons inside this thread)
// ---------------------------------------------------------------------------

let tokenizer: PreTrainedTokenizer | null = null
let processor: Processor | null = null
let model: PreTrainedModel | null = null
let loadPromise: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (tokenizer && processor && model) return

  // Dynamic import so @huggingface/transformers loads AFTER the __dirname
  // global is set above, ensuring onnxruntime-node can find its native binary.
  const {
    env,
    AutoTokenizer,
    AutoProcessor,
    AutoModel,
  } = await import("@huggingface/transformers")

  env.cacheDir = getModelCacheDir()
  env.allowLocalModels = true
  env.allowRemoteModels = true
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }

  tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME)
  processor = await AutoProcessor.from_pretrained(MODEL_NAME)
  model = await AutoModel.from_pretrained(MODEL_NAME)
}

function normalizeVector(vec: Float32Array): Float32Array {
  let sum = 0
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i]
  const norm = Math.sqrt(sum)
  if (norm === 0) return vec
  for (let i = 0; i < vec.length; i++) vec[i] /= norm
  return vec
}

// ---------------------------------------------------------------------------
// Boot: load model, then signal ready to parent
// ---------------------------------------------------------------------------

if (!parentPort) {
  throw new Error("ai-worker must be run as a Worker Thread")
}

const port = parentPort

loadPromise = ensureLoaded()
  .then(() => {
    port.postMessage({ type: "ready" })
  })
  .catch((err: unknown) => {
    port.postMessage({
      type: "error",
      id: -1,
      message: err instanceof Error ? err.message : "Model load failed",
    })
  })

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

port.on("message", (msg: InboundMessage) => {
  void handleMessage(msg)
})

async function handleMessage(msg: InboundMessage): Promise<void> {
  // Wait for model to be ready before processing requests
  try {
    await loadPromise
  } catch {
    port.postMessage({
      type: "error",
      id: msg.id,
      message: "Model failed to load",
    })
    return
  }

  if (msg.type !== "embed") return

  try {
    const { RawImage } = await import("@huggingface/transformers")

    let embedding: Float32Array

    if (msg.source.startsWith("text:")) {
      const text = msg.source.slice("text:".length)
      if (!tokenizer || !model) throw new Error("Model not loaded")
      const textInputs = tokenizer(text, { padding: "max_length", truncation: true })
      const modelObj = model as unknown as {
        get_text_features: (
          inputs: unknown
        ) => Promise<{ text_embeds?: { data: Float32Array }; data?: Float32Array }>
      }
      const output = await modelObj.get_text_features(textInputs)
      const rawData = output.text_embeds?.data ?? output.data
      if (!rawData) throw new Error("Failed to compute text embeddings")
      embedding = normalizeVector(new Float32Array(rawData))
    } else {
      if (!processor || !model) throw new Error("Model not loaded")
      const image = await RawImage.read(msg.source)
      const imageInputs = await processor(image)
      const modelObj = model as unknown as {
        get_image_features: (
          inputs: unknown
        ) => Promise<{ image_embeds?: { data: Float32Array }; data?: Float32Array }>
      }
      const output = await modelObj.get_image_features(imageInputs)
      const rawData = output.image_embeds?.data ?? output.data
      if (!rawData) throw new Error("Failed to compute image embeddings")
      embedding = normalizeVector(new Float32Array(rawData))
    }

    // Transfer the buffer ownership — zero-copy transfer to main thread
    port.postMessage({ type: "result", id: msg.id, embedding }, [
      embedding.buffer as ArrayBuffer,
    ])
  } catch (err: unknown) {
    port.postMessage({
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : "Inference failed",
    })
  }
}
