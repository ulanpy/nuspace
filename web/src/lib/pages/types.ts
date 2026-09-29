import type { components } from "@/api/schema"

export type Page = components["schemas"]["PageResponse"]
export type PageCreate = components["schemas"]["PageCreateRequest"]
export type PageUpdate = components["schemas"]["PageUpdateRequest"]
export type PageAdmin = components["schemas"]["AdminResponse"]
export type PageAdminPage = components["schemas"]["ListPageAdmins"]
export type AdminLink = components["schemas"]["AdminLinkResponse"]
export type AdminLinkAcceptResult =
  components["schemas"]["AdminLinkAcceptResponse"]
