import { BrowserWindow } from "electron"
import { aiService } from "./ai.service"
import { EmbeddingRepository } from "../repositories/embedding.repository"
import { VideoFrameExtractorService } from "./video-frame-extractor.service"
import { IPC_CHANNELS, type AIIndexingProgressPayload } from "../../shared/types/ipc"

export class AIIndexerService {
  private aiService = aiService
  private embeddingRepository = new EmbeddingRepository()
  private videoFrameExtractor = new VideoFrameExtractorService()

  private isIndexing = false
  private isCancelled = false

  public stopIndexing(): void {
    if (this.isIndexing) {
      this.isCancelled = true
    }
  }

  public getIsIndexing(): boolean {
    return this.isIndexing
  }

  /**
   * Triggers background indexing of all unindexed media items in SQLite DB.
   * Runs concurrently (parallel) with folder scanning, dynamically checking for new items.
   */
  public async startIndexing(
    window?: BrowserWindow,
    checkScanning?: () => boolean
  ): Promise<void> {
    if (this.isIndexing) {
      console.log("[AIIndexer] Already indexing, skipping start")
      return
    }
    const modelReady = this.aiService.isModelDownloaded()
    console.log("[AIIndexer] startIndexing called. Model downloaded:", modelReady)
    if (!modelReady) return

    this.isIndexing = true
    this.isCancelled = false
    console.log("[AIIndexer] Starting background indexing loop")

    try {
      let processedCount = 0
      let lastTotalCount = 0
      const attemptedIds = new Set<string>()

      while (true) {
        if (this.isCancelled) break

        const excludeArray = Array.from(attemptedIds)
        const totalRemaining = this.embeddingRepository.getUnindexedCount(excludeArray)
        const batch = this.embeddingRepository.getUnindexedMediaItems(50, excludeArray)

        if (batch.length === 0) {
          // If no unindexed files, check if normal scan is still in progress
          if (checkScanning && checkScanning()) {
            await new Promise((resolve) => setTimeout(resolve, 500))
            continue
          }
          break
        }

        const totalCount = processedCount + totalRemaining
        lastTotalCount = totalCount
        console.log(`[AIIndexer] Batch: ${batch.length} items, processed so far: ${processedCount}, total: ${totalCount}`)

        for (const item of batch) {
          if (this.isCancelled) break

          // Track attempted IDs to avoid infinite loops and duplicate counts
          attemptedIds.add(item.id)

          this.notifyProgress(
            window,
            true,
            processedCount,
            totalCount,
            item.path
          )

          try {
            if (item.mediaType === "photo") {
              const imgPath = item.thumbnailPath || item.path
              console.log(`[AIIndexer] Embedding photo: ${imgPath}`)
              const vec = await this.aiService.generateImageEmbedding(imgPath)
              this.embeddingRepository.saveMediaEmbedding(item.id, vec)
              console.log(`[AIIndexer] ✓ Photo embedded (dim=${vec.length}):`  , item.path.split(/[\\/]/).pop())
            } else if (item.mediaType === "video") {
              const framesRes = await this.videoFrameExtractor.extractVideoFrames(
                item.path,
                item.id,
                3
              )
              if (framesRes.ok) {
                const frameRecords = []
                for (const frame of framesRes.data) {
                  if (this.isCancelled) break
                  const vec = await this.aiService.generateImageEmbedding(
                    frame.framePath
                  )
                  frameRecords.push({
                    id: frame.id,
                    mediaId: item.id,
                    timestampSeconds: frame.timestampSeconds,
                    frameIndex: frame.frameIndex,
                    embedding: vec,
                    thumbnailPath: frame.framePath,
                  })
                }
                if (frameRecords.length > 0) {
                  this.embeddingRepository.saveVideoFrameEmbeddings(frameRecords)
                }
              }
            }
          } catch (err: unknown) {
            console.error(
              `[AIIndexer] ✗ Failed to index ${item.path.split(/[\\/]/).pop()}:`,
              err instanceof Error ? err.message : err
            )
          }

          processedCount++
          // Yield to event loop between items
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      this.notifyProgress(window, false, processedCount, lastTotalCount)
    } finally {
      this.isIndexing = false
    }
  }

  private notifyProgress(
    window: BrowserWindow | undefined,
    isIndexing: boolean,
    processedCount: number,
    totalCount: number,
    currentFile?: string
  ): void {
    if (window && !window.isDestroyed()) {
      const payload: AIIndexingProgressPayload = {
        isIndexing,
        processedCount,
        totalCount,
        currentFile: currentFile ? currentFile.split(/[\\/]/).pop() : undefined,
      }
      window.webContents.send(IPC_CHANNELS.AI_INDEXING_PROGRESS, payload)
    }
  }
}

export const aiIndexerService = new AIIndexerService()
