/**
 * AI Worker Thread — runs ONNX SigLIP model inference in isolation so the main
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
// so the ONNX runtime can resolve native binary paths.
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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
// Lazily-imported transformers types
// ---------------------------------------------------------------------------

type TransformersModule = typeof import("@huggingface/transformers")
type PreTrainedTokenizer = Awaited<ReturnType<TransformersModule["AutoTokenizer"]["from_pretrained"]>>
type Processor = Awaited<ReturnType<TransformersModule["AutoProcessor"]["from_pretrained"]>>
type TextModel = Awaited<ReturnType<TransformersModule["SiglipTextModel"]["from_pretrained"]>>
type VisionModel = Awaited<ReturnType<TransformersModule["SiglipVisionModel"]["from_pretrained"]>>

// ---------------------------------------------------------------------------
// Model state (module-level singletons inside this worker thread)
// ---------------------------------------------------------------------------

let tokenizer: PreTrainedTokenizer | null = null
let processor: Processor | null = null
let textModel: TextModel | null = null
let visionModel: VisionModel | null = null
let loadPromise: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (tokenizer && processor && textModel && visionModel) return

  const {
    env,
    AutoTokenizer,
    AutoProcessor,
    SiglipTextModel,
    SiglipVisionModel,
  } = await import("@huggingface/transformers")

  env.cacheDir = getModelCacheDir()
  env.allowLocalModels = true
  env.allowRemoteModels = true
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }

  tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME)
  processor = await AutoProcessor.from_pretrained(MODEL_NAME)
  textModel = await SiglipTextModel.from_pretrained(MODEL_NAME)
  visionModel = await SiglipVisionModel.from_pretrained(MODEL_NAME)
}

function normalizeVector(vec: Float32Array): Float32Array {
  let sum = 0
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i]
  const norm = Math.sqrt(sum)
  if (norm === 0) return vec
  const out = new Float32Array(vec.length)
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm
  return out
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
      if (!tokenizer || !textModel) throw new Error("Text model not loaded")
      const textInputs = tokenizer([text], { padding: "max_length", truncation: true })
      const textOutputs = await textModel(textInputs)
      const textEmbeds = textOutputs.pooler_output ?? textOutputs.last_hidden_state
      if (!textEmbeds?.data) throw new Error("Failed to compute text embeddings")
      embedding = normalizeVector(new Float32Array(textEmbeds.data))
    } else {
      if (!processor || !visionModel) throw new Error("Vision model not loaded")

      if (!fs.existsSync(msg.source)) {
        throw new Error(`File does not exist: ${msg.source}`)
      }
      const stat = fs.statSync(msg.source)
      if (stat.size < 100) {
        throw new Error(`Thumbnail file is truncated or corrupted (${stat.size} bytes): ${msg.source}`)
      }

      const fileBuf = fs.readFileSync(msg.source)
      const image = await RawImage.read(new Blob([fileBuf]))

      const imageInputs = await processor(image)
      const imageOutputs = await visionModel(imageInputs)
      const imageEmbeds = imageOutputs.pooler_output ?? imageOutputs.last_hidden_state
      if (!imageEmbeds?.data) throw new Error("Failed to compute image embeddings")
      embedding = normalizeVector(new Float32Array(imageEmbeds.data))
    }

    // Zero-copy transfer of ArrayBuffer ownership to main thread
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
