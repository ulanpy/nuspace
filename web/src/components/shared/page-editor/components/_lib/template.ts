import type { ComponentConfig, Config } from "@puckeditor/core"

/**
 * Props that carry *authored content* — text, links, image filenames. A shared
 * design's value is its layout and styling; the recipient fills in their own
 * content. So these fields are reset to the block's placeholder defaults when a
 * page is copied as a template.
 *
 * Dotted keys reach nested props (Hero's photo lives under `image.url`).
 */
export const CONTENT_FIELDS: Record<string, readonly string[]> = {
  Button: ["label", "description", "href"],
  Flex: [],
  Grid: [],
  Heading: ["text"],
  Hero: ["title", "description", "buttons", "image.url"],
  Image: ["image", "alt"],
  LinkTree: ["buttons"],
  RichText: ["richtext"],
  Space: [],
  Stats: ["items"],
  Text: ["text"],
  Video: ["url"],
}

type TemplateBlock = { type: string; props: Record<string, unknown> }

function getAtPath(source: unknown, path: string): unknown {
  let node = source
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined
    node = (node as Record<string, unknown>)[key]
  }
  return node
}

function setAtPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split(".")
  const copy: Record<string, unknown> = { ...source }
  let node = copy
  for (let i = 0; i < keys.length - 1; i += 1) {
    const current = node[keys[i]]
    const next =
      current !== null && typeof current === "object" && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {}
    node[keys[i]] = next
    node = next
  }
  node[keys[keys.length - 1]] = value
  return copy
}

/** A blank of the right shape so a missing default never leaves a stale value. */
function emptyFor(current: unknown): unknown {
  if (Array.isArray(current)) return []
  if (typeof current === "string") return ""
  if (current !== null && typeof current === "object") return {}
  return undefined
}

/** Fields whose array holds child blocks (Flex/Grid slots). */
function slotKeysOf(fields: unknown): string[] {
  if (fields === null || typeof fields !== "object") return []
  return Object.entries(fields as Record<string, unknown>)
    .filter(
      ([, field]) =>
        field !== null &&
        typeof field === "object" &&
        "type" in field &&
        (field as { type?: string }).type === "slot"
    )
    .map(([key]) => key)
}

function transformBlock(block: TemplateBlock, config: Config): TemplateBlock {
  const components = config.components as Record<string, ComponentConfig>
  const component = components[block.type]
  const defaults = component?.defaultProps as Record<string, unknown> | undefined
  if (!defaults) return block

  let props: Record<string, unknown> = { ...block.props }
  for (const field of CONTENT_FIELDS[block.type] ?? []) {
    const placeholder =
      getAtPath(defaults, field) ?? emptyFor(getAtPath(props, field))
    props = setAtPath(props, field, placeholder)
  }
  for (const key of slotKeysOf(component.fields)) {
    const slot = props[key]
    if (Array.isArray(slot)) {
      props = { ...props, [key]: transformBlocks(slot as TemplateBlock[], config) }
    }
  }
  return { ...block, props }
}

function transformBlocks(
  blocks: readonly TemplateBlock[],
  config: Config
): TemplateBlock[] {
  return blocks.map((block) => transformBlock(block, config))
}

/**
 * Copies a page design as a template: block types, layout, alignment, colors
 * and other styling survive as-is; text, links and images are reset to their
 * blocks' placeholder defaults. Nested slots (Flex/Grid children) are walked
 * the same way. Unknown block types are passed through untouched.
 */
export function applyTemplate<T extends Record<string, unknown>>(
  data: T,
  config: Config
): T {
  const content = Array.isArray(data.content)
    ? (data.content as TemplateBlock[])
    : []
  const zones = data.zones as Record<string, unknown> | undefined
  return {
    ...data,
    content: transformBlocks(content, config),
    ...(zones && typeof zones === "object"
      ? {
          zones: Object.fromEntries(
            Object.entries(zones).map(([key, value]) => [
              key,
              Array.isArray(value)
                ? transformBlocks(value as TemplateBlock[], config)
                : value,
            ])
          ),
        }
      : {}),
  } as T
}