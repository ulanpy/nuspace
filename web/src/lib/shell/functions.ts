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
