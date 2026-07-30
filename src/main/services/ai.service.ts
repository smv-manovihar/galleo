import { app } from "electron"
import path from "path"
import fs from "fs"
import { Worker } from "worker_threads"
import { EmbeddingRepository } from "../repositories/embedding.repository"

export const MODEL_NAME = "Xenova/siglip-base-patch16-224"

export function getModelCacheDir(): string {
  let userDataPath: string
  try {
    const isDev = !app.isPackaged || process.env.NODE_ENV === "development"
    if (isDev) {
      userDataPath = path.join(process.cwd(), ".data")
    } else {
      userDataPath = app.getPath("userData")
    }
  } catch {
    userDataPath = path.join(process.cwd(), ".data")
  }
  const cacheDir = path.join(userDataPath, "models")
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const valA = a[i]
    const valB = b[i]
    dotProduct += valA * valB
    normA += valA * valA
    normB += valB * valB
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function deleteDirNonBlocking(targetPath: string): Promise<void> {
  if (!fs.existsSync(targetPath)) return
  const entries = await fs.promises.readdir(targetPath, { withFileTypes: true })
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const fullPath = path.join(targetPath, entry.name)
    if (entry.isDirectory()) {
      await deleteDirNonBlocking(fullPath)
    } else {
      await fs.promises.unlink(fullPath).catch(() => {})
    }
    if (i % 20 === 0) {
      await new Promise((resolve) => setImmediate(resolve))
    }
  }
  await fs.promises.rmdir(targetPath).catch(() => {})
}

// ---------------------------------------------------------------------------
// Worker message types
// ---------------------------------------------------------------------------

interface WorkerResultMessage {
  type: "result"
  id: number
  embedding: Float32Array
}

interface WorkerErrorMessage {
  type: "error"
  id: number
  message: string
}

interface WorkerReadyMessage {
  type: "ready"
}

type WorkerMessage = WorkerResultMessage | WorkerErrorMessage | WorkerReadyMessage

// ---------------------------------------------------------------------------
// AIService — routes inference to a dedicated Worker Thread
// ---------------------------------------------------------------------------

export class AIService {
  private embeddingRepository: EmbeddingRepository = new EmbeddingRepository()

  private worker: Worker | null = null
  private workerReady = false
  private workerReadyPromise: Promise<void> | null = null

  /** Pending inference callbacks keyed by message id */
  private pending = new Map<
    number,
    { resolve: (v: Float32Array) => void; reject: (e: Error) => void }
  >()
  private nextId = 0

  /** Sequential queue so only one inference runs at a time (prevents OOM) */
  private queuePromise: Promise<unknown> = Promise.resolve()

  /**
   * Check if CLIP model weights are downloaded locally
   */
  public isModelDownloaded(): boolean {
    const cacheDir = getModelCacheDir()
    const possiblePaths = [
      path.join(cacheDir, ...MODEL_NAME.split("/")),
      path.join(cacheDir, `models--${MODEL_NAME.replace("/", "--")}`),
    ]

    for (const modelFolderPath of possiblePaths) {
      if (!fs.existsSync(modelFolderPath)) continue

      const onnxCandidates = [
        path.join(modelFolderPath, "onnx", "model.onnx"),
        path.join(modelFolderPath, "onnx", "model_quantized.onnx"),
        path.join(modelFolderPath, "model.onnx"),
        path.join(modelFolderPath, "model_quantized.onnx"),
      ]

      let hasValidOnnx = false
      for (const candidate of onnxCandidates) {
        if (fs.existsSync(candidate)) {
          try {
            const stats = fs.statSync(candidate)
            if (stats.size > 1_000_000) {
              hasValidOnnx = true
              break
            }
          } catch {
            // ignore
          }
        }
      }

      if (hasValidOnnx) return true
    }

    return false
  }

  // ---------------------------------------------------------------------------
  // Worker lifecycle
  // ---------------------------------------------------------------------------

