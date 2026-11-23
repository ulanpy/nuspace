"""The cutover migration that revokes every outstanding admin-invite token."""

import importlib.util
from pathlib import Path

import pytest
from backend.tests.harness import Viewer
from sqlalchemy import text

MIGRATION = (
    Path(__file__).resolve().parents[3]
    / "migrations"
    / "versions"
    / "b8c9d0e1f2a3_revoke_admin_invite_tokens.py"
)


def _revoke_statement() -> str:
    spec = importlib.util.spec_from_file_location("revoke_admin_invite_tokens", MIGRATION)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.REVOKE_ADMIN_LINKS


@pytest.mark.asyncio
async def test_the_migration_revokes_every_outstanding_admin_invite(
    owner: Viewer, member: Viewer, make_page, db
) -> None:
    tokens = []
    for slug in ("chess-club", "go-club"):
        await make_page(owner=owner, slug=slug)
        link = (await owner.client.get(f"/api/pages/{slug}/admin-link")).json()["url"]
        tokens.append(link.split("?admin=")[1])

    async with db.begin() as session:
        await session.execute(text(_revoke_statement()))

    for token in tokens:
        response = await member.client.post("/api/pages/admin-links/accept", json={"token": token})
        assert response.status_code == 410


@pytest.mark.asyncio
async def test_an_owner_can_mint_a_fresh_link_after_the_revocation(
    owner: Viewer, member: Viewer, make_page, db
) -> None:
    await make_page(owner=owner, slug="chess-club")
    await owner.client.get("/api/pages/chess-club/admin-link")
    async with db.begin() as session:
        await session.execute(text(_revoke_statement()))

    link = (await owner.client.get("/api/pages/chess-club/admin-link")).json()["url"]
    response = await member.client.post(
        "/api/pages/admin-links/accept", json={"token": link.split("?admin=")[1]}
    )

    assert response.status_code == 200
