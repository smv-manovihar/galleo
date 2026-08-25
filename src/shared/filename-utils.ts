/**
 * Normalizes a filename to a base canonical form by stripping common camera prefixes,
 * copy suffixes, and sharing platform suffixes.
 * This enables robust grouping of duplicates that may have slightly different filenames
 * but represent the exact same file copy.
 */
export function getNormalizedFilenameBase(filename: string): string {
  // 1. Lowercase
  let name = filename.toLowerCase()

  // 2. Strip extension
  const dotIndex = name.lastIndexOf(".")
  const baseWithoutExt = dotIndex !== -1 ? name.substring(0, dotIndex) : name
  name = baseWithoutExt

  // 3. Strip copy suffixes like " (1)", " - Copy", "_1" (limit numeric copy suffix to 1-2 digits)
  name = name
    .replace(/\s*\(\d+\)$/g, "") // " (1)"
    .replace(/\s*-\s*copy(?:\s*\(\d+\))?$/g, "") // " - Copy" or " - Copy (2)"
    .replace(/_\d{1,2}$/g, "") // "_1" or "_02"

  // 4. Strip common camera prefixes: img_, pxl_, vid_, dsc_, wa_, whatsapp image, whatsapp video, screenshot, etc.
  name = name.replace(
    /^(img|pxl|vid|dsc|wa|whatsapp\s+image|whatsapp\s+video|screenshot)[_-\s]*/g,
    ""
  )

  // 5. Strip common camera/editing/platform suffixes at the end of the name
  name = name
    .replace(/[_-](hdr|edited|bokeh|normal|wa\d{4})$/g, "")
    .replace(/\.(portrait|mp)$/g, "")

  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : baseWithoutExt.trim()
}