  private spawnWorker(): void {
    const cacheDir = getModelCacheDir()
    const userDataPath = path.dirname(cacheDir)

    if (!this.isModelDownloaded()) {
      console.warn("[AIService] spawnWorker called but model is NOT fully downloaded — worker thread waiting for download")
    }

    // Resolve the compiled worker script path (sits alongside main/index.js)
    const workerPath = path.join(__dirname, "ai-worker.js")

    this.worker = new Worker(workerPath, {
      env: { ...process.env, GALLEO_USER_DATA: userDataPath },
    })

    this.workerReady = false
    this.workerReadyPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (msg: WorkerMessage) => {
        if (msg.type === "ready") {
          this.workerReady = true
          this.worker?.off("message", onMessage)
          console.log("[AIService] Worker ready — model loaded successfully")
          resolve()
        } else if (msg.type === "error" && msg.id === -1) {
          console.error("[AIService] Worker failed to load model:", msg.message)
          reject(new Error(msg.message))
        }
      }
      this.worker!.on("message", onMessage)
      this.worker!.once("error", reject)
    })

    // Route result/error messages to pending resolvers
    this.worker.on("message", (msg: WorkerMessage) => {
      if (msg.type === "result") {
        this.pending.get(msg.id)?.resolve(msg.embedding)
        this.pending.delete(msg.id)
      } else if (msg.type === "error" && msg.id !== -1) {
        console.error("[AIService] Inference error for id", msg.id, ":", msg.message)
        this.pending.get(msg.id)?.reject(new Error(msg.message))
        this.pending.delete(msg.id)
      }
    })

    this.worker.on("error", (err) => {
      console.error("[AIService] Worker thread error:", err)
      // Reject all pending and clear
      for (const { reject } of this.pending.values()) {
        reject(err)
      }
      this.pending.clear()
      this.worker = null
      this.workerReady = false
    })

    this.worker.on("exit", (code) => {
      console.warn("[AIService] Worker exited with code", code)
      this.worker = null
      this.workerReady = false
    })
  }

  private async ensureWorkerReady(): Promise<void> {
    if (this.workerReady) return

    if (!this.worker) {
      this.spawnWorker()
    }

    await this.workerReadyPromise
  }

  // ---------------------------------------------------------------------------
  // Inference API — each call is queued sequentially
  // ---------------------------------------------------------------------------

  private runQueued<T>(task: () => Promise<T>): Promise<T> {
    const res = this.queuePromise.then(async () => {
      try {
        return await task()
      } finally {
        // Yield to event loop between queued tasks
        await new Promise((resolve) => setImmediate(resolve))
      }
    })
    this.queuePromise = res.catch(() => {})
    return res as Promise<T>
  }

  /**
   * Generates a 768-d Float32 vector embedding for text prompt
   */
  public async generateTextEmbedding(text: string): Promise<Float32Array> {
    return this.runQueued(async () => {
      await this.ensureWorkerReady()

      const id = this.nextId++
      return new Promise<Float32Array>((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        this.worker!.postMessage({ type: "embed", id, source: `text:${text}` })
      })
    })
  }

  /**
   * Generates a 768-d Float32 vector embedding for an image file
   */
  public async generateImageEmbedding(imagePath: string): Promise<Float32Array> {
    return this.runQueued(async () => {
      await this.ensureWorkerReady()

      const id = this.nextId++
      const embedding = await new Promise<Float32Array>((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        this.worker!.postMessage({ type: "embed", id, source: imagePath })
      })

      // Sanity check: a valid SigLIP embedding should not be all-zeros
      const norm = embedding.reduce((sum, v) => sum + v * v, 0)
      if (norm < 0.01) {
        console.warn("[AIService] Near-zero embedding returned for", imagePath, "— model may not be loaded correctly")
      }

      return embedding
    })
  }

  /**
   * Downloads and initializes model, tokenizer, and processor with progress callback.
   * Download still happens in-process (it's I/O-bound, not CPU-bound).
   */
  public async downloadModel(
    onProgress?: (progress: number) => void
  ): Promise<void> {
    // Clean up partial or interrupted model folder if not fully downloaded
    if (!this.isModelDownloaded()) {
      const cacheDir = getModelCacheDir()
      const modelFolderPath = path.join(cacheDir, ...MODEL_NAME.split("/"))
      if (fs.existsSync(modelFolderPath)) {
        try {
          await deleteDirNonBlocking(modelFolderPath)
          await fs.promises.mkdir(modelFolderPath, { recursive: true })
        } catch (err) {
          console.error("Failed to clean up partial model folder before download", err)
        }
      }
    }

    // Dynamic import so the heavy transformers package is only loaded here
    const {
      env,
      AutoTokenizer,
      AutoProcessor,
      AutoModel,
    } = await import("@huggingface/transformers")

    env.cacheDir = getModelCacheDir()
    env.allowLocalModels = true

    const maxRetries = 3
    let attempt = 0

    if (onProgress) onProgress(0)

    const makeProgressCallback = (step: "tokenizer" | "processor" | "model") => {
      return (info: Record<string, unknown>) => {
        if (!info || typeof info !== "object" || !onProgress) return
        let filePct = 0
        if (typeof info["progress"] === "number") {
          filePct = info["progress"]
        } else if (
          typeof info["loaded"] === "number" &&
          typeof info["total"] === "number" &&
          (info["total"] as number) > 0
        ) {
          filePct = ((info["loaded"] as number) / (info["total"] as number)) * 100
        }
        let overall = 0
        if (step === "tokenizer") overall = Math.round((filePct / 100) * 2)
        else if (step === "processor") overall = Math.round(2 + (filePct / 100) * 3)
        else if (step === "model") overall = Math.round(5 + (filePct / 100) * 94)
        onProgress(Math.min(99, Math.max(0, overall)))
      }
    }

    while (attempt < maxRetries) {
      try {
        attempt++
        await AutoTokenizer.from_pretrained(MODEL_NAME, {
          progress_callback: makeProgressCallback("tokenizer"),
        })
        if (onProgress) onProgress(2)

        await AutoProcessor.from_pretrained(MODEL_NAME, {
          progress_callback: makeProgressCallback("processor"),
        })
        if (onProgress) onProgress(5)

        await AutoModel.from_pretrained(MODEL_NAME, {
          progress_callback: makeProgressCallback("model"),
        })

        if (onProgress) onProgress(100)
        break
      } catch (err) {
        if (attempt >= maxRetries) throw err
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
      }
    }
  }

  /**
   * Wipes vector database tables and optionally deletes model weights
   */
  public async purgeEmbeddings(options?: { deleteModel?: boolean }): Promise<void> {
    if (options?.deleteModel) {
      // Terminate the worker if running to release model file locks
      await this.worker?.terminate()
      this.worker = null
      this.workerReady = false
    }

    // Reject any pending inferences
    for (const { reject } of this.pending.values()) {
      reject(new Error("Embeddings purged"))
    }
    this.pending.clear()

    this.embeddingRepository.purgeAllEmbeddings()

    if (options?.deleteModel) {
      const cacheDir = getModelCacheDir()
      if (fs.existsSync(cacheDir)) {
        await deleteDirNonBlocking(cacheDir)
        await fs.promises.mkdir(cacheDir, { recursive: true })
      }
    }
  }

  /**
   * Return overall status of AI engine
   */
  public getStatus(): {
    isDownloaded: boolean
    stats: { mediaEmbeddingCount: number; videoFrameEmbeddingCount: number }
  } {
    return {
      isDownloaded: this.isModelDownloaded(),
      stats: this.embeddingRepository.getEmbeddingStats(),
    }
  }
}

export const aiService = new AIService()
