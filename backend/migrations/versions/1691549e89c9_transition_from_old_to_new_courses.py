"""transition from old to new courses

Revision ID: 1691549e89c9
Revises: df3b09aac8a7
Create Date: 2025-10-13 12:43:15.064640

"""
import csv
from datetime import datetime
from pathlib import Path
import re
from typing import Any, Dict, Sequence, Tuple, Union

from alembic import op
import sqlalchemy as sa

from backend.modules.courses.csv_parsers import pcc_courses_parser


# revision identifiers, used by Alembic.
revision: str = '1691549e89c9'
down_revision: Union[str, Sequence[str], None] = 'df3b09aac8a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TERM_PREFIX_ALIASES = {
    'f': 'Fall',
    'fa': 'Fall',
    'fall': 'Fall',
    'sp': 'Spring',
    'spr': 'Spring',
    's': 'Spring',
    'spring': 'Spring',
    'su': 'Summer',
    'sum': 'Summer',
    'sm': 'Summer',
    'summer': 'Summer',
    'w': 'Winter',
    'wi': 'Winter',
    'win': 'Winter',
    'winter': 'Winter',
}


def _normalize_term(term: Union[str, None]) -> Union[str, None]:
    if term is None:
        return None

    cleaned = term.strip()
    if not cleaned:
        return None

    match = re.match(r'^([A-Za-z]+)\s*(\d{4})$', cleaned)
    if not match:
        return cleaned

    prefix, year = match.groups()
    normalized_prefix = TERM_PREFIX_ALIASES.get(prefix.lower())
    if not normalized_prefix:
        return cleaned

    return f"{normalized_prefix} {year}"


def _normalize_course_code(code: Union[str, None]) -> Union[str, None]:
    if code is None:
        return None
    stripped = code.strip()
    return stripped or None


