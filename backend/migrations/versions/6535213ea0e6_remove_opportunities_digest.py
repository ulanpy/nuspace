"""remove opportunities digest

Revision ID: 6535213ea0e6
Revises: d5e6f7a8b9c0
Create Date: 2026-11-14 14:12:10.797368

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "6535213ea0e6"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("opportunity_eligibility")
    op.drop_table("opportunity_majors")
    op.drop_table("opportunities")
    op.execute("DROP TYPE opportunity_type")
    op.execute("DROP TYPE opportunity_major")
    op.execute("DROP TYPE education_level")


def downgrade() -> None:
    # Recreate schema only; deleted opportunity records cannot be recovered.
    op.create_table(
        "opportunities",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("name", sa.VARCHAR(length=512), autoincrement=False, nullable=False),
        sa.Column("description", sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column("deadline", sa.DATE(), autoincrement=False, nullable=True),
        sa.Column("host", sa.VARCHAR(length=256), autoincrement=False, nullable=True),
        sa.Column(
            "type",
            postgresql.ENUM(
                "RESEARCH",
                "INTERNSHIP",
                "SUMMER_SCHOOL",
                "FORUM",
                "SUMMIT",
                "GRANT",
                "SCHOLARSHIP",
                "CONFERENCE",
                name="opportunity_type",
            ),
            autoincrement=False,
            nullable=False,
        ),
        sa.Column("link", sa.VARCHAR(length=1024), autoincrement=False, nullable=True),
        sa.Column("location", sa.VARCHAR(length=256), autoincrement=False, nullable=True),
        sa.Column("funding", sa.VARCHAR(length=256), autoincrement=False, nullable=True),
        sa.Column(
            "created_at", postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False
        ),
        sa.Column(
            "updated_at", postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("opportunities_pkey")),
    )
    op.create_table(
        "opportunity_eligibility",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("opportunity_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column(
            "education_level",
            postgresql.ENUM("UG", "GRM", "PHD", name="education_level"),
            autoincrement=False,
            nullable=False,
        ),
        sa.Column("year", sa.INTEGER(), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(
            ["opportunity_id"],
            ["opportunities.id"],
            name=op.f("opportunity_eligibility_opportunity_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("opportunity_eligibility_pkey")),
    )
    op.create_table(
        "opportunity_majors",
        sa.Column("id", sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column("opportunity_id", sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column(
            "major",
            postgresql.ENUM(
                "ENGINEERING_MANAGEMENT",
                "MECHANICAL_AND_AEROSPACE_ENGINEERING",
                "ELECTRICAL_AND_COMPUTER_ENGINEERING",
                "CHEMICAL_AND_MATERIALS_ENGINEERING",
                "CIVIL_AND_ENVIRONMENTAL_ENGINEERING",
                "BIOMEDICAL_ENGINEERING",
                "MINING_ENGINEERING",
                "PETROLEUM_ENGINEERING",
                "ROBOTICS_AND_MECHATRONICS_ENGINEERING",
                "COMPUTER_SCIENCE",
                "DATA_SCIENCE",
                "APPLIED_MATHEMATICS",
                "MATHEMATICS",
                "ECONOMICS",
                "BUSINESS_ADMINISTRATION",
                "FINANCE",
                "LIFE_SCIENCES",
                "BIOLOGICAL_SCIENCES",
                "MEDICAL_SCIENCES",
                "MOLECULAR_MEDICINE",
                "PHARMACOLOGY_AND_TOXICOLOGY",
                "PUBLIC_HEALTH",
                "SPORTS_MEDICINE_AND_REHABILITATION",
                "NURSING",
                "DOCTOR_OF_MEDICINE",
                "SIX_YEAR_MEDICAL_PROGRAM",
                "CHEMISTRY",
                "PHYSICS",
                "GEOSCIENCES",
                "GEOLOGY",
                "POLITICAL_SCIENCE_AND_INTERNATIONAL_RELATIONS",
                "PUBLIC_POLICY",
                "PUBLIC_ADMINISTRATION",
                "EURASIAN_STUDIES",
                "SOCIOLOGY",
                "ANTHROPOLOGY",
                "HISTORY",
                "EDUCATIONAL_LEADERSHIP",
                "MULTILINGUAL_EDUCATION",
                "WORLD_LANGUAGES_LITERATURE_AND_CULTURE",
                name="opportunity_major",
            ),
            autoincrement=False,
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["opportunity_id"],
            ["opportunities.id"],
            name=op.f("opportunity_majors_opportunity_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("opportunity_majors_pkey")),
    )
