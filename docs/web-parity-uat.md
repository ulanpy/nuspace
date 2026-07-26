# `web/` parity release checklist

This is the required human acceptance gate for the first production release of
`web/`. Automated checks protect the implementation; they do not prove that a
real user can complete every legacy workflow. Every required checkbox below
must be checked against the release candidate before merge.

Do not delete `frontend/` as part of this release. It remains the rollback
fallback for one production release. Capacitor is intentionally outside the
`web/` parity scope.

## Release candidate

- Commit SHA:
- Environment and URL:
- Tester:
- Date:
- Browser and version:
- Desktop viewport:
- Mobile device or viewport:
- CI run:
- Failed checks/issues (write `none`, or link each issue):

## Automated gate

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm api:check`
- [ ] Backend tests and OpenAPI export passed in CI
- [ ] No required UAT item below is blocked, skipped, or failing

## Discovery and profile

Use `alice` for administration, `bob` for opportunity authoring, and `hassan`
for an ordinary student.

- [ ] Events can be searched and filtered by type and time period; clearing
      filters restores the unfiltered list and a copied filtered URL reloads
      with the same controls.
- [ ] Communities can be searched and filtered by type and category; clearing
      and URL reload behave as above.
- [ ] Opportunities can be searched and filtered by type, education level,
      year, major, and active-only; eligibility labels match the selected
      levels/years.
- [ ] `bob` can create and edit an opportunity, and adding it to Google
      Calendar either succeeds or shows the expected reauthentication path.
- [ ] An event detail can be shared, copied, and opened in Google Calendar with
      the correct title, time, location, and description.
- [ ] Event and community create/edit flows work with no image, one valid
      image, invalid/oversized selection, all uploads failing, and a partially
      failing upload batch; retry never creates a duplicate entity.
- [ ] A Telegram-linked user does not see the connection prompt; an unlinked
      user can follow it; dismissing it persists for that browser.
- [ ] In Telegram, the community form's native main button submits exactly
      once and is removed when the form/dialog unmounts.
- [ ] A profile with no managed communities offers the create-community action.

## Courses

Use a student with registered courses and at least two published grade reports.

- [ ] Registrar-password sync and PDF sync both refresh registered courses and
      show actionable failures.
- [ ] The weekly timetable orders classes, does not duplicate merged meetings,
      and Google/ICS exports contain the visible schedule.
- [ ] Excluding a course updates current, projected, and ceiling GPA for the
      session; re-including it restores the figures; reload resets exclusions.
- [ ] Sharing an assignment template exposes names and weights only—never
      obtained/max scores—and updates the student's previous template instead
      of duplicating it.
- [ ] Importing a classmate's template requires confirmation and produces the
      expected assignment rows without overwriting silently.
- [ ] Between two and eight grade reports can be compared on desktop and
      mobile; removal works and a ninth report is not added.

## Planner

- [ ] Create, rename, duplicate, switch, and delete plans; switching or
      reloading a copied plan URL preserves the selected plan and term.
- [ ] Add courses, load their sections, and independently select lecture/lab
      section types; genuine clashes are visible.
- [ ] Auto-build produces a schedule, and its Undo action restores every
      course's exact prior section selection, including courses with none.
- [ ] Reset names the destructive effect, can be cancelled without changes,
      and removes the current plan's courses only after confirmation.
- [ ] Catalog, course cards, and selected-section details show a syllabus link
      when the shipped CSV contains that course, and omit it otherwise.
- [ ] Term-query and plan-list failures show retryable errors; a successful
      empty plan list does not leave permanent skeletons.

## Degree audit

- [ ] Registrar-password and transcript-PDF audits both run against selected
      year/major/minor combinations and show cached results on return.
- [ ] Each programme's “View requirements” dialog shows the published
      requirement fields and retries a failed request.
- [ ] Unmatched transfer courses open the mapping step; blank rows remain
      unmatched, invalid credits are rejected, and valid NU mappings rerun the
      same audit.
- [ ] A rerun that still has unmatched courses can be mapped again.
- [ ] Password/PDF audit input is cleared after success without unmatched
      courses, skip, dialog close, mode switch, request failure, and route
      unmount; it never appears in browser storage or logs.

## SGotinish

Use `hassan` as a student, `charlie` as Head, `dana` as Executive, and `erik`
as Member.

- [ ] Student tickets filter by category and status and retain those filters in
      a copied URL.
- [ ] Normal and anonymous ticket creation both work; an anonymous WarpKey is
      kept in the URL fragment and is not stored by the browser application.
- [ ] Head, Executive, and Member cabinets expose only their permitted actions;
      category/status filtering works without changing authorization.
- [ ] Assignment, delegation, withdrawal, conversation, and completion flows
      work for their allowed roles, including confirmation and error states.
- [ ] Telegram-linked/unlinked prompt behavior matches the discovery pages.

## Sign-off and rollback

- Product sign-off:
- Engineering sign-off:
- Known non-blocking differences:

### Rollback procedure

Rolling back to `frontend/` is a revert-and-rebuild, not a traffic switch, and
it costs a full deploy cycle. Two things make it slower than it sounds:

- The VM keeps no previous build. `ansible/roles/frontend/tasks/main.yml` wipes
  `web/out/*` before unpacking, so there is no known-good artifact sitting on
  the host to re-serve.
- Nothing routes between the two apps. Prod nginx bind-mounts `../web/out`
  directly, so serving `frontend/` again requires changing that mount, not a
  config flag.

If a required item fails after deployment, stop the rollout and open a revert PR
touching these three files together — reverting any subset leaves the deploy
inconsistent:

1. `infra/prod.docker-compose.yml` — point the nginx `/var/www/my-app/out`
   mount back at `../frontend/out`.
2. `ansible/roles/frontend/tasks/main.yml` — unpack into `frontend/out` instead
   of `web/out`.
3. `.github/workflows/deploy.yml` — build `frontend/` and pack its export as
   the Ansible tarball.

Then deploy from that branch; CI rebuilds the legacy export from source. Keep
`frontend/`, its Compose service, and the fallback comments intact for this
entire soak release — the revert above assumes that code is still present.

Record the failure, the revert PR, and the rollback deployment in the release
issue before resuming.
