import { SERVICES, hostOf } from "@/lib/hosts"
import type { Service, ServiceKey } from "@/lib/hosts"

export interface LauncherItem {
  key: ServiceKey
  name: string
  /** The host the visitor is on. */
  current: boolean
}

/**
 * The launcher's grid: the six hosts in `SERVICES` order, with the one the
 * visitor is on marked. The hostname is the only input, and it is used for
 * nothing but the mark; where each tile leads is the router's business.
 */
export function launcherItems(
  hostname: string,
  services: readonly Service[] = SERVICES
): LauncherItem[] {
  const here = hostOf(hostname, services)?.service.key
  return services.map((service) => ({
    key: service.key,
    name: service.name,
    current: service.key === here,
  }))
}

/**
 * The rail rows a visitor may see. A row marked `requiresSession` is yours
 * alone, so a signed-out visitor keeps only the rows open to everyone.
 */
export function visibleSections<T extends { requiresSession?: boolean }>(
  sections: readonly T[] | undefined,
  signedIn: boolean
): readonly T[] | undefined {
  return signedIn
    ? sections
    : sections?.filter((section) => !section.requiresSession)
}
