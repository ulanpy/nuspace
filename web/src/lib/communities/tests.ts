import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Community } from "./types"
import {
  adminRowActions,
  getHttpsUrlError,
  getInstagramUrlError,
  getTelegramUrlError,
  isCommunityAdmin,
  normalizeHttpUrl,
} from "./functions"

describe("community URL validation", () => {
  it("normalizes domains without changing explicit schemes", () => {
    assert.equal(normalizeHttpUrl(" t.me/community "), "https://t.me/community")
    assert.equal(
      normalizeHttpUrl("http://t.me/community"),
      "http://t.me/community"
    )
    assert.equal(
      normalizeHttpUrl("wtf://t.me/community"),
      "wtf://t.me/community"
    )
    assert.equal(normalizeHttpUrl("  "), undefined)
  })

  it("accepts only Telegram hosts, including www", () => {
    for (const value of [
      "https://t.me/community",
      "https://www.t.me/community",
      "http://telegram.me/community",
    ]) {
      assert.equal(getTelegramUrlError(value), undefined)
    }

    for (const value of [
      "https://telegram.org/community",
      "https://evil.t.me/community",
      "https://t.me:invalid/community",
      "wtf://t.me/community",
      "https://wtf://t.me/community",
    ]) {
      assert.equal(getTelegramUrlError(value), "Enter a Telegram URL")
    }
  })

  it("accepts only Instagram hosts, including www", () => {
    for (const value of [
      "https://instagram.com/community",
      "https://www.instagram.com/community",
      "http://instagr.am/community",
    ]) {
      assert.equal(getInstagramUrlError(value), undefined)
    }

    for (const value of [
      "https://help.instagram.com/community",
      "https://evil.instagr.am/community",
      "wtf://instagram.com/community",
      "https://wtf://instagram.com/community",
    ]) {
      assert.equal(getInstagramUrlError(value), "Enter an Instagram URL")
    }
  })

  it("requires HTTPS", () => {
    assert.equal(getHttpsUrlError("https://example.com/apply"), undefined)
    assert.equal(
      getHttpsUrlError("http://example.com/apply"),
      "Enter an HTTPS URL"
    )
    assert.equal(
      getHttpsUrlError("https://wtf://example.com"),
      "Enter an HTTPS URL"
    )
  })
})

describe("adminRowActions", () => {
  const OTHER = { isSelf: false, isOwner: false }
  const SELF = { isSelf: true, isOwner: false }
  const OWNER = { isSelf: false, isOwner: true }

  it("lets an owner or site admin manage other admins", () => {
    assert.deepEqual(adminRowActions(OTHER, true), {
      canManage: true,
      canLeave: false,
    })
  })

  it("hides the owner row's controls even from an owner", () => {
    assert.deepEqual(adminRowActions(OWNER, true), {
      canManage: false,
      canLeave: false,
    })
  })

  it("offers leave on your own row instead of remove", () => {
    assert.deepEqual(adminRowActions(SELF, false), {
      canManage: false,
      canLeave: true,
    })
    // can_manage_admins is true for a site admin who is also an admin row;
    // you still may not remove yourself.
    assert.deepEqual(adminRowActions(SELF, true), {
      canManage: false,
      canLeave: true,
    })
  })

  it("shows a community admin nothing on anyone else's row", () => {
    assert.deepEqual(adminRowActions(OTHER, false), {
      canManage: false,
      canLeave: false,
    })
  })
})

describe("isCommunityAdmin", () => {
  const community = (permissions: Partial<Community["permissions"]>) =>
    ({
      permissions: {
        can_edit: false,
        can_manage_admins: false,
        ...permissions,
      },
    }) as Community

  it("is true only for a community admin", () => {
    assert.equal(isCommunityAdmin(community({ can_edit: true })), true)
  })

  it("is false for the owner and for site admins", () => {
    assert.equal(
      isCommunityAdmin(community({ can_edit: true, can_manage_admins: true })),
      false
    )
  })

  it("is false for an ordinary member", () => {
    assert.equal(isCommunityAdmin(community({})), false)
  })
})
