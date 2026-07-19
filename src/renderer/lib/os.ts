/**
 * Returns the OS-native file manager name (e.g. "Finder" on macOS, "File Explorer" on Windows, "File Manager" on Linux).
 */
export function getFileManagerName(): string {
  if (typeof navigator !== "undefined") {
    const nav = navigator as {
      userAgentData?: { platform?: string }
      userAgent?: string
    }
    const platformData = (nav.userAgentData?.platform || "").toLowerCase()
    if (platformData.includes("mac")) return "Finder"
    if (platformData.includes("win")) return "File Explorer"
    if (platformData.includes("linux")) return "File Manager"

    const ua = (nav.userAgent || "").toLowerCase()
    if (ua.includes("mac")) return "Finder"
    if (ua.includes("win")) return "File Explorer"
    if (ua.includes("linux")) return "File Manager"
  }
  return "File Explorer"
}
