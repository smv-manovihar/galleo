import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import electron from "vite-plugin-electron"
import babel from "@rolldown/plugin-babel"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      plugins: [
        [
          "babel-plugin-react-compiler",
          {
            target: "19", // Explicitly targeting React 19
          },
        ],
      ],
    }),
    tailwindcss(),
    electron([
      {
        entry: "src/main/index.ts",
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              external: [
                "better-sqlite3",
                "sharp",
                "fluent-ffmpeg",
                "ffmpeg-static",
                "trash"
              ]
            }
          }
        }
      },
      {
        entry: "src/preload/index.ts",
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: "dist-electron/preload",
            lib: {
              entry: "src/preload/index.ts",
              formats: ["cjs"],
              fileName: () => "index.js"
            }
          }
        }
      }
    ])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000
  }
})
