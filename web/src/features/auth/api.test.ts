import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { currentBrowserPath, loginHref, requestLogout } from "./navigation.ts"

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
