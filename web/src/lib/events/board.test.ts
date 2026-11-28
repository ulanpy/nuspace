import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  assignColumns,
  estimatePosterHeight,
  hangPoster,
  PIN_COLORS,
} from "./board"

describe("hangPoster", () => {
  it("hangs the same event the same way every time", () => {
    assert.deepEqual(hangPoster(42), hangPoster(42))
  })

  it("hangs different events differently", () => {
    const looks = new Set(
      Array.from({ length: 30 }, (_, id) => JSON.stringify(hangPoster(id + 1)))
    )
    assert.ok(looks.size > 25)
  })

  it("keeps every poster within the tilt and offsets the board allows", () => {
    for (let id = 1; id <= 500; id++) {
      const hang = hangPoster(id)
      assert.ok(Math.abs(hang.rotation) <= 3.5, `tilt of ${id}`)
      assert.ok(hang.pinX >= 36 && hang.pinX <= 64, `pin position of ${id}`)
      assert.ok(Math.abs(hang.offsetX) <= 7, `sideways drift of ${id}`)
      assert.ok(hang.offsetY >= 0 && hang.offsetY <= 12, `drop of ${id}`)
      assert.ok(PIN_COLORS.includes(hang.pinColor), `pin colour of ${id}`)
    }
  })

  it("uses all three ways of holding a poster up across a board", () => {
    const mounts = new Set(
      Array.from({ length: 200 }, (_, id) => hangPoster(id + 1).mount)
    )
    assert.deepEqual([...mounts].sort(), ["corners", "pin", "tape"])
  })

  it("lays a taped-at-the-corners poster flatter than a pinned one", () => {
    const worst = (mount: string) =>
      Math.max(
        ...Array.from({ length: 500 }, (_, id) => hangPoster(id + 1))
          .filter((hang) => hang.mount === mount)
          .map((hang) => Math.abs(hang.rotation))
      )
    assert.ok(worst("corners") < worst("pin"))
  })
})

describe("estimatePosterHeight", () => {
  it("grows with a longer name and stops at three lines of title", () => {
    const short = estimatePosterHeight("Hackathon")
    const long = estimatePosterHeight("A".repeat(40))
    const huge = estimatePosterHeight("A".repeat(400))
    assert.ok(long > short)
    assert.ok(huge > long)
    assert.equal(estimatePosterHeight("A".repeat(60)), huge)
  })
})

describe("assignColumns", () => {
  it("sends each poster to the shortest column, left first on a tie", () => {
    assert.deepEqual(assignColumns([1, 1, 1, 1, 1], 3), [0, 1, 2, 0, 1])
    assert.deepEqual(assignColumns([3, 1, 1, 1], 2), [0, 1, 1, 1])
  })

  it("uses a single column when asked for fewer than one", () => {
    assert.deepEqual(assignColumns([1, 2, 3], 0), [0, 0, 0])
  })

  it("keeps every poster already on the board in place when more are appended", () => {
    const heights = Array.from(
      { length: 60 },
      (_, index) => 1.9 + ((index * 7) % 5) * 0.17
    )
    for (const columns of [1, 2, 3, 4]) {
      const before = assignColumns(heights.slice(0, 20), columns)
      const after = assignColumns(heights.slice(0, 40), columns)
      const last = assignColumns(heights, columns)
      assert.deepEqual(after.slice(0, 20), before)
      assert.deepEqual(last.slice(0, 40), after)
    }
  })

  it("keeps the posters in place when loading ghosts trail them", () => {
    const heights = [1.9, 2.1, 2.3, 1.9, 2.1, 2.3, 1.9]
    const withGhosts = assignColumns([...heights, 2, 2, 2], 3)
    assert.deepEqual(
      withGhosts.slice(0, heights.length),
      assignColumns(heights, 3)
    )
  })
})
