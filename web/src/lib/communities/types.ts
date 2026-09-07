import type { components } from "@/api/schema"

export type Community = components["schemas"]["CommunityResponse"]
export type CommunityType = components["schemas"]["CommunityType"]
export type CommunityCategory = components["schemas"]["CommunityCategory"]
export type CommunityCreate = components["schemas"]["CommunityCreateRequest"]
export type CommunityUpdate = components["schemas"]["CommunityUpdateRequest"]
export type CommunityAdmin = components["schemas"]["AdminResponse"]
export type AdminLink = components["schemas"]["AdminLinkResponse"]
export type AdminLinkAcceptResult =
  components["schemas"]["AdminLinkAcceptResponse"]
