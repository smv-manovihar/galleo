import { AIService, cosineSimilarity } from "./ai.service"
import { EmbeddingRepository } from "../repositories/embedding.repository"
import { MediaRepository } from "../repositories/media.repository"
import type { MediaItem } from "../../shared/types/media"

export interface SearchQuery {
  query: string
  adaptiveScope?: boolean
  includeRelatedClusters?: boolean
  mediaType?: "all" | "photo" | "video"
  folderPath?: string
  minScore?: number
}

export interface SearchResultItem {
  mediaId: string
  item: MediaItem
  score: number
  semanticScore: number
  textScore: number
  matchingFrame?: {
    timestampSeconds: number
    thumbnailPath?: string
  }
  relatedCluster?: SearchResultItem[]
}

export class SearchEngineService {
  private aiService = new AIService()
  private embeddingRepository = new EmbeddingRepository()
  private mediaRepository = new MediaRepository()

  /**
   * Performs hybrid semantic and text search across indexed media library
   */
  public async search(params: SearchQuery): Promise<SearchResultItem[]> {
    const {
      query,
      adaptiveScope = true,
      includeRelatedClusters = false,
      mediaType = "all",
      folderPath,
      minScore,
    } = params

    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    // 1. Fetch library media items
    let allItems: MediaItem[] = folderPath
      ? this.mediaRepository.getByFolderPath(folderPath)
      : this.mediaRepository.getAll()

    if (mediaType !== "all") {
      allItems = allItems.filter((item) => item.mediaType === mediaType)
    }

    if (allItems.length === 0) return []

    // Map item by ID for fast lookup
    const itemMap = new Map<string, MediaItem>()
    for (const item of allItems) {
      itemMap.set(item.id, item)
    }

    // 2. Generate prompt text embedding vector if model is downloaded
    const hasAI = this.aiService.isModelDownloaded()
    let promptVector: Float32Array | null = null

    if (hasAI) {
      try {
        promptVector = await this.aiService.generateTextEmbedding(normalizedQuery)
      } catch {
        promptVector = null
      }
    }

    // Load indexed vectors if promptVector is available
    const targetIds = Array.from(itemMap.keys())
    const mediaEmbeddings = promptVector
      ? this.embeddingRepository.getMediaEmbeddingsForIds(targetIds)
      : []
    const frameEmbeddings = promptVector
      ? this.embeddingRepository.getVideoFrameEmbeddingsForIds(targetIds)
      : []

    const imageVectorMap = new Map<string, Float32Array>()
    for (const record of mediaEmbeddings) {
      if (itemMap.has(record.mediaId)) {
        imageVectorMap.set(record.mediaId, record.embedding)
      }
    }

    // Group video frame embeddings by mediaId
    const videoFramesMap = new Map<
      string,
      Array<{ timestampSeconds: number; embedding: Float32Array; thumbnailPath?: string }>
    >()
    for (const record of frameEmbeddings) {
      if (itemMap.has(record.mediaId)) {
        const existing = videoFramesMap.get(record.mediaId) || []
        existing.push({
          timestampSeconds: record.timestampSeconds,
          embedding: record.embedding,
          thumbnailPath: record.thumbnailPath,
        })
        videoFramesMap.set(record.mediaId, existing)
      }
    }

    // 3. Compute hybrid relevance scores
    const results: SearchResultItem[] = []

    for (const item of allItems) {
      const textScore = this.computeTextScore(normalizedQuery, item)

      let semanticScore = 0
      let matchingFrame: { timestampSeconds: number; thumbnailPath?: string } | undefined

      if (promptVector) {
        if (item.mediaType === "photo") {
          const imgVector = imageVectorMap.get(item.id)
          if (imgVector) {
            semanticScore = Math.max(0, cosineSimilarity(promptVector, imgVector))
          }
        } else if (item.mediaType === "video") {
          const frames = videoFramesMap.get(item.id)
          if (frames && frames.length > 0) {
            let bestFrameScore = 0
            let bestFrame = frames[0]

            for (const frame of frames) {
              const frameSim = Math.max(
                0,
                cosineSimilarity(promptVector, frame.embedding)
              )
              if (frameSim > bestFrameScore) {
                bestFrameScore = frameSim
                bestFrame = frame
              }
            }

            semanticScore = bestFrameScore
            matchingFrame = {
              timestampSeconds: bestFrame.timestampSeconds,
              thumbnailPath: bestFrame.thumbnailPath,
            }
          }
        }
      }

      const metaScore = this.computeMetaScore(item)

      // Weights: 80% semantic, 15% text, 5% metadata (or 90% text, 10% metadata if no vector AI)
      const compositeScore = promptVector
        ? 0.8 * semanticScore + 0.15 * textScore + 0.05 * metaScore
        : 0.9 * textScore + 0.1 * metaScore

      if (compositeScore > 0.05) {
        results.push({
          mediaId: item.id,
          item,
          score: Math.round(compositeScore * 100) / 100,
          semanticScore: Math.round(semanticScore * 100) / 100,
          textScore: Math.round(textScore * 100) / 100,
          matchingFrame,
        })
      }
    }

    // Sort by composite score descending
    results.sort((a, b) => b.score - a.score)

    // 4. Apply Adaptive Scope Cutoff if requested
    let filteredResults = results
    if (minScore !== undefined) {
      filteredResults = results.filter((r) => r.score >= minScore)
    } else if (adaptiveScope && results.length > 3) {
      filteredResults = this.applyAdaptiveCutoff(results)
    }

    // 5. Visual Cluster Expansion if requested
    if (includeRelatedClusters && hasAI && filteredResults.length > 0) {
      for (const res of filteredResults.slice(0, 5)) {
        const cluster = await this.findSimilar(res.mediaId, 4)
        // Exclude the parent item itself from cluster
        res.relatedCluster = cluster.filter((c) => c.mediaId !== res.mediaId)
      }
    }

    return filteredResults
  }