def _payload_score(payload: Dict[str, Any]) -> int:
    score = 0
    if payload.get("credits") is not None:
        score += 10
    for key in ("title", "description", "department"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            score += min(len(value), 32)
    return score


def _prefill_new_courses_table(bind: sa.Engine, new_courses_table: sa.Table) -> None:
    count_stmt = sa.select(sa.func.count()).select_from(new_courses_table)
    existing_count = bind.execute(count_stmt).scalar() or 0
    if existing_count > 0:
        return

    csv_path = Path(__file__).resolve().parents[2] / "modules" / "courses" / "csv_parsers" / "pcc_courses.csv"
    if not csv_path.exists():
        raise RuntimeError(f"Expected CSV file for new_courses prefill not found at {csv_path}")

    now = datetime.utcnow()
    deduped_rows: Dict[Tuple[Union[str, None], Union[str, None]], Dict[str, Any]] = {}

    with csv_path.open("r", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row_num, raw_row in enumerate(reader, start=2):
            row = dict(raw_row)
            try:
                registrar_id_raw = row.get("registrar_id")
                if registrar_id_raw is None or registrar_id_raw.strip() == "":
                    continue

                registrar_id = pcc_courses_parser._convert_to_int(row.get("registrar_id"))
                if registrar_id is None:
                    raise ValueError("Missing or invalid registrar_id")

                course_code = pcc_courses_parser._clean_text(
                    row.get("course_code"),
                    field_name="course_code",
                    required=True,
                    max_length=pcc_courses_parser.FIELD_LENGTHS["course_code"],
                )
                level = pcc_courses_parser._clean_text(
                    row.get("level"),
                    field_name="level",
                    required=True,
                    max_length=pcc_courses_parser.FIELD_LENGTHS["level"],
                )
                school = pcc_courses_parser._clean_text(
                    row.get("school"),
                    field_name="school",
                    required=True,
                    max_length=pcc_courses_parser.FIELD_LENGTHS["school"],
                )

                canonical_term = _normalize_term(
                    pcc_courses_parser._clean_text(
                        row.get("term"),
                        field_name="term",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["term"],
                    )
                )

                payload: Dict[str, Any] = {
                    "registrar_id": registrar_id,
                    "course_code": course_code,
                    "pre_req": pcc_courses_parser._clean_text(
                        row.get("pre_req"),
                        field_name="pre_req",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["pre_req"],
                    ),
                    "anti_req": pcc_courses_parser._clean_text(
                        row.get("anti_req"),
                        field_name="anti_req",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["anti_req"],
                    ),
                    "co_req": pcc_courses_parser._clean_text(
                        row.get("co_req"),
                        field_name="co_req",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["co_req"],
                    ),
                    "level": level,
                    "school": school,
                    "description": pcc_courses_parser._clean_text(
                        row.get("description"),
                        field_name="description",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["description"],
                    ),
                    "department": pcc_courses_parser._clean_text(
                        row.get("department"),
                        field_name="department",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["department"],
                    ),
                    "title": pcc_courses_parser._clean_text(
                        row.get("title"),
                        field_name="title",
                        required=False,
                        max_length=pcc_courses_parser.FIELD_LENGTHS["title"],
                    ),
                    "credits": pcc_courses_parser._convert_to_int(row.get("credits")),
                    "term": canonical_term,
                    "created_at": now,
                    "updated_at": now,
                }
            except Exception as exc:  # pragma: no cover - defensive error context
                raise RuntimeError(
                    f"Failed to parse new_course row {row_num}: {exc}\nRow data: {row}"
                ) from exc

            normalized_code = _normalize_course_code(payload["course_code"])
            key = (normalized_code, canonical_term)

            existing = deduped_rows.get(key)
            if existing is None:
                deduped_rows[key] = payload
            else:
                if _payload_score(payload) > _payload_score(existing):
                    deduped_rows[key] = payload

    rows_to_insert = list(deduped_rows.values())

    if rows_to_insert:
        bind.execute(sa.insert(new_courses_table), rows_to_insert)


def _enum_to_value(value: Any) -> Any:
    if value is None:
        return None
    return getattr(value, "value", value)


def _get_next_registrar_id(bind: sa.Engine, new_courses_table: sa.Table) -> int:
    max_value = bind.execute(sa.select(sa.func.max(new_courses_table.c.registrar_id))).scalar()
    if max_value is None:
        return 1
    return int(max_value) + 1


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('new_courses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('registrar_id', sa.Integer(), nullable=False),
    sa.Column('course_code', sa.String(length=128), nullable=False),
    sa.Column('pre_req', sa.String(length=2048), nullable=True),
    sa.Column('anti_req', sa.String(length=2048), nullable=True),
    sa.Column('co_req', sa.String(length=2048), nullable=True),
    sa.Column('level', sa.String(length=128), nullable=False),
    sa.Column('school', sa.String(length=128), nullable=False),
    sa.Column('description', sa.String(length=4096), nullable=True),
    sa.Column('department', sa.String(length=512), nullable=True),
    sa.Column('title', sa.String(length=512), nullable=True),
    sa.Column('credits', sa.Integer(), nullable=True),
    sa.Column('term', sa.String(length=32), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_new_courses_course_code'), 'new_courses', ['course_code'], unique=False)
    op.create_index(op.f('ix_new_courses_level'), 'new_courses', ['level'], unique=False)
    op.create_index(op.f('ix_new_courses_registrar_id'), 'new_courses', ['registrar_id'], unique=False)
    op.create_index(op.f('ix_new_courses_school'), 'new_courses', ['school'], unique=False)
    op.create_index(op.f('ix_new_courses_term'), 'new_courses', ['term'], unique=False)
    op.create_table(
        'course_mappings',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('new_course_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['new_course_id'], ['new_courses.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_course_mappings_course_id'), 'course_mappings', ['course_id'], unique=False)
    op.create_index(op.f('ix_course_mappings_new_course_id'), 'course_mappings', ['new_course_id'], unique=False)
    op.add_column('course_templates', sa.Column('new_course_id', sa.Integer(), nullable=True))
    op.drop_constraint(op.f('uq_course_templates_course_student'), 'course_templates', type_='unique')
    op.create_index(op.f('ix_course_templates_new_course_id'), 'course_templates', ['new_course_id'], unique=False)
    op.create_foreign_key(None, 'course_templates', 'new_courses', ['new_course_id'], ['id'], ondelete='CASCADE')
    op.add_column('student_courses', sa.Column('new_course_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_student_courses_new_course_id'), 'student_courses', ['new_course_id'], unique=False)
    op.create_foreign_key(None, 'student_courses', 'new_courses', ['new_course_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###

    bind = op.get_bind()

    courses_table = sa.Table('courses', sa.MetaData(), autoload_with=bind)
    new_courses_table = sa.Table('new_courses', sa.MetaData(), autoload_with=bind)
    course_mappings_table = sa.Table('course_mappings', sa.MetaData(), autoload_with=bind)

    _prefill_new_courses_table(bind, new_courses_table)

    new_course_lookup = {}
    duplicate_keys = set()

    for row in bind.execute(sa.select(
        new_courses_table.c.id,
        new_courses_table.c.course_code,
        new_courses_table.c.term,
    )):
        normalized_code = _normalize_course_code(row.course_code)
        normalized_term = _normalize_term(row.term)
        key = (normalized_code, normalized_term)
        if key in new_course_lookup and new_course_lookup[key] != row.id:
            duplicate_keys.add(key)
        new_course_lookup[key] = row.id

    if duplicate_keys:
        display_keys = ', '.join(f"{code or 'None'} / {term or 'None'}" for code, term in sorted(duplicate_keys))
        raise RuntimeError(
            "Duplicate new_courses entries detected for keys: " + display_keys
        )

    mappings_to_insert = []
    missing_mappings = []

    course_rows = list(bind.execute(sa.select(
        courses_table.c.id,
        courses_table.c.course_code,
        courses_table.c.term,
        courses_table.c.level,
        courses_table.c.school,
        courses_table.c.credits,
    )))

    missing_course_groups: Dict[Tuple[Union[str, None], Union[str, None]], list[Any]] = {}

    for row in course_rows:
        normalized_code = _normalize_course_code(row.course_code)
        normalized_term = _normalize_term(row.term)

        candidate_keys = [
            (normalized_code, normalized_term),
        ]

        if isinstance(row.term, str):
            trimmed_original = row.term.strip()
            if trimmed_original and trimmed_original != normalized_term:
                candidate_keys.append((normalized_code, trimmed_original))

        match_id = None
        for key in candidate_keys:
            if key in new_course_lookup:
                match_id = new_course_lookup[key]
                break

        if match_id is None:
            key = (normalized_code, normalized_term)
            missing_course_groups.setdefault(key, []).append(row)
            continue

        mappings_to_insert.append({
            'course_id': row.id,
            'new_course_id': match_id,
        })

    if missing_course_groups:
        now = datetime.utcnow()
        next_registrar_id = _get_next_registrar_id(bind, new_courses_table)
        pending_inserts: list[Tuple[Tuple[Union[str, None], Union[str, None]], list[Any], Dict[str, Any]]] = []

        for key, rows in sorted(missing_course_groups.items(), key=lambda item: (item[0][0] or '', item[0][1] or '')):
            sample = rows[0]
            registrar_id = next_registrar_id
            next_registrar_id += 1

            payload: Dict[str, Any] = {
                'registrar_id': registrar_id,
                'course_code': key[0],
                'pre_req': None,
                'anti_req': None,
                'co_req': None,
                'level': _enum_to_value(sample.level),
                'school': _enum_to_value(sample.school),
                'description': None,
                'department': None,
                'title': None,
                'credits': sample.credits,
                'term': key[1],
                'created_at': now,
                'updated_at': now,
            }

            pending_inserts.append((key, rows, payload))

        insert_payloads = [payload for _, _, payload in pending_inserts]
        inserted_rows = bind.execute(
            sa.insert(new_courses_table).returning(
                new_courses_table.c.id,
                new_courses_table.c.course_code,
                new_courses_table.c.term,
            ),
            insert_payloads,
        ).all()

        for (key, rows, _payload), inserted in zip(pending_inserts, inserted_rows):
            inserted_key = (
                _normalize_course_code(inserted.course_code),
                _normalize_term(inserted.term),
            )
            new_course_lookup[inserted_key] = inserted.id

            for row in rows:
                mappings_to_insert.append({
                    'course_id': row.id,
                    'new_course_id': inserted.id,
                })

    mapped_course_ids = {mapping['course_id'] for mapping in mappings_to_insert}
    missing_mappings = [row for row in course_rows if row.id not in mapped_course_ids]
    if missing_mappings:
        details = ', '.join(
            f"(id={row.id}, code={row.course_code!r}, term={row.term!r})" for row in missing_mappings[:5]
        )
        raise RuntimeError(
            "Could not determine new_course mapping for the following courses: " + details
        )

    if mappings_to_insert:
        bind.execute(sa.insert(course_mappings_table), mappings_to_insert)

    student_courses_table = sa.Table('student_courses', sa.MetaData(), autoload_with=bind)
    course_templates_table = sa.Table('course_templates', sa.MetaData(), autoload_with=bind)

    bind.execute(sa.text("""
        UPDATE student_courses AS sc
        SET new_course_id = cm.new_course_id
        FROM course_mappings AS cm
        WHERE sc.course_id = cm.course_id
    """))

    bind.execute(sa.text("""
        UPDATE course_templates AS ct
        SET new_course_id = cm.new_course_id
        FROM course_mappings AS cm
        WHERE ct.course_id = cm.course_id
    """))

    missing_sc = bind.execute(
        sa.select(sa.func.count())
        .select_from(student_courses_table)
        .where(sa.and_(
            student_courses_table.c.course_id.is_not(None),
            student_courses_table.c.new_course_id.is_(None),
        ))
    ).scalar()
    if missing_sc:
        raise RuntimeError(f"Failed to backfill {missing_sc} student_courses rows with new_course_id")

    missing_ct = bind.execute(
        sa.select(sa.func.count())
        .select_from(course_templates_table)
        .where(sa.and_(
            course_templates_table.c.course_id.is_not(None),
            course_templates_table.c.new_course_id.is_(None),
        ))
    ).scalar()
    if missing_ct:
        raise RuntimeError(f"Failed to backfill {missing_ct} course_templates rows with new_course_id")

    op.drop_constraint('student_courses_course_id_fkey', 'student_courses', type_='foreignkey')
    op.drop_index(op.f('ix_student_courses_course_id'), table_name='student_courses')
    op.drop_constraint('course_templates_course_id_fkey', 'course_templates', type_='foreignkey')
    op.drop_index(op.f('ix_course_templates_course_id'), table_name='course_templates')

    op.drop_column('student_courses', 'course_id')
    op.drop_column('course_templates', 'course_id')

    op.drop_index(op.f('ix_student_courses_new_course_id'), table_name='student_courses')
    op.alter_column('student_courses', 'new_course_id', new_column_name='course_id')
    op.alter_column('student_courses', 'course_id', existing_type=sa.Integer(), nullable=False)
    op.create_index(op.f('ix_student_courses_course_id'), 'student_courses', ['course_id'], unique=False)

    op.drop_index(op.f('ix_course_templates_new_course_id'), table_name='course_templates')
    op.alter_column('course_templates', 'new_course_id', new_column_name='course_id')
    op.alter_column('course_templates', 'course_id', existing_type=sa.Integer(), nullable=False)
    op.create_index(op.f('ix_course_templates_course_id'), 'course_templates', ['course_id'], unique=False)
    op.create_unique_constraint(
        op.f('uq_course_templates_course_student'),
        'course_templates',
        ['course_id', 'student_sub'],
        postgresql_nulls_not_distinct=False,
    )

    op.execute("ALTER TABLE student_courses RENAME CONSTRAINT student_courses_new_course_id_fkey TO student_courses_course_id_fkey")
    op.execute("ALTER TABLE course_templates RENAME CONSTRAINT course_templates_new_course_id_fkey TO course_templates_course_id_fkey")

    op.drop_index(op.f('ix_course_mappings_new_course_id'), table_name='course_mappings')
    op.drop_index(op.f('ix_course_mappings_course_id'), table_name='course_mappings')
    op.drop_table('course_mappings')

    op.drop_index(op.f('ix_courses_term'), table_name='courses')
    op.drop_index(op.f('ix_courses_school'), table_name='courses')
    op.drop_index(op.f('ix_courses_level'), table_name='courses')
    op.drop_index(op.f('ix_courses_faculty'), table_name='courses')
    op.drop_index(op.f('ix_courses_course_code'), table_name='courses')
    op.drop_table('courses')

    op.rename_table('new_courses', 'courses')

    op.execute('ALTER INDEX ix_new_courses_course_code RENAME TO ix_courses_course_code')
    op.execute('ALTER INDEX ix_new_courses_level RENAME TO ix_courses_level')
    op.execute('ALTER INDEX ix_new_courses_registrar_id RENAME TO ix_courses_registrar_id')
    op.execute('ALTER INDEX ix_new_courses_school RENAME TO ix_courses_school')
    op.execute('ALTER INDEX ix_new_courses_term RENAME TO ix_courses_term')

    op.execute('ALTER SEQUENCE IF EXISTS new_courses_id_seq RENAME TO courses_id_seq')


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'student_courses', type_='foreignkey')
    op.drop_index(op.f('ix_student_courses_new_course_id'), table_name='student_courses')
    op.drop_column('student_courses', 'new_course_id')
    op.drop_constraint(None, 'course_templates', type_='foreignkey')
    op.drop_index(op.f('ix_course_templates_new_course_id'), table_name='course_templates')
    op.create_unique_constraint(op.f('uq_course_templates_course_student'), 'course_templates', ['course_id', 'student_sub'], postgresql_nulls_not_distinct=False)
    op.drop_column('course_templates', 'new_course_id')
    op.drop_index(op.f('ix_course_mappings_new_course_id'), table_name='course_mappings')
    op.drop_index(op.f('ix_course_mappings_course_id'), table_name='course_mappings')
    op.drop_table('course_mappings')
    op.drop_index(op.f('ix_new_courses_term'), table_name='new_courses')
    op.drop_index(op.f('ix_new_courses_school'), table_name='new_courses')
    op.drop_index(op.f('ix_new_courses_registrar_id'), table_name='new_courses')
    op.drop_index(op.f('ix_new_courses_level'), table_name='new_courses')
    op.drop_index(op.f('ix_new_courses_course_code'), table_name='new_courses')
    op.drop_table('new_courses')
    # ### end Alembic commands ###
