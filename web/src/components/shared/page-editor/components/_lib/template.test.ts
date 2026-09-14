import { test } from "node:test"
import assert from "node:assert/strict"
import type { Config } from "@puckeditor/core"
import { applyTemplate } from "./template"

function fakeConfig(): Config {
  return {
    components: {
      Text: {
        defaultProps: { text: "Body text", align: "left", textColor: "#0f172a" },
        fields: {},
      },
      Hero: {
        defaultProps: {
          title: "Hero",
          description: "<p>Description</p>",
          buttons: [],
          image: { url: "", alt: "", aspectRatio: "original" },
        },
        fields: {},
      },
      Flex: {
        defaultProps: { gap: 24, items: [] },
        fields: { items: { type: "slot" } },
      },
    },
  } as unknown as Config
}

test("replaces authored text, keeps layout and style", () => {
  const source = {
    root: {},
    content: [
      { type: "Text", props: { text: "Our real blurb", align: "center", textColor: "#123456" } },
    ],
  }
  const result = applyTemplate(source, fakeConfig())
  assert.deepEqual(result.content[0].props, {
    text: "Body text",
    align: "center",
    textColor: "#123456",
  })
})

test("replaces a nested image url but keeps the framing", () => {
  const source = {
    root: {},
    content: [
      {
        type: "Hero",
        props: {
          title: "Join us",
          buttons: [{ label: "Sign up", href: "/x" }],
          image: { url: "nuspace.kz/hero.jpg", aspectRatio: "4/3" },
        },
      },
    ],
  }
  const result = applyTemplate(source, fakeConfig())
  assert.deepEqual(result.content[0].props, {
    title: "Hero",
    description: "<p>Description</p>",
    buttons: [],
    image: { url: "", aspectRatio: "4/3" },
  })
})

test("walks nested Flex/Grid slots", () => {
  const source = {
    root: {},
    content: [
      {
        type: "Flex",
        props: {
          gap: 16,
          items: [{ type: "Text", props: { text: "inner words", align: "right" } }],
        },
      },
    ],
  }
  const result = applyTemplate(source, fakeConfig())
  assert.deepEqual(result.content[0].props, {
    gap: 16,
    items: [{ type: "Text", props: { text: "Body text", align: "right" } }],
  })
})

test("leaves unknown block types untouched", () => {
  const source = {
    root: {},
    content: [{ type: "Mystery", props: { anything: "at all" } }],
  }
  const result = applyTemplate(source, fakeConfig())
  assert.equal(result.content[0], source.content[0])
})

test("does not mutate the source data", () => {
  const source = {
    root: {},
    content: [{ type: "Text", props: { text: "real", align: "left" } }],
  }
  applyTemplate(source, fakeConfig())
  assert.equal(source.content[0].props.text, "real")
})

test("handles empty and missing content", () => {
  assert.deepEqual(applyTemplate({ root: {}, content: [] }, fakeConfig()).content, [])
  assert.deepEqual(
    (applyTemplate({ root: {} }, fakeConfig()) as Record<string, unknown>).content,
    []
  )
})