import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { pageContentText, stripHtml } from "./content-text.ts"

describe("stripHtml", () => {
  it("drops tags without gluing words together and decodes entities", () => {
    assert.equal(
      stripHtml("<p>Fencing</p><p>Tom &amp; Jerry&nbsp;club</p>")
        .replace(/\s+/g, " ")
        .trim(),
      "Fencing Tom & Jerry club"
    )
  })
})

describe("pageContentText", () => {
  it("collects string props from top-level blocks", () => {
    const data = {
      root: { props: { title: "Chess Club" } },
      content: [
        { type: "Heading", props: { id: "Heading-1", text: "Welcome" } },
      ],
    }
    assert.equal(pageContentText(data), "Chess Club Welcome")
  })

  it("recurses into nested Grid and Flex slots", () => {
    const data = {
      content: [
        {
          type: "Grid",
          props: {
            id: "Grid-1",
            items: [
              {
                type: "Flex",
                props: {
                  id: "Flex-2",
                  items: [
                    {
                      type: "Text",
                      props: { id: "Text-3", text: "deeply nested phrase" },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    }
    assert.equal(pageContentText(data), "deeply nested phrase")
  })

  it("strips HTML from RichText and Hero descriptions", () => {
    const data = {
      content: [
        {
          type: "RichText",
          props: { text: "<h2>Meetings</h2><p>Every <b>Friday</b></p>" },
        },
        {
          type: "Hero",
          props: { title: "Join", description: "<p>Open to <em>all</em></p>" },
        },
      ],
    }
    assert.equal(
      pageContentText(data),
      "Meetings Every Friday Join Open to all"
    )
  })

  it("skips identifiers and tolerates empty input", () => {
    assert.equal(
      pageContentText({ content: [{ type: "Space", props: { id: "Space-9" } }] }),
      ""
    )
    assert.equal(pageContentText(null), "")
    assert.equal(pageContentText({}), "")
  })

  it("skips styling and addresses but keeps alt text", () => {
    const data = {
      content: [
        {
          type: "Hero",
          props: {
            id: "Hero-1",
            title: "Robotics Club",
            align: "center",
            color: "#ff0000",
            href: "https://example.com",
            image: { url: "/media/a.png", alt: "Team at the finals" },
            padding: "16px",
          },
        },
      ],
    }
    assert.equal(pageContentText(data), "Robotics Club Team at the finals")
  })
})
