import { useMutation } from "@tanstack/react-query"
import { z } from "zod"

import { api, unwrap } from "@/api/client"

/**
 * The confirmation grid the bot shows, in the order the backend builds it
 * (backend/modules/bot/keyboards/kb.py). `correct_number` is 1-based, so the
 * emoji to tap is `CONFIRMATION_EMOJI[correct_number - 1]`.
 *
 * This list has to stay byte-identical to the bot's. If the two drift, the site
 * tells people to tap an emoji that confirms nothing and linking just fails.
 */
const CONFIRMATION_EMOJI = [
  "🐬",
  "🦄",
  "🐖",
  "🐉",
  "🐁",
  "🐈",
  "🦍",
  "🐝",
  "🐺",
  "🐥",
] as const

/**
 * `/connect-tg` returns a bare dict with no response_model, so OpenAPI types it
 * as `unknown`. Like `/me`, it is parsed rather than asserted — see
 * features/auth/schema.ts for why those two endpoints are the exceptions.
 */
const bindResponseSchema = z.object({
  /** t.me deeplink carrying the encoded `sub&number` start payload. */
  link: z.url(),
  correct_number: z.number().int().min(1).max(CONFIRMATION_EMOJI.length),
})

export interface TelegramBindChallenge {
  link: string
  emoji: string
}

/**
 * Starts Telegram linking: the backend mints a deeplink and picks which emoji
 * confirms it. The user opens the link, the bot shows a shuffled grid, and
 * tapping the emoji shown here completes the binding.
 *
 * The sub travels in the body for the endpoint's sake, but the backend takes
 * the caller's from the session and refuses anyone else's.
 */
export function useConnectTelegram() {
  return useMutation({
    mutationFn: async (sub: string): Promise<TelegramBindChallenge> => {
      const raw = await unwrap(api.POST("/connect-tg", { body: { sub } }))
      const { link, correct_number } = bindResponseSchema.parse(raw)
      return { link, emoji: CONFIRMATION_EMOJI[correct_number - 1] }
    },
  })
}
