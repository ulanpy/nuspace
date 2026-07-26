import assert from "node:assert/strict"
import test from "node:test"

import { isCarouselAutoplayEligible, wrapCarouselIndex } from "./carousel.ts"

test("wraps carousel indexes in both directions", () => {
  assert.equal(wrapCarouselIndex(1, 5), 1)
  assert.equal(wrapCarouselIndex(5, 5), 0)
  assert.equal(wrapCarouselIndex(-1, 5), 4)
  assert.equal(wrapCarouselIndex(12, 5), 2)
  assert.equal(wrapCarouselIndex(3, 0), 0)
})

test("autoplay requires multiple images and an idle visible page", () => {
  const idle = {
    imageCount: 5,
    prefersReducedMotion: false,
    isDocumentVisible: true,
    isInteracting: false,
  }

  assert.equal(isCarouselAutoplayEligible(idle), true)
  assert.equal(isCarouselAutoplayEligible({ ...idle, imageCount: 1 }), false)
  assert.equal(
    isCarouselAutoplayEligible({ ...idle, prefersReducedMotion: true }),
    false
  )
  assert.equal(
    isCarouselAutoplayEligible({ ...idle, isDocumentVisible: false }),
    false
  )
  assert.equal(
    isCarouselAutoplayEligible({ ...idle, isInteracting: true }),
    false
  )
})
