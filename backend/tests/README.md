# Backend tests

Two kinds of test live in this backend.

- **Below the service.** The older tests under `modules/*/tests/` build a
  service or policy and mock its repositories. They need nothing running.
- **Over HTTP.** New tests drive the real app as a client would, through an
  `httpx` client on the ASGI app, with real Postgres and Meilisearch. They
  assert only on what a client sees: status codes, bodies, cookies. This
  folder holds the harness for them (`harness.py`). The worked example is
  `modules/pages/tests/test_read_page_http.py`.

## Running the suite

From the repo root, start the test stores once:

```bash
docker compose -f infra/test.docker-compose.yml up -d --wait
```

These are the compose `postgres` and `meilisearch` services under their own
project, on ports 55432 and 57700, with data on tmpfs. They never touch the
dev stack, so both can run at the same time.

Then, from `backend/`:

```bash
uv sync
uv run pytest
```

No `infra/.env` and no `PYTHONPATH` are needed: `conftest.py` sets the
environment and `pyproject.toml` puts the repo root on the path. If the stores
are down, the over-HTTP tests fail with the command above, and the tests
below the service still pass.

Stop the stores with `docker compose -f infra/test.docker-compose.yml down`.

To run two suites at once (say, in two worktrees), give each its own project and
ports, and export the same ports when running pytest:

```sh
export NUSPACE_TEST_PG_PORT=55433 NUSPACE_TEST_MEILI_PORT=57701
docker compose -p nuspace-test-2 -f infra/test.docker-compose.yml up -d --wait
```

CI (`.github/workflows/test.yml`) runs the same two commands on every push and
pull request.

## Writing a test over HTTP

Ask for a viewer and use its `client`:

```python
import pytest
from backend.tests.harness import Viewer


@pytest.mark.asyncio
async def test_a_guest_reads_a_public_page(guest: Viewer, owner: Viewer, make_page) -> None:
    await make_page(owner=owner, slug="chess-club")

    response = await guest.client.get("/api/pages/chess-club")

    assert response.status_code == 200
```

### Viewers

Each fixture yields a `Viewer`: its `kind`, its `sub` (None for the guest), and
an `httpx.AsyncClient` already signed in as it.

| Fixture | Who |
|---|---|
| `guest` | No cookies. The app builds the guest principal itself, so the shape is the one production returns. |
| `member` | Signed in, `role=default`, `scope=allowed`. |
| `banned_member` | Signed in, `scope=banned`. |
| `owner` | A member. The owner of whatever Page you make with `owner=owner`. |
| `page_admin` | A member. An admin of whatever Page you make with `admins=(page_admin,)`. |
| `site_admin` | Signed in, `role=admin`. |

Sign-in goes through the app's own `MOCK_KEYCLOAK` path. The client carries the
cookies the mock login sets, and the app looks the viewer up, reads the
`users` row the fixture stored, and issues the app token as it would in
production.

For a matrix over every viewer kind, parametrize over `VIEWER_KINDS` and take
the viewer from `viewers`:

```python
@pytest.mark.asyncio
@pytest.mark.parametrize("kind", VIEWER_KINDS)
async def test_x(viewers: dict[str, Viewer], kind: str) -> None:
    response = await viewers[kind].client.get(...)
```

`request.getfixturevalue(kind)` does not work here: it cannot start an async
fixture from inside a running async test.

### Data

- **Every test starts empty.** Before each test, `db` truncates every table a
  migration did not fill and empties every Meilisearch index. Every viewer
  fixture depends on `db`, so any test that asks for a viewer gets this.
  Reference data a migration inserts, such as `sg_ministries`, stays.
- **Arrange through the API when you can.** Otherwise write rows with the
  app's own session factory: `async with db.begin() as session: ...`
  commits on exit.
- **`make_page(...)`** stores a Page, its owner and its admins directly. It
  does not index the Page in Meilisearch. Create it through `POST /api/pages`
  if a search has to find it.
- **The database is rebuilt** from the migrations once per session.

### What is real and what is faked

- **The app is real.** It is `backend.main.app`, with its middleware and
  routers, started once per session through its own lifespan.
- **The stores are real.** Postgres and Meilisearch are the compose services.
- **Some boundaries are inert.** The lifespan's other boundaries are replaced
  in `harness._BOUNDARY_FAKES`:
  - RabbitMQ: the broker object exists but is never connected.
  - GCS: an anonymous client is built but never called.
  - The Telegram bot: `app.state.bot` is `None`.
  - The profiler and the registrar catalog sync are off.
- **Faking a client a test needs.** If a test reaches one of these, fake the
  client in that test, for example with `monkeypatch.setattr(app.state, "bot",
  FakeBot())`. Don't fake the services that call it.
- **The config is production's** (`IS_DEBUG=false`). The two exceptions are
  `MOCK_KEYCLOAK=true` and the store addresses. Clients talk to
  `https://nuspace.kz`, because outside debug the auth cookies are `Secure`.

Every async test and fixture runs on one session-wide event loop
(`pyproject.toml`), because the app is started once.
