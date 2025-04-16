/**
 * Gets a placeholder image URL with cache busting
 * @param width Width of the image
 * @param height Height of the image
 * @returns A placeholder image URL
 */
export function getPlaceholderImage(width = 200, height = 200): string {
    // Add a timestamp to prevent caching
    const timestamp = new Date().getTime()

    // Universal placeholder for all products
    return `https://placehold.co/${width}x${height}/EEE/31343C?text=No+Image&_t=${timestamp}`
  }