  /**
   * Finds visually similar items in the library using target item's embedding vector
   */
  public async findSimilar(
    mediaId: string,
    limit: number = 12
  ): Promise<SearchResultItem[]> {
    const targetItem = this.mediaRepository.getById(mediaId)
    if (!targetItem) return []

    let targetVector: Float32Array | null =
      this.embeddingRepository.getMediaEmbedding(mediaId)

    if (!targetVector && targetItem.mediaType === "video") {
      const frames = this.embeddingRepository.getVideoFrameEmbeddings(mediaId)
      if (frames.length > 0) {
        targetVector = frames[0].embedding
      }
    }

    if (!targetVector) return []

    const allMediaEmbeddings = this.embeddingRepository.getAllMediaEmbeddings()
    const allFrameEmbeddings = this.embeddingRepository.getAllVideoFrameEmbeddings()

    const itemSimMap = new Map<
      string,
      { score: number; frame?: { timestampSeconds: number; thumbnailPath?: string } }
    >()

    // Compare with image embeddings
    for (const rec of allMediaEmbeddings) {
      if (rec.mediaId === mediaId) continue
      const sim = Math.max(0, cosineSimilarity(targetVector, rec.embedding))
      if (sim > 0.3) {
        itemSimMap.set(rec.mediaId, { score: sim })
      }
    }

    // Compare with video frame embeddings
    for (const frame of allFrameEmbeddings) {
      if (frame.mediaId === mediaId) continue
      const sim = Math.max(0, cosineSimilarity(targetVector, frame.embedding))
      const existing = itemSimMap.get(frame.mediaId)
      if (!existing || sim > existing.score) {
        itemSimMap.set(frame.mediaId, {
          score: sim,
          frame: {
            timestampSeconds: frame.timestampSeconds,
            thumbnailPath: frame.thumbnailPath,
          },
        })
      }
    }

    const matchedMediaIds = Array.from(itemSimMap.keys())
    const results: SearchResultItem[] = []

    for (const id of matchedMediaIds) {
      const item = this.mediaRepository.getById(id)
      if (!item) continue
      const data = itemSimMap.get(id)!
      results.push({
        mediaId: id,
        item,
        score: Math.round(data.score * 100) / 100,
        semanticScore: Math.round(data.score * 100) / 100,
        textScore: 0,
        matchingFrame: data.frame,
      })
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  /**
   * Text matching score against filename and path
   */
  private computeTextScore(query: string, item: MediaItem): number {
    const filename = item.name.toLowerCase()
    const pathLower = item.path.toLowerCase()

    if (filename === query) return 1.0
    if (filename.startsWith(query)) return 0.85
    if (filename.includes(query)) return 0.65
    if (pathLower.includes(query)) return 0.4

    // Tokenized jaccard similarity check
    const queryTokens = query.split(/\s+/).filter(Boolean)
    const nameTokens = filename.split(/[\s_.-]+/).filter(Boolean)

    if (queryTokens.length === 0 || nameTokens.length === 0) return 0

    let matches = 0
    for (const qTok of queryTokens) {
      if (nameTokens.some((nTok) => nTok.includes(qTok))) {
        matches++
      }
    }

    return matches > 0 ? (matches / queryTokens.length) * 0.5 : 0
  }

  /**
   * Quality composite and recency metadata score
   */
  private computeMetaScore(item: MediaItem): number {
    const qualityScore = (item.quality?.compositeScore ?? 50) / 100
    return Math.min(1.0, Math.max(0, qualityScore))
  }

  /**
   * Dynamic Elbow Curve Detection to cut off low-confidence noise
   */
  private applyAdaptiveCutoff(results: SearchResultItem[]): SearchResultItem[] {
    if (results.length <= 3) return results

    const maxScore = results[0].score
    const minThreshold = maxScore * 0.4

    let cutoffIndex = results.length

    for (let i = 0; i < results.length - 1; i++) {
      const drop = results[i].score - results[i + 1].score
      // Detect steep score drop-off
      if (drop > 0.25 && results[i + 1].score < minThreshold) {
        cutoffIndex = i + 1
        break
      }
    }

    return results.slice(0, cutoffIndex)
  }
}
