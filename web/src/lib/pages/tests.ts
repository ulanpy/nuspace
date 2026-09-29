import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isPageAdminSort, isPageSort } from "./constants"
import { adminPageActions, pageOwnership, sortingToSearch } from "./functions"
import type { Page } from "./types"

/** Nobody's permissions. The ownership answer must not depend on these. */
const NO_PERMISSIONS: Page["permissions"] = {
  can_edit: false,
  can_delete: false,
  can_view_attendees: false,
  can_share_access: false,
  can_change_owner: false,
  can_manage_admins: false,
  can_view_admin_link: false,
  editable_fields: [],
}

/**
 * A complete, cast-free `PageResponse`.
 *
 * Typed against the generated schema on purpose: `schema.d.ts` is regenerated
 * from the backend, and a fixture built with `as unknown as Page` would keep
 * passing after a field the function reads was renamed or dropped. The two
 * fields this test is actually about — `owner` and `owner_user` — are separate
 * in the type and the API is free to disagree about them, which is the whole
 * reason `pageOwnership` exists.
 */
const pageWith = (owner: string | null, ownerUserSub?: string): Page => ({
  id: 1,
  name: "Robotics Club",
  visibility: "internal",
  slug: "robotics-club",
  page_content: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  owner,
  owner_user:
    ownerUserSub === undefined
      ? null
      : { sub: ownerUserSub, name: "Ada", surname: "L", picture: "" },
  media: [],
  permissions: NO_PERMISSIONS,
})

describe("pageOwnership", () => {
  const ME = "me"

  it("reads the owner FK", () => {
    assert.equal(pageOwnership(pageWith(ME), ME), "owner")
  })

  it("calls a page you do not own admin, because its list was already filtered", () => {
    // `/pages/mine` only ever returns pages you own or administer, so "not the
    // owner" is "admin" there. This is not a general "does this viewer
    // administer it" check and must not be used as one.
    assert.equal(pageOwnership(pageWith("someone-else"), ME), "admin")
  })

  it("treats an ownerless page as not yours", () => {
    // `owner` is `ON DELETE SET NULL`, so a page can have no owner at all.
    // `page.owner === me` is false and this must not throw.
    assert.equal(pageOwnership(pageWith(null), ME), "admin")
  })

  it("ignores owner_user when the FK disagrees", () => {
    // The regression this helper exists for. Reading `owner_user.sub` here
    // would say "owner" on all three of these, and the FK is the truth —
    // `backend/modules/pages/policy.py:26-28` compares `page.owner` and says
    // why, since the relationship is None on an ownerless page.
    assert.equal(pageOwnership(pageWith(null, ME), ME), "admin")
    assert.equal(pageOwnership(pageWith("someone-else", ME), ME), "admin")
    assert.equal(pageOwnership(pageWith(ME, "someone-else"), ME), "owner")
  })
})

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

describe("sortingToSearch", () => {
  it("turns a column click into the route's sort and order", () => {
    assert.deepEqual(
      sortingToSearch([{ id: "name", desc: true }], isPageSort),
      {
        sort: "name",
        order: "desc",
      }
    )
    assert.deepEqual(
      sortingToSearch([{ id: "visibility", desc: false }], isPageSort),
      {
        sort: "visibility",
        order: "asc",
      }
    )
  })

  it("clears the sort when the table asks for none", () => {
    // react-table's third click on an already-sorted column clears it. Writing
    // `sort: undefined, order: undefined` is what removes both from the URL —
    // returning the previous sort here would leave the chevron cycling forever.
    assert.deepEqual(sortingToSearch([], isPageSort), {
      sort: undefined,
      order: undefined,
    })
  })

  it("drops a column the API cannot sort by", () => {
    // A renamed column, or a URL someone edited. `validateSearch` would reject
    // it on the next read, but the table would flicker first.
    assert.deepEqual(
      sortingToSearch([{ id: "slug", desc: false }], isPageSort),
      {
        sort: undefined,
        order: undefined,
      }
    )
  })

  it("keeps only the first column, because the backend sorts by one", () => {
    assert.deepEqual(
      sortingToSearch(
        [
          { id: "name", desc: false },
          { id: "visibility", desc: true },
        ],
        isPageSort
      ),
      { sort: "name", order: "asc" }
    )
  })

  it("reads the admins table through the admins whitelist, not the pages one", () => {
    // "visibility" is a valid page sort and an invalid admin sort, so passing
    // the wrong guard is a type error at the call site but a wrong URL at
    // runtime if the two lists ever get mixed up.
    assert.deepEqual(
      sortingToSearch([{ id: "name", desc: true }], isPageAdminSort),
      {
        sort: "name",
        order: "desc",
      }
    )
    assert.deepEqual(
      sortingToSearch([{ id: "visibility", desc: true }], isPageAdminSort),
      { sort: undefined, order: undefined }
    )
  })
})
