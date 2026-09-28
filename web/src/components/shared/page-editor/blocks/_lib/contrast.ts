/**
 * Pick a readable neutral text color (black/white) for a hex background.
 *
 * Its own module because it is the one pure function in this directory that
 * callers outside the editor need — `root-style.ts` reads a page's root colour
 * back out of `page_content`, and `node --test` cannot import a `.tsx` file.
 */
export function contrastColor(backgroundColor: string): string {
  const hex = (backgroundColor ?? "").replace("#", "")
  if (hex.length !== 6) return "#0f172a"
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "#0f172a" : "#f8fafc"
}
