import { useMemo, type CSSProperties, type ReactElement } from "react"
import {
  createUsePuck,
  FieldLabel,
  type CustomFieldRender,
  type CustomField,
} from "@puckeditor/core"

import { OptionsField, type Option } from "./style-fields"

const usePuck = createUsePuck()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

type FlowNode = {
  id?: string
  props?: Record<string, unknown>
  zones?: Record<string, unknown[] | undefined>
}

function collectNodes(
  nodes: unknown[] | undefined | null,
  out: FlowNode[]
): void {
  if (!Array.isArray(nodes)) return
  for (const raw of nodes) {
    if (!raw || typeof raw !== "object") continue
    const node = raw as FlowNode
    out.push(node)
    if (node.zones) {
      for (const zone of Object.values(node.zones)) {
        collectNodes(zone, out)
      }
    }
  }
}

/**
 * Array sub-field ids follow `${nodeId}_array_${prop}_${subProp}` and their
 * names look like `buttons[2].iconPosition`. This locates the owning component
 * node so a field can read a sibling prop of the item it belongs to.
 */
function parseArrayItemPath(
  fieldId: string | undefined,
  fieldName: string | undefined
): { nodeId: string; arrayProp: string; index: number } | null {
  if (!fieldId || !fieldName) return null
  const match = /^(.+)\[(\d+)\]\.([A-Za-z0-9_]+)$/.exec(fieldName)
  if (!match) return null
  const arrayProp = match[1]
  const index = Number(match[2])
  const subProp = match[3]
  const suffix = `array_${arrayProp}_${subProp}`
  if (!fieldId.endsWith(suffix)) return null
  return {
    nodeId: fieldId.slice(0, fieldId.length - suffix.length),
    arrayProp,
    index,
  }
}

/**
 * Reads the current value of a sibling prop on the array item that a nested
 * field belongs to (e.g. the `icon` of the same hero button). Components that
 * want this must be findable under `data.content` (a node inside a zone).
 */
function useArrayItemSibling(
  fieldId: string | undefined,
  fieldName: string | undefined,
  prop: string
): unknown {
  const data = usePuck((state) => state.appState.data)
  return useMemo(() => {
    const path = parseArrayItemPath(fieldId, fieldName)
    if (!path) return undefined
    const nodes: FlowNode[] = []
    collectNodes((data as { content?: unknown[] } | undefined)?.content, nodes)
    const node = nodes.find((candidate) => candidate.id === path.nodeId)
    const items = node?.props?.[path.arrayProp]
    const item: unknown = Array.isArray(items) ? items[path.index] : undefined
    if (!isRecord(item) || !isRecord(item.props)) return undefined
    return item.props[prop]
  }, [data, fieldId, fieldName, prop])
}

/** Icon-dependent controls render nothing until a concrete icon is picked. */
function useIconVisible(
  fieldId: string | undefined,
  fieldName: string | undefined
): boolean {
  const icon = useArrayItemSibling(fieldId, fieldName, "icon")
  return !!icon && icon !== "none"
}

/** A Select (matching `optionsField`) hidden until the item has an icon. */
export function iconDependentSelectField<
  Value extends string | number | undefined,
>(
  label: string,
  options: readonly Option<Exclude<Value, undefined>>[]
): CustomField<Value> {
  return {
    type: "custom",
    label,
    render: function IconDependentSelect(props) {
      const visible = useIconVisible(props.id, props.name)
      return visible ? <OptionsField {...props} options={options} /> : <></>
    },
  }
}

const radioPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
  fontSize: 12,
  lineHeight: 1,
  padding: "6px 10px",
  borderRadius: "var(--puck-field-radius)",
  border: "1px solid var(--puck-field-color-border)",
  background: "transparent",
  color: "var(--puck-color-text-secondary)",
  cursor: "pointer",
}

/** Mirrors Puck's "radio" control; hidden until the item has an icon. */
function IconDependentRadio<
  Value extends string | number | boolean | undefined,
>({
  field,
  options,
  name,
  id,
  value,
  onChange,
  readOnly,
}: Parameters<CustomFieldRender<Value>>[0] & {
  options: readonly Option<Value>[]
}): ReactElement {
  const visible = useIconVisible(id, name)
  if (!visible) return <></>
  return (
    <FieldLabel label={field?.label ?? name} readOnly={readOnly}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((option) => {
          const active = String(value ?? "") === String(option.value)
          return (
            <button
              key={String(option.value)}
              type="button"
              disabled={readOnly}
              onClick={() => onChange(option.value, undefined)}
              style={{
                ...radioPillStyle,
                ...(active
                  ? {
                      background: "var(--puck-color-interactive)",
                      borderColor: "var(--puck-color-interactive)",
                      color: "#ffffff",
                    }
                  : {}),
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </FieldLabel>
  )
}

/** A radio (matching Puck's native radio) hidden until the item has an icon. */
export function iconDependentRadioField<
  Value extends string | number | boolean | undefined,
>(
  label: string,
  options: Array<{ label: string; value: Value }>
): CustomField<Value> {
  return {
    type: "custom",
    label,
    render: (props) => <IconDependentRadio {...props} options={options} />,
  }
}
