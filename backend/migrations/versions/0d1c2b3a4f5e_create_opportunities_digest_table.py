"""create opportunities digest table

Revision ID: 0d1c2b3a4f5e
Revises: a9e8f7d6c5b4
Create Date: 2025-02-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0d1c2b3a4f5e"
down_revision: Union[str, Sequence[str], None] = "a9e8f7d6c5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums only if they don't exist
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'education_level') THEN
                CREATE TYPE education_level AS ENUM ('UG','GrM','PhD');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_type') THEN
                CREATE TYPE opportunity_type AS ENUM ('research','internship','summer_school','forum','summit','grant','scholarship','conference');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunity_major') THEN
                CREATE TYPE opportunity_major AS ENUM (
                    'Engineering Management',
                    'Mechanical and Aerospace Engineering',
                    'Electrical and Computer Engineering',
                    'Chemical and Materials Engineering',
                    'Civil and Environmental Engineering',
                    'Biomedical Engineering',
                    'Mining Engineering',
                    'Petroleum Engineering',
                    'Robotics and Mechatronics Engineering',
                    'Computer Science',
                    'Data Science',
                    'Applied Mathematics',
                    'Mathematics',
                    'Economics',
                    'Business Administration',
                    'Finance',
                    'Life Sciences',
                    'Biological Sciences',
                    'Medical Sciences',
                    'Molecular Medicine',
                    'Pharmacology and Toxicology',
                    'Public Health',
                    'Sports Medicine and Rehabilitation',
                    'Nursing',
                    'Doctor of Medicine',
                    'A Six-Year Medical Program',
                    'Chemistry',
                    'Physics',
                    'Geosciences',
                    'Geology',
                    'Political Science and International Relations',
                    'Public Policy',
                    'Public Administration',
                    'Eurasian Studies',
                    'Sociology',
                    'Anthropology',
                    'History',
                    'Educational Leadership',
                    'Multilingual Education',
                    'World Languages, Literature and Culture'
                );
            END IF;
        END
        $$;
        """
    )

    op.create_table(
        "opportunities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("host", sa.String(length=256), nullable=True),
        sa.Column(
            "type",
            sa.Enum(
                "research",
                "internship",
                "summer_school",
                "forum",
                "summit",
                "grant",
                "scholarship",
                "conference",
                name="opportunity_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("link", sa.String(length=1024), nullable=True),
        sa.Column("location", sa.String(length=256), nullable=True),
        sa.Column("funding", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "opportunity_eligibility",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "education_level",
            sa.Enum("UG", "GrM", "PhD", name="education_level", create_type=False),
            nullable=False,
        ),
        sa.Column("year", sa.Integer(), nullable=True),
    )

    op.create_table(
        "opportunity_majors",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("opportunity_id", sa.Integer(), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "major",
            sa.Enum(
                "Engineering Management",
                "Mechanical and Aerospace Engineering",
                "Electrical and Computer Engineering",
                "Chemical and Materials Engineering",
                "Civil and Environmental Engineering",
                "Biomedical Engineering",
                "Mining Engineering",
                "Petroleum Engineering",
                "Robotics and Mechatronics Engineering",
                "Computer Science",
                "Data Science",
                "Applied Mathematics",
                "Mathematics",
                "Economics",
                "Business Administration",
                "Finance",
                "Life Sciences",
                "Biological Sciences",
                "Medical Sciences",
                "Molecular Medicine",
                "Pharmacology and Toxicology",
                "Public Health",
                "Sports Medicine and Rehabilitation",
                "Nursing",
                "Doctor of Medicine",
                "A Six-Year Medical Program",
                "Chemistry",
                "Physics",
                "Geosciences",
                "Geology",
                "Political Science and International Relations",
                "Public Policy",
                "Public Administration",
                "Eurasian Studies",
                "Sociology",
                "Anthropology",
                "History",
                "Educational Leadership",
                "Multilingual Education",
                "World Languages, Literature and Culture",
                name="opportunity_major",
                create_type=False,
            ),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("opportunity_majors")
    op.drop_table("opportunity_eligibility")
    op.drop_table("opportunities")
    op.execute("DROP TYPE IF EXISTS education_level;")
    op.execute("DROP TYPE IF EXISTS opportunity_major;")
    op.execute("DROP TYPE IF EXISTS opportunity_type;")
