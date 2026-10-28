import type { components } from "@/api/schema"

/** The viewer's own profile: handle, visibility, and the design (null until saved). */
export type ProfileSettings = components["schemas"]["ProfileSettingsResponse"]
export type ProfileSettingsUpdate =
  components["schemas"]["ProfileSettingsUpdate"]

/** A profile page as a reader gets it: the identity header and the design. */
export type Profile = components["schemas"]["ProfileResponse"]

/** A Puck document, the shape the editor and the renderer pass around. */
export type ProfileDesign = Record<string, unknown>
