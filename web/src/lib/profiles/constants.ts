import type { PageVisibilityValue } from "@/lib/pages/types"
import type { ProfileDesign } from "./types"

/**
 * The account host's own words, which no handle may be. Mirrors
 * `backend/modules/profiles/handle.py`. A handle must also pass the slug rules
 * (`lib/slug.ts`), reserved slugs included.
 */
export const ACCOUNT_RESERVED_WORDS: readonly string[] = [
  "account",
  "pages",
  "profile",
  "u",
  "me",
  "my",
  "people",
  "settings",
  "edit",
  "admin",
  "nuspace",
]

/**
 * Who reads a profile page at each tier, in the words the settings screen
 * uses. The values and their titles are the Page picker's (`PAGE_VISIBILITIES`);
 * only the sentence differs, because a profile has no admins and listing in the
 * people directory follows the same tier.
 */
export const PROFILE_VISIBILITY_COPY: Record<PageVisibilityValue, string> = {
  public:
    "Anyone, signed in or not, can open your profile and find you in the people directory.",
  internal:
    "Only signed-in NU members can open your profile and find you in the people directory.",
  private:
    "Only you and Nuspace's site admins can open your profile. Nobody can find it.",
}

/**
 * A new profile's design: About and Links, so it does not open on a blank
 * canvas. Nothing in it repeats the identity header (name, picture, handle,
 * department), which is drawn above the design from the account itself.
 *
 * Every prop a block's `defaultProps` would supply is spelled out, because Puck
 * applies those only when a block is dropped in, not to loaded data. A block's
 * `id` lives inside `props`; Puck reads it there to build the layer tree.
 */
export const NEW_PROFILE_DESIGN: ProfileDesign = {
  content: [
    {
      type: "Heading",
      props: {
        id: "profile-about-heading",
        text: "About",
        level: "2",
        align: "left",
        size: 20,
        layout: { padding: "8px" },
      },
    },
    {
      type: "RichText",
      props: {
        id: "profile-about-body",
        richtext:
          "<p>A line or two about you: what you study, what you're working on, where to find you on campus.</p>",
        size: 20,
      },
    },
    {
      type: "Heading",
      props: {
        id: "profile-links-heading",
        text: "Links",
        level: "2",
        align: "left",
        size: 20,
        layout: { padding: "8px" },
      },
    },
    {
      type: "LinkTree",
      props: {
        id: "profile-links-body",
        buttons: [
          {
            label: "GitHub",
            href: "#",
            variant: "primary",
            size: "large",
            icon: "GitHub",
            iconPosition: "left",
          },
          {
            label: "Telegram",
            href: "#",
            variant: "secondary",
            size: "large",
            icon: "Telegram",
            iconPosition: "left",
          },
        ],
        verticalGap: "16px",
        layout: { paddingX: "16px", padding: "24px" },
      },
    },
  ],
  root: {
    props: {
      backgroundColor: "#ffffff",
      textColor: "",
      accentColor: "#1d4ed8",
      fontFamily: "Inter",
      borderRadius: "12px",
    },
  },
}
