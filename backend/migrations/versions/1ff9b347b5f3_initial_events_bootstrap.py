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
    userrole = postgresql.ENUM("default", "admin", "community_admin", name="userrole")
    userscope = postgresql.ENUM("allowed", "banned", name="userscope")
    community_type = postgresql.ENUM("club", "university", "organization", name="community_type")
    community_category = postgresql.ENUM(
        "academic",
        "professional",
        "recreational",
        "cultural",
        "sports",
        "social",
        "art",
        name="community_category",
    )
    community_recruitment_status = postgresql.ENUM(
        "open", "closed", "upcoming", name="community_recruitment_status"
    )

    userrole.create(bind, checkfirst=True)
    userscope.create(bind, checkfirst=True)
    community_type.create(bind, checkfirst=True)
    community_category.create(bind, checkfirst=True)
    community_recruitment_status.create(bind, checkfirst=True)

    # --- Users table ---
    op.create_table(
        "users",
        sa.Column("sub", sa.String(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column("scope", userscope, nullable=False),
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
        sa.Column("type", community_type, nullable=False),
        sa.Column("category", community_category, nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("recruitment_status", community_recruitment_status, nullable=False),
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

    event_policy = postgresql.ENUM("registration", "open", name="event_policy")
    event_scope = postgresql.ENUM("personal", "community", name="event_scope")
    event_type = postgresql.ENUM(
        "academic",
        "professional",
        "recreational",
        "cultural",
        "sports",
        "social",
        "art",
        name="event_type",
    )
    event_status = postgresql.ENUM(
        "pending", "approved", "rejected", "cancelled", name="event_status"
    )
    event_tag = postgresql.ENUM("featured", "promotional", "regular", "charity", name="event_tag")
    collaborator_type = postgresql.ENUM("user", "community", name="collaborator_type")

    event_policy.create(bind, checkfirst=True)
    event_scope.create(bind, checkfirst=True)
    event_type.create(bind, checkfirst=True)
    event_status.create(bind, checkfirst=True)
    event_tag.create(bind, checkfirst=True)
    collaborator_type.create(bind, checkfirst=True)

    # --- Media/Product/Review enums ---
    entity_type = postgresql.ENUM(
        "products",
        "community_events",
        "communities",
        "community_posts",
        "reviews",
        "community_comments",
        name="entity_type",
    )
    media_format = postgresql.ENUM("banner", "carousel", "profile", name="media_format")
    product_category = postgresql.ENUM(
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
        name="product_category",
    )
    product_condition = postgresql.ENUM("new", "like_new", "used", name="product_condition")
    product_status = postgresql.ENUM("inactive", "active", name="product_status")
    reviewable_type = postgresql.ENUM("products", "club_events", name="reviewable_type")
    owner_type = postgresql.ENUM("users", "clubs", name="owner_type")

    entity_type.create(bind, checkfirst=True)
    media_format.create(bind, checkfirst=True)
    product_category.create(bind, checkfirst=True)
    product_condition.create(bind, checkfirst=True)
    product_status.create(bind, checkfirst=True)
    reviewable_type.create(bind, checkfirst=True)
    owner_type.create(bind, checkfirst=True)

    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=True),
        sa.Column("creator_sub", sa.String(), nullable=True),
        sa.Column("policy", event_policy, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("place", sa.String(), nullable=False),
        sa.Column("event_datetime", sa.DateTime(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("duration", sa.Integer(), nullable=True),
        sa.Column("scope", event_scope, nullable=False),
        sa.Column("type", event_type, nullable=False),
        sa.Column("status", event_status, nullable=False),
        sa.Column("tag", event_tag, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["creator_sub"], ["users.sub"], ondelete="SET NULL"),
    )

    op.create_table(
        "event_collaborators",
        sa.Column("id", sa.BigInteger(), primary_key=True, nullable=False),
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("collaborator_type", collaborator_type, nullable=False),
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
        sa.Column("entity_type", entity_type, nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("media_format", media_format, nullable=False),
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
        sa.Column("category", product_category, nullable=False),
        sa.Column("condition", product_condition, nullable=False),
        sa.Column("status", product_status, nullable=False),
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
        sa.Column("reviewable_type", reviewable_type, nullable=False),
        sa.Column("entity_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("owner_type", owner_type, nullable=False),
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
