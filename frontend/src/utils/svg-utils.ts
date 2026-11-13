/**
 * Utility to get the src URL from an SVG import.
 * In Next.js, imported SVGs return an object with src property.
 * In Vite, they return a string URL directly.
 */
export function getSvgSrc(svgImport: string | { src: string }): string {
  if (typeof svgImport === 'string') {
    return svgImport;
  }
  return svgImport.src;
}
