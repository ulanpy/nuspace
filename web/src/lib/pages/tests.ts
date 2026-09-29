import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { adminPageActions } from "./functions"

describe("adminPageActions", () => {
  const OTHER = { isSelf: false, isOwner: false }
  const SELF = { isSelf: true, isOwner: false }
  const OWNER = { isSelf: false, isOwner: true }

  it("lets an owner or site admin manage other admins", () => {
    assert.deepEqual(adminPageActions(OTHER, true), {
      canManage: true,
      canLeave: false,
    })
  })

  it("hides the owner row's controls even from an owner", () => {
    assert.deepEqual(adminPageActions(OWNER, true), {
      canManage: false,
      canLeave: false,
    })
  })

  it("offers leave on your own row instead of remove", () => {
    assert.deepEqual(adminPageActions(SELF, false), {
      canManage: false,
      canLeave: true,
    })
    // can_manage_admins is true for a site admin who is also an admin row;
    // you still may not remove yourself.
    assert.deepEqual(adminPageActions(SELF, true), {
      canManage: false,
      canLeave: true,
    })
  })

  it("shows a page admin nothing on anyone else's row", () => {
    assert.deepEqual(adminPageActions(OTHER, false), {
      canManage: false,
      canLeave: false,
    })
  })
})
