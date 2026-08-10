import path from "path"
import { fileURLToPath } from "url"

// Polyfill __dirname / __filename on globalThis for ESM.
// Required so @huggingface/transformers and onnxruntime-node can resolve
// native binary paths when dynamically imported in the main Electron process.
const __polyfillFilename = fileURLToPath(import.meta.url)
const __polyfillDirname = path.dirname(__polyfillFilename)
if (typeof (globalThis as Record<string, unknown>)["__dirname"] === "undefined") {
  ;(globalThis as Record<string, unknown>)["__dirname"] = __polyfillDirname
  ;(globalThis as Record<string, unknown>)["__filename"] = __polyfillFilename
}

// Polyfill DOMParser globally in the Node.js main process to suppress warnings from exifreader
if (typeof (globalThis as Record<string, unknown>).DOMParser === "undefined") {
  class MockDOMParser {
    parseFromString() {
      return null
    }
  }
  ;(globalThis as Record<string, unknown>).DOMParser = MockDOMParser
}
