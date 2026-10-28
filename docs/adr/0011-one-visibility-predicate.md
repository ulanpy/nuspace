# ADR 0011: One Visibility Predicate

## Status

Accepted

## Context

Pages, and soon profile pages, the people directory and search, all answer the
same question: may this viewer read a record that has a Visibility tier? The
code answered it in several places that had drifted apart. The detail read
checked the tier in `PagePolicy`, the Pages directory restated it in its SQL
WHERE, and none of them looked at `users.scope`, so a banned user passed every
visibility check that reached it. A banned member was kept out of Members-only
Pages only because `get_creds_or_guest` happens to swallow the ban's 403 and
hand back a guest.

## Decision

**One predicate, `visible_to(viewer, record)`, in
`backend/modules/shared/visibility.py`, is the enforcement for every read of a
record with a Visibility tier.** A Page read by slug, the OG preview at the
Page's address (`pages.nuspace.kz/<slug>`, #431; it was by id) and both Page
lists ask it today. Profile pages, the people directory and search
are to ask it too, with no second copy.

- `public`: everyone, anonymous viewers included.
- `internal` ("Members only"): not a guest **and** `users.scope = allowed`. A
  ban removes member access.
- `private`: the record's managers and site admins. For a Page that is its
  owner and its admins. For a profile page it is the person.

A record is described to the predicate as a `RecordVisibility`: its tier, and
the subs that manage it. The guest test is `is_guest()` (#414), never an index
into the credentials tuple. A caller that is told no answers **404, never
403**, because a 403 tells a stranger the record exists. For the same reason,
any action on a record the viewer cannot read (editing a Page, deleting it,
listing its admins) answers 404 before any permission check can answer 403.
A link-preview card is the one exception to the status code, not to the rule:
a bot is never handed an error body, so a hidden record's preview is the
generic card built from the path alone, which confirms nothing either.

A list narrows its query with `tiers_open_to(viewer)`, which is the same
predicate with managers left out, and then keeps only the rows `visible_to`
admits. The query filter keeps the pager and the count honest, and the
predicate is what enforces.

**"Member" relies on configuration outside this repo.** The tier is still
called `internal`, and being signed in is what makes someone a member. That
holds only because the production Keycloak realm admits only `@nu.edu.kz`
Google accounts and has self-registration turned off. Nothing in the backend
checks the email domain. Anyone who changes the realm, by adding an identity
provider, enabling self-registration or loosening the domain restriction,
changes who can read every `internal` record.

## Considered Options

- **Push the predicate into Meilisearch filters** (#402). Rejected: `private`
  admits page admins, a join table, so every admin's sub would be denormalised
  into every document and kept in sync, with the predicate maintained twice in
  two languages. Coarse `visibility` filters may still be pushed down to stop
  underfill, but only as an optimisation.
- **Rename `internal` to `nu_only` or `members`.** Rejected: the code and API
  already say `internal` and the picker says "Members only". The dependency on
  the realm is recorded here rather than encoded in a name.
- **Let a ban reach the predicate only through `get_creds_or_guest`.**
  Rejected: that turned a banned member into a guest by accident, inside an
  `except Exception`. The scope clause makes the rule hold for any principal
  that reaches the predicate.

## Consequences

- The scope is read from the app token's claims, so a ban takes effect on
  Members-only reads when the viewer's app token is next issued, within its
  five-minute lifetime.
- A banned viewer still reads `public` records, as everyone does.
- Testing is a matrix of viewer kind × tier through the HTTP seam
  (`pages/tests/test_page_visibility_http.py`), and every hidden cell is a 404
  (the generic card, for a preview).

## Related

- ADR 0003 (backend module architecture)
- #402 (search index and per-viewer filtering), #414 (`is_guest()`), #416 (spec)
