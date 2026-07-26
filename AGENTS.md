# Nuspace.kz — Agent Guide

## Repository Layout

```
backend/       Python 3.12 / FastAPI app (package name: nuros)
web/           React 19 / Vite 8 / TypeScript SPA — the app that ships
frontend/      The previous SPA. Kept one release as a fallback; not built,
               not routed to, not deployed. Work in web/.
infra/         Docker Compose, Nginx, monitoring, service configs
terraform/     GCP infrastructure-as-code
ansible/       Deployment playbooks (runs from CI, not locally)
```

## Local Dev

```sh
cd infra
cp .env.example .env          # fill TELEGRAM_BOT_TOKEN at minimum
docker compose up --build     # starts all services
```

App at `http://localhost`. Frontend proxied to backend via Nginx (`/api` → `fastapi:8000`).

Monitoring (optional):
```sh
cd infra
docker compose --profile monitoring up -d
```

## Commands

### Backend (`backend/`)

```sh
uv sync                              # install deps (uses uv, not pip)
uv run ruff check --fix .            # lint
uv run black .                       # format (line-length=100)
uv run pytest                        # tests
```

Pre-commit hooks run `ruff --fix` then `black` automatically.

### Frontend (`web/`)

pnpm, not npm. The lockfile is `web/pnpm-lock.yaml` and CI installs with
`--frozen-lockfile`, so a dependency added with npm will fail the build.

```sh
pnpm install                         # deps
pnpm build                           # typecheck + production build → out/
pnpm dev                             # dev server on :5173
pnpm typecheck                       # tsc -b --noEmit
pnpm lint                            # oxlint, including type-aware rules
pnpm format                          # prettier, sorts Tailwind classes
pnpm test                            # node --test over src/**/*.test.ts
pnpm api:check                       # fail if src/api/schema.d.ts is stale
```

`out/`, not Vite's default `dist/` — the deployment path expects it (see
`web/vite.config.ts`).

TypeScript strict mode. `@` alias maps to `src/`. Read `web/README.md` before
changing anything there; several of its conventions are load-bearing.

## Backend Architecture

Read `backend/README.md` for full rules. Key points:

- **Modules** are bounded contexts in `backend/modules/<name>/`. Each module owns its own ORM models, API, service, repository, schemas, and dependencies.
- **Layering**: `api.py → service.py → repository.py → DB`. No SQL in dependencies, no business logic in API layer.
- **Cross-module calls**: use `Protocol` ports in `interfaces.py` (caller module owns the port), implement in `dependencies.py`. Never import another module's models or services directly.
- **Transactions**: commit/rollback at the request boundary (outside repo). Repos only `add`/`flush`/`refresh`.
- **New module checklist**: create `modules/<name>/` with api/service/repository/models/schemas/dependencies, register router in `modules/routers.py`, register ORM models in `core/database/model_registry.py`.

### Env Loading

Backend reads `infra/.env` (path resolved from `core/configs/config.py`). The `.env` is bind-mounted read-only in Docker. `PYTHONPATH=/nuros` is set in the container.

## Frontend Notes

- Build output is `out/` (not `dist/`), served by Nginx in production.
- Capacitor is configured for iOS builds (`capacitor.config.ts`). Android/iOS dirs are gitignored.
- ESLint config is minimal (`eslint:recommended` only). Code style enforced mainly by Prettier.

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, etc. Optional scope in parens: `fix(auth): resolve login redirect issue`.

## CI/CD

`.github/workflows/deploy.yml` triggers on push to `dev` (staging) or `main` (production). Deploys via Ansible to a GCP VM. Only changed services are rebuilt and redeployed.
