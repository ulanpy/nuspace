export const SIDEBAR_COLLAPSED_KEY = "__nuspace_sidebar_collapsed__"

export function parseSidebarCollapsed(value: string | null): boolean {
  return value === "true"
}

export function readSidebarCollapsed(
  storage: Pick<Storage, "getItem">
): boolean {
  try {
    return parseSidebarCollapsed(storage.getItem(SIDEBAR_COLLAPSED_KEY))
  } catch {
    return false
  }
}

export function writeSidebarCollapsed(
  storage: Pick<Storage, "setItem">,
  collapsed: boolean
): void {
  try {
    storage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  } catch {
    // Storage can be unavailable in privacy modes. The in-memory state still
    // works for the current page.
  }
}
