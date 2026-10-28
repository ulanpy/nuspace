import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { launcherItems, visibleSections } from "./functions.ts"

describe("launcher", () => {
  it("lists the six hosts by name, in launcher order", () => {
    assert.deepEqual(
      launcherItems("nuspace.kz").map((item) => [item.key, item.name]),
      [
        ["root", "Search"],
        ["courses", "Courses"],
        ["events", "Events"],
        ["opportunities", "Opportunities"],
        ["pages", "Pages"],
        ["my", "My Nuspace"],
      ]
    )
  })

  it("highlights the host the visitor is on, in any environment", () => {
    const current = (hostname: string) =>
      launcherItems(hostname)
        .filter((item) => item.current)
        .map((item) => item.key)

    assert.deepEqual(current("events.nuspace.kz"), ["events"])
    assert.deepEqual(current("EVENTS_STAGING.nuspace.kz"), ["events"])
    assert.deepEqual(current("my.localhost"), ["my"])
    assert.deepEqual(current("stage.nuspace.kz"), ["root"])
  })

  it("highlights nothing on a hostname outside the table", () => {
    assert.ok(launcherItems("127.0.0.1").every((item) => !item.current))
  })
})

describe("rail visibility", () => {
  const sections = [
    { label: "Account", requiresSession: true },
    { label: "My Pages", requiresSession: true },
    { label: "People" },
  ]
  const labels = (rows: readonly { label: string }[] | undefined) =>
    rows?.map((row) => row.label)

  it("gives a signed-in visitor every section", () => {
    assert.deepEqual(labels(visibleSections(sections, true)), [
      "Account",
      "My Pages",
      "People",
    ])
  })

  it("keeps only the open sections for a signed-out visitor", () => {
    assert.deepEqual(labels(visibleSections(sections, false)), ["People"])
  })

  it("passes a host with no sections through", () => {
    assert.equal(visibleSections(undefined, false), undefined)
  })
})
