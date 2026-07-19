import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"

if (import.meta.env.DEV) {
  const script = document.createElement("script")
  script.src = "https://unpkg.com/react-scan/dist/auto.global.js"
  script.crossOrigin = "anonymous"
  document.head.appendChild(script)
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)
