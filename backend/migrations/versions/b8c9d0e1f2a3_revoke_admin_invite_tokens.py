"""revoke every outstanding admin-invite token

Cutover to Nuspace 2.0 moves admin-invite links to `pages.nuspace.kz`, so every
link minted for the old addresses is dead. One statement revokes all that are
still live; a revoked link answers 410 and the page's owner mints a new one.

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-11-24 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REVOKE_ADMIN_LINKS = "UPDATE page_admin_links SET revoked_at = now() WHERE revoked_at IS NULL"


def upgrade() -> None:
    op.execute(REVOKE_ADMIN_LINKS)


def downgrade() -> None:
    # A revocation cannot be undone: the links were secrets and are gone.
    pass
