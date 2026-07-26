import type { Media, MediaFormat } from "@/features/media/types"

/**
 * Pick one image out of an entity's media by format.
 *
 * Formats are not interchangeable, and the backend filters on them in the
 * query rather than returning everything:
 *
 *   events      → `carousel` only  (campuscurrent/events/repository.list_media)
 *   communities → `profile` and `banner`
 *
 * So asking an entity for a format it never carries renders nothing, with no
 * error anywhere — the generated types can't catch it, since `media_format` is
 * a valid value on the response either way. The first port of the event detail
 * page looked for a `banner` on an event and silently showed no poster at all.
 */
export function selectMedia(
  media: readonly Media[] | null | undefined,
  format: MediaFormat
): Media | undefined {
  return media?.find((item) => item.media_format === format)
}
