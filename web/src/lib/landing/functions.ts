export interface CarouselAutoplayState {
  imageCount: number
  prefersReducedMotion: boolean
  isDocumentVisible: boolean
  isInteracting: boolean
}

export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

export function isCarouselAutoplayEligible({
  imageCount,
  prefersReducedMotion,
  isDocumentVisible,
  isInteracting,
}: CarouselAutoplayState): boolean {
  return (
    imageCount > 1 &&
    !prefersReducedMotion &&
    isDocumentVisible &&
    !isInteracting
  )
}
