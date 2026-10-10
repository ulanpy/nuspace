# ADR 0003: Backend Module Architecture

## Status

Accepted

## Context

The backend needed a consistent pattern for organizing business logic, data access, and dependencies as the codebase grew beyond a single service.

## Decision

Each backend module is a **bounded context** with strict layering:

```
api.py          → HTTP routes, validation, calls service
service.py      → Business logic, policy checks, orchestration
repository.py   → Database access via SQLAlchemy 2.0 (no QueryBuilder)
models.py       → SQLAlchemy ORM entities (inherit Base from core)
schemas.py      → Pydantic DTOs
dependencies.py → FastAPI Depends (session, user, repo, service)
interfaces.py   → typing.Protocol ports for cross-module calls
```

**Key rules:**
- Modules never import each other's repositories or services directly — cross-module calls go through `interfaces.py` (Protocol) in the calling module, with DI implementation in `dependencies.py`
- No SQL in `dependencies.py` — only session/user/repo/service wiring
- Policy checks live in the service, not in controllers
- Repositories never commit — transaction boundary is outside the module (one commit per request)
- ORM models live in their own module (`models.py` / `models/`), never in `core/`
- Port names are **role-based** (e.g. `MediaAttachmentResolver`), not service class names

**Data flow:** API → Service → Repository → DB

## Consequences

- Clear separation of concerns within each module
- Cross-module dependencies are explicit and testable
- No circular imports between modules
- New modules follow a predictable pattern

## Related

- ADR 0004 (frontend conventions)
- ADR 0005 (frontend architecture)
