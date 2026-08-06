import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

// ============================================================================
// CONFIGURATION CONSTANTS — Set your test text and photo path here
// ============================================================================

/** The search text query to test (e.g. "a photo of a dog", "cat") */
export const TEST_TEXT_PROMPT = "a photo of a cat"

/** Absolute path to the local image file you want to test */
export const TEST_IMAGE_PATH = "F:/Test/Keep Screenshots/2023-10-25_17.21.02.png"

/** The SigLIP model to download/load from Hugging Face */
export const MODEL_NAME = "Xenova/siglip-base-patch16-224"

// ============================================================================
// ESM __dirname polyfill — Required BEFORE importing @huggingface/transformers
// ============================================================================
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
;(globalThis as Record<string, unknown>)["__dirname"] = __dirname
;(globalThis as Record<string, unknown>)["__filename"] = __filename

import {
  env,
  AutoTokenizer,
  AutoProcessor,
  SiglipModel,
  RawImage,
} from "@huggingface/transformers"

async function main() {
  console.log("=========================================================")
  console.log("  Galleo - Unified SiglipModel Semantic Search Test")
  console.log("=========================================================")

  env.cacheDir = path.join(process.cwd(), ".data", "models")
  env.allowLocalModels = true
  env.allowRemoteModels = true

  const processor = await AutoProcessor.from_pretrained(MODEL_NAME)
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME)
  const model = await SiglipModel.from_pretrained(MODEL_NAME)

  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.log(`\n⚠️  Image path not found ("${TEST_IMAGE_PATH}").`)
    return
  }

  const rawImage = await RawImage.read(TEST_IMAGE_PATH)

  console.log("\nAttempting 3: processor(rawImage) + tokenizer(text)...")
  try {
    const imageInputs = await processor(rawImage)
    const textInputs = tokenizer([TEST_TEXT_PROMPT], { padding: "max_length", truncation: true })
    const inputs = { ...imageInputs, ...textInputs }
    console.log("Success 3! Inputs keys:", Object.keys(inputs))

    const outputs = await model(inputs)
    console.log("Outputs keys:", Object.keys(outputs))
    if (outputs.logits_per_image) {
      const logits = outputs.logits_per_image.data
      const score = logits[0]
      const matchProbability = 1 / (1 + Math.exp(-score))
      console.log("---------------------------------------------------------")
      console.log(`[Result] Calibrated Logit: ${score.toFixed(4)}`)
      console.log(`[Result] SigLIP Sigmoid Match Probability: ${(matchProbability * 100).toFixed(2)}%`)
      console.log("---------------------------------------------------------")
    }
  } catch (err: unknown) {
    console.log("Failed 3:", err instanceof Error ? err.message : err)
  }
}

main().catch((err) => {
  console.error("\n❌ Execution error:", err)
  process.exit(1)
})
