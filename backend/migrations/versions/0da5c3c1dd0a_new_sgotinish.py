"""new sgotinish

Revision ID: 0da5c3c1dd0a
Revises: ac5e84afee18
Create Date: 2026-07-31 13:26:30.106938

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0da5c3c1dd0a"
down_revision: Union[str, Sequence[str], None] = "ac5e84afee18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_MINISTRIES = (
    ("education", "Minister of Education"),
    ("culture", "Minister of Culture"),
    ("research", "Minister of Research and Innovations"),
    ("residential", "Minister of Residential Life and Security"),
    ("sports", "Minister of Sports and Health"),
    ("student_rights", "Student Rights Committee"),
    ("student_fund", "Student Fund Budget Committee"),
    ("external_affairs", "Minister of External Affairs"),
)


def upgrade() -> None:
    # 1) Drop dependent tables in FK-safe order.
    op.drop_index(
        op.f("ix_message_read_status_anon_read_at"),
        table_name="message_read_status_anon",
    )
    op.drop_table("message_read_status_anon")

    op.drop_index(op.f("ix_message_read_status_read_at"), table_name="message_read_status")
    op.drop_table("message_read_status")

    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_index(op.f("ix_messages_sender_sub"), table_name="messages")
    op.drop_index(op.f("ix_messages_sent_at"), table_name="messages")
    op.drop_table("messages")

    op.drop_index(op.f("ix_conversations_created_at"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_sg_member_sub"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_status"), table_name="conversations")
    op.drop_index(op.f("ix_conversations_ticket_id"), table_name="conversations")
    op.drop_table("conversations")

    op.drop_table("ticket_access")

    # 2) New reply-routing table.
    op.create_table(
        "ticket_telegram_messages",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("ticket_id", sa.BigInteger(), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "chat_id",
            "telegram_message_id",
            name="uq_ticket_tg_msg_chat_message",
        ),
    )
    op.create_index(
        op.f("ix_ticket_telegram_messages_chat_id"),
        "ticket_telegram_messages",
        ["chat_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ticket_telegram_messages_ticket_id"),
        "ticket_telegram_messages",
        ["ticket_id"],
        unique=False,
    )

    # 3) tickets: author / assignee telegram ids.
    op.add_column("tickets", sa.Column("author_telegram_id", sa.BigInteger(), nullable=True))

    op.execute("""
        UPDATE tickets AS t
        SET author_telegram_id = u.telegram_id
        FROM users AS u
        WHERE t.author_sub = u.sub
          AND u.telegram_id IS NOT NULL
        """)

    # Anonymous / unlinked rows cannot participate in bot-first flow.
    op.execute("DELETE FROM tickets WHERE author_telegram_id IS NULL")

    op.alter_column("tickets", "author_telegram_id", nullable=False)
    op.create_index(
        op.f("ix_tickets_author_telegram_id"),
        "tickets",
        ["author_telegram_id"],
        unique=False,
    )

    op.add_column("tickets", sa.Column("assignee_telegram_id", sa.BigInteger(), nullable=True))
    op.create_index(
        op.f("ix_tickets_assignee_telegram_id"),
        "tickets",
        ["assignee_telegram_id"],
        unique=False,
    )

    op.alter_column(
        "tickets",
        "body",
        existing_type=sa.VARCHAR(),
        type_=sa.Text(),
        existing_nullable=False,
    )

    op.drop_index(op.f("ix_tickets_author_sub"), table_name="tickets")
    op.drop_index(op.f("ix_tickets_owner_hash"), table_name="tickets")
    op.drop_constraint(op.f("tickets_author_sub_fkey"), "tickets", type_="foreignkey")
    op.drop_column("tickets", "author_sub")
    op.drop_column("tickets", "owner_hash")
    op.drop_column("tickets", "is_anonymous")
    op.drop_column("tickets", "title")

    op.execute("DROP TYPE IF EXISTS conversation_status")
    op.execute("DROP TYPE IF EXISTS permission_type")

    # 4) SG ministries + new ticket categories (1:1 slug match).
    op.create_table(
        "sg_ministries",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("slug", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_sg_ministries_slug"), "sg_ministries", ["slug"], unique=False)
    op.create_index(
        op.f("ix_sg_ministries_telegram_chat_id"),
        "sg_ministries",
        ["telegram_chat_id"],
        unique=False,
    )

    ministries = sa.table(
        "sg_ministries",
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        sa.column("telegram_chat_id", sa.BigInteger),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        ministries,
        [
            {
                "slug": slug,
                "name": name,
                "telegram_chat_id": None,
                "is_active": True,
            }
            for slug, name in _MINISTRIES
        ],
    )

    # Replace ticket_category enum values (bot-first rewrite: clear legacy tickets).
    op.execute("DELETE FROM ticket_telegram_messages")
    op.execute("DELETE FROM tickets")

    op.execute("ALTER TABLE tickets ALTER COLUMN category TYPE VARCHAR USING category::text")
    op.execute("DROP TYPE IF EXISTS ticket_category")
    op.execute("""
        CREATE TYPE ticket_category AS ENUM (
            'education',
            'culture',
            'research',
            'residential',
            'sports',
            'student_rights',
            'student_fund',
            'external_affairs'
        )
        """)
    op.execute(
        "ALTER TABLE tickets ALTER COLUMN category TYPE ticket_category "
        "USING category::ticket_category"
    )

    op.add_column("tickets", sa.Column("ministry_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_tickets_ministry_id_sg_ministries",
        "tickets",
        "sg_ministries",
        ["ministry_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(op.f("ix_tickets_ministry_id"), "tickets", ["ministry_id"], unique=False)
    # Table empty after DELETE; enforce NOT NULL for new rows.
    op.alter_column("tickets", "ministry_id", nullable=False)


def downgrade() -> None:
    raise NotImplementedError("Downgrade for 0da5c3c1dd0a is not supported")
