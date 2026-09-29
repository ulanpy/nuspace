import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { currentUserSchema } from "./constants.ts"
import {
  currentBrowserPath,
  loginHref,
  requestLogout,
  slugFromName,
} from "./functions.ts"

/**
 * `/me` is one opaque dict in the OpenAPI schema, so its profile fields are
 * parsed by hand. A shape that stops matching the backend takes down the whole
 * session, not one tab.
 */
describe("session profile payload", () => {
  it("parses the identity fields and ignores the ones the backend dropped", () => {
    // The user page is gone, so a stale cookie still carrying `slug` and
    // `page_content` must not fail the parse — zod strips unknown keys.
    const parsed = currentUserSchema.parse({
      sub: "user-1",
      email: "ada@example.com",
      given_name: "Ada",
      family_name: "Lovelace",
      name: "Ada Lovelace",
      picture: "",
      role: "default",
      department_id: null,
      slug: "ada-lovelace",
      page_content: {},
      media: [],
    })

    assert.equal(parsed.sub, "user-1")
    assert.equal(parsed.picture, undefined)
    assert.equal(parsed.department_id, null)
    assert.equal("slug" in parsed, false)
  })
})

describe("slugFromName", () => {
  // Every expected value here was read off the backend's `base_slug`, not
  // reasoned about: a suggestion the server then rejects is worse than none.
  const cases: [string, string][] = [
    ["Robotics Club", "robotics-club"],
    ["  NU  Fencing  ", "nu-fencing"],
    // A non-ASCII name loses the accented character and the space collapses
    // into a single hyphen — not one hyphen per character.
    ["Café Society", "caf-society"],
    // `[a-z0-9]+` collapses a run, so `---` is one separator, not three.
    ["Hello---World", "hello-world"],
    ["A  B", "a-b"],
    // Truncated at 50, and the cut lands mid-word.
    [
      "My Very Long Page Name That Exceeds Fifty Characters Easily",
      "my-very-long-page-name-that-exceeds-fifty-characte",
    ],
  ]

  for (const [name, expected] of cases) {
    it(`slugifies ${JSON.stringify(name)}`, () => {
      assert.equal(slugFromName(name), expected)
    })
  }

  it("pads a too-short slug with -page", () => {
    // The backend's length floor. `ab` is 2, which SLUG_RE would accept but
    // validate_slug rejects, so the autofill has to pad or the server 422s.
    assert.equal(slugFromName("a"), "a-page")
    assert.equal(slugFromName("ab"), "ab-page")
    assert.equal(slugFromName("N"), "n-page")
    assert.equal(slugFromName("abc"), "abc")
  })

  it("returns -page for a name that slugifies to nothing", () => {
    // The quirk worth pinning: an empty result plus "-page" still starts with
    // a hyphen, and the backend does NOT strip it. The migration reproduces
    // this, so a "fixed" version here would disagree with both.
    assert.equal(slugFromName("🎉"), "-page")
    assert.equal(slugFromName("---"), "-page")
    assert.equal(slugFromName(""), "-page")
    assert.equal(slugFromName("   "), "-page")
  })
})

describe("browser authentication transitions", () => {
  it("preserves the current deep link as a relative return path", () => {
    const current = currentBrowserPath({
      origin: "https://nuspace.kz",
      pathname: "/courses/schedule",
      search: "?plan=7",
      hash: "#monday",
    })

    assert.equal(current, "/courses/schedule?plan=7#monday")
    assert.equal(
      loginHref({
        returnTo: current,
        origin: "https://nuspace.kz",
      }),
      "/api/login?return_to=%2Fcourses%2Fschedule%3Fplan%3D7%23monday"
    )
  })

  it("normalizes same-origin absolute links and rejects external returns", () => {
    assert.equal(
      loginHref({
        returnTo: "https://nuspace.kz/events/42?from=share",
        origin: "https://nuspace.kz",
      }),
      "/api/login?return_to=%2Fevents%2F42%3Ffrom%3Dshare"
    )
    assert.equal(
      loginHref({
        returnTo: "https://attacker.example/collect",
        origin: "https://nuspace.kz",
      }),
      "/api/login?return_to=%2F"
    )
    assert.equal(
      loginHref({
        returnTo: "https://[invalid",
        origin: "https://nuspace.kz",
      }),
      "/api/login?return_to=%2F"
    )
  })

  it("marks a Google-permission login as reauthentication", () => {
    assert.equal(
      loginHref({
        returnTo: "/courses",
        origin: "https://nuspace.kz",
        reauthenticate: true,
      }),
      "/api/login?return_to=%2Fcourses&reauth=true"
    )
  })

  it("logs out through a credentialed fetch without navigating to the API", async () => {
    const calls: { input: string; init: RequestInit }[] = []
    await requestLogout(async (input, init) => {
      calls.push({ input, init })
      return {
        ok: true,
        status: 200,
        json: async () => 200,
      }
    })

    assert.deepEqual(calls, [
      {
        input: "/api/logout",
        init: { method: "GET", credentials: "include" },
      },
    ])
  })

  it("does not report a failed logout as successful", async () => {
    await assert.rejects(
      requestLogout(async () => ({
        ok: false,
        status: 403,
        json: async () => ({ detail: "revocation failed" }),
      })),
      /403.*revocation failed/
    )
  })
})
