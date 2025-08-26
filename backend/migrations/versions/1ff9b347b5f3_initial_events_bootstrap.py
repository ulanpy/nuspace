"""Initial bootstrap for events tables and enums

Revision ID: 1ff9b347b5f3
Revises: None
Create Date: 2025-08-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "1ff9b347b5f3"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- Users/Communities enums ---
    def _pg_enum_create_if_not_exists(enum_name: str, labels: list[str]) -> None:
        labels_sql = ", ".join([f"'{label}'" for label in labels])
        op.execute(
            sa.text(
                f"""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = '{enum_name}'
    ) THEN
        CREATE TYPE {enum_name} AS ENUM ({labels_sql});
    END IF;
END$$;
"""
            )
        )

    _pg_enum_create_if_not_exists("userrole", ["default", "admin", "community_admin"])
    _pg_enum_create_if_not_exists("userscope", ["allowed", "banned"])
    _pg_enum_create_if_not_exists("community_type", ["club", "university", "organization"])
    _pg_enum_create_if_not_exists(
        "community_category",
        ["academic", "professional", "recreational", "cultural", "sports", "social", "art"],
    )
    _pg_enum_create_if_not_exists(
        "community_recruitment_status", ["open", "closed", "upcoming"]
    )

    # Use non-creating enum references for columns
    userrole_t = postgresql.ENUM(name="userrole", create_type=False)
    userscope_t = postgresql.ENUM(name="userscope", create_type=False)
    community_type_t = postgresql.ENUM(name="community_type", create_type=False)
    community_category_t = postgresql.ENUM(name="community_category", create_type=False)
    community_recruitment_status_t = postgresql.ENUM(
        name="community_recruitment_status", create_type=False
    )

    # --- Users table ---
    op.create_table(
        "users",
        sa.Column("sub", sa.String(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", userrole_t, nullable=False),
        sa.Column("scope", userscope_t, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("surname", sa.String(), nullable=False),
        sa.Column("picture", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
    )

    # --- Communities table (pre-verified) ---
    op.create_table(
        "communities",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", community_type_t, nullable=False),
        sa.Column("category", community_category_t, nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("recruitment_status", community_recruitment_status_t, nullable=False),
        sa.Column("recruitment_link", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("established", sa.Date(), nullable=False),
        sa.Column("head", sa.String(), nullable=True),
        sa.Column("telegram_url", sa.String(), nullable=True),
        sa.Column("instagram_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["head"], ["users.sub"], ondelete="SET NULL"),
    )

    # --- Community related tables ---
    op.create_table(
        "community_post_tags",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
    )

    op.create_table(
        "community_posts",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("tag_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("from_community", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["tag_id"], ["community_post_tags.id"], ondelete="SET NULL"),
    )

    op.create_table(
        "community_members",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="SET NULL"),
    )

    op.create_table(
        "community_comments",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("user_sub", sa.String(), nullable=True),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["community_comments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="SET NULL"),
    )

    _pg_enum_create_if_not_exists("event_policy", ["registration", "open"])
    _pg_enum_create_if_not_exists("event_scope", ["personal", "community"])
    _pg_enum_create_if_not_exists(
        "event_type",
        ["academic", "professional", "recreational", "cultural", "sports", "social", "art"],
    )
    _pg_enum_create_if_not_exists(
        "event_status", ["pending", "approved", "rejected", "cancelled"]
    )
    _pg_enum_create_if_not_exists(
        "event_tag", ["featured", "promotional", "regular", "charity"]
    )
    _pg_enum_create_if_not_exists("collaborator_type", ["user", "community"])

    # --- Media/Product/Review enums ---
    _pg_enum_create_if_not_exists(
        "entity_type",
        [
            "products",
            "community_events",
            "communities",
            "community_posts",
            "reviews",
            "community_comments",
        ],
    )
    _pg_enum_create_if_not_exists("media_format", ["banner", "carousel", "profile"])
    _pg_enum_create_if_not_exists(
        "product_category",
        [
            "books",
            "electronics",
            "clothing",
            "furniture",
            "appliances",
            "sports",
            "stationery",
            "art_supplies",
            "beauty",
            "services",
            "food",
            "tickets",
            "transport",
            "others",
        ],
    )
    _pg_enum_create_if_not_exists("product_condition", ["new", "like_new", "used"])
    _pg_enum_create_if_not_exists("product_status", ["inactive", "active"])
    _pg_enum_create_if_not_exists("reviewable_type", ["products", "club_events"])
    _pg_enum_create_if_not_exists("owner_type", ["users", "clubs"])

    # Non-creating enum references for columns (events/media/products/reviews)
    event_policy_t = postgresql.ENUM(name="event_policy", create_type=False)
    event_scope_t = postgresql.ENUM(name="event_scope", create_type=False)
    event_type_t = postgresql.ENUM(name="event_type", create_type=False)
    event_status_t = postgresql.ENUM(name="event_status", create_type=False)
    event_tag_t = postgresql.ENUM(name="event_tag", create_type=False)
    collaborator_type_t = postgresql.ENUM(name="collaborator_type", create_type=False)

    entity_type_t = postgresql.ENUM(name="entity_type", create_type=False)
    media_format_t = postgresql.ENUM(name="media_format", create_type=False)
    product_category_t = postgresql.ENUM(name="product_category", create_type=False)
    product_condition_t = postgresql.ENUM(name="product_condition", create_type=False)
    product_status_t = postgresql.ENUM(name="product_status", create_type=False)
    reviewable_type_t = postgresql.ENUM(name="reviewable_type", create_type=False)
    owner_type_t = postgresql.ENUM(name="owner_type", create_type=False)

    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=True),
        sa.Column("creator_sub", sa.String(), nullable=True),
        sa.Column("policy", event_policy_t, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("place", sa.String(), nullable=False),
        sa.Column("event_datetime", sa.DateTime(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("scope", event_scope_t, nullable=False),
        sa.Column("type", event_type_t, nullable=False),
        sa.Column("status", event_status_t, nullable=False),
        sa.Column("tag", event_tag_t, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["creator_sub"], ["users.sub"], ondelete="SET NULL"),
    )

    op.create_table(
        "event_collaborators",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("collaborator_type", collaborator_type_t, nullable=False),
        sa.Column("user_sub", sa.String(), nullable=True),
        sa.Column("community_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
    )

    # --- Media ---
    op.create_table(
        "media",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("entity_type", entity_type_t, nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("media_format", media_format_t, nullable=False),
        sa.Column("media_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # --- Products ---
    op.create_table(
        "products",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("category", product_category_t, nullable=False),
        sa.Column("condition", product_condition_t, nullable=False),
        sa.Column("status", product_status_t, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete=None),
    )

    op.create_table(
        "product_reports",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("product_id", sa.BigInteger(), nullable=False),
        sa.Column("text", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete=None),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete=None),
    )

    # --- Reviews ---
    op.create_table(
        "reviews",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("reviewable_type", reviewable_type_t, nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("owner_type", owner_type_t, nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete=None),
    )

    op.create_table(
        "review_replies",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True, nullable=False),
        sa.Column("review_id", sa.BigInteger(), nullable=False, unique=True),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["review_id"], ["reviews.id"], ondelete=None),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete=None),
    )

    # --- Notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("notification_source", sa.String(), nullable=False),
        sa.Column("receiver_sub", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("tg_id", sa.BigInteger(), nullable=False),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["receiver_sub"], ["users.sub"], ondelete=None),
    )


def downgrade() -> None:
    bind = op.get_bind()  # type: ignore

    # Drop child tables first (reverse dependency order)
    op.drop_table("notifications")
    op.drop_table("review_replies")
    op.drop_table("reviews")
    op.drop_table("product_reports")
    op.drop_table("products")
    op.drop_table("media")
    op.drop_table("community_comments")
    op.drop_table("community_members")
    op.drop_table("community_posts")
    op.drop_table("community_post_tags")
    op.drop_table("event_collaborators")
    op.drop_table("events")
    op.drop_table("communities")
    op.drop_table("users")

    # Drop enums after dependent tables
    for enum_name in [
        "collaborator_type",
        "event_tag",
        "event_status",
        "event_type",
        "event_scope",
        "event_policy",
        "owner_type",
        "reviewable_type",
        "product_status",
        "product_condition",
        "product_category",
        "media_format",
        "entity_type",
        "community_recruitment_status",
        "community_category",
        "community_type",
        "userscope",
        "userrole",
    ]:
        op.execute(sa.text(f"DROP TYPE IF EXISTS {enum_name} CASCADE"))
