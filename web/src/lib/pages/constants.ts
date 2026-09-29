/**
 * How many pages one account may own. Mirrors
 * `backend/modules/pages/constants.py`, which returns 409 at the cap.
 *
 * Client-side only so the form can explain itself before the round-trip; the
 * server's count is the one that decides.
 */
export const MAX_PAGES_PER_OWNER = 100
