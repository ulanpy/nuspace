# Nuspace 2.0: specification and implementation snapshot

Research snapshot: 2026-11-14, local branch `f/nuspace2.0` at `1dfb05f5`. GitHub issue states can change; they are not proof of deployment or acceptance. No runtime tests or staging checks were performed for this note.

## Authority and scope

[Spec #416](https://github.com/ulanpy/nuspace/issues/416) supersedes conflicting details in the earlier [map #394](https://github.com/ulanpy/nuspace/issues/394), its closed research children [#395–#412](https://github.com/ulanpy/nuspace/issues/394), and the workbench prototypes. It specifies six hosts, a shared session, search across structured content and Telegram, profile Pages, event notifications, and a single hard cutover. The spec explicitly resolves older conflicting route and profile-listing decisions; do not implement stale prototype URLs or a separate profile listing switch.

`web/ui-workbench/` is the visual record: #416 says to implement screens afresh in `web/src` against real data, without importing the workbench. Prototype fixtures, UI states, and links are not evidence of working backend features. The spec also excludes result sitelinks, profile free-text indexing, message embeddings, and redirects.

## Delivery status

The GitHub search for issues referring to #416 returned these states on the snapshot date:

- Closed: [#418](https://github.com/ulanpy/nuspace/issues/418), [#419](https://github.com/ulanpy/nuspace/issues/419), [#421](https://github.com/ulanpy/nuspace/issues/421), [#423–#430](https://github.com/ulanpy/nuspace/issues/423), [#434](https://github.com/ulanpy/nuspace/issues/434), [#438](https://github.com/ulanpy/nuspace/issues/438), [#446](https://github.com/ulanpy/nuspace/issues/446). The ranges link to their first issue; individual issues are the source for their acceptance criteria.
- Open: [#417](https://github.com/ulanpy/nuspace/issues/417), [#420](https://github.com/ulanpy/nuspace/issues/420), [#422](https://github.com/ulanpy/nuspace/issues/422), [#431–#433](https://github.com/ulanpy/nuspace/issues/431), [#435–#437](https://github.com/ulanpy/nuspace/issues/435), [#439–#445](https://github.com/ulanpy/nuspace/issues/439), [#447–#449](https://github.com/ulanpy/nuspace/issues/447). In particular, staging host/session proof #422 and production release #449 remain open.

An open issue does not mean no code exists. Local merge commits include `0b17d310` for the Pages host #431 and `1dfb05f5` for search tracer #437, even though both issues are open. The tracer has real code in [`backend/modules/search/retrieval.py`](../../backend/modules/search/retrieval.py), [`backend/modules/search/api.py`](../../backend/modules/search/api.py), and [`web/src/components/routes/search/`](../../web/src/components/routes/search/), plus HTTP and frontend test files. This is evidence of implementation, not proof that acceptance criteria pass. [#437](https://github.com/ulanpy/nuspace/issues/437) defines the lexical tracer; body search, profile search, cross-language search, Telegram and AI Overview remain separate open issues #439–#445.

Host routing remains an open acceptance boundary: [#420](https://github.com/ulanpy/nuspace/issues/420) requires generated host-specific HTML and nginx routes, wrong-host 404s, route coverage checks, and matching local behavior. [#422](https://github.com/ulanpy/nuspace/issues/422) must prove routing and shared session on staging; #416 flags underscore staging hostnames and certificate/cookie behavior as an early risk to verify.

The feature branch is not established as released by the pull requests: [#415](https://github.com/ulanpy/nuspace/pull/415) is open against `main` and describes its own narrow #411 change despite containing pre-existing branch history; [#450](https://github.com/ulanpy/nuspace/pull/450) against `dev` is closed without merge. Neither establishes a production cutover.

## Verification boundary

This note compares issue metadata, specification text, pull request metadata, local commit history and selected source paths. It does not independently audit every implementation, run the test suite, inspect CI results, or verify any deployed service. Closed issues and local merge messages are tracking evidence, not a substitute for those checks.
