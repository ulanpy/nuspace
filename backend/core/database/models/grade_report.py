from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class GradeReport(Base):
    __tablename__ = "grade_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_code: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    course_title: Mapped[str] = mapped_column(String(512), nullable=True)
    section: Mapped[str] = mapped_column(String(64), nullable=True)
    term: Mapped[str] = mapped_column(String(32), nullable=True, index=True)

    grades_count: Mapped[int] = mapped_column(Integer, nullable=True)
    avg_gpa: Mapped[float] = mapped_column(Numeric(4, 2), nullable=True)
    std_dev: Mapped[float] = mapped_column(Numeric(6, 3), nullable=True)
    median_gpa: Mapped[float] = mapped_column(Numeric(4, 2), nullable=True)

    pct_A: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_B: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_C: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_D: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_F: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_P: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_I: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_AU: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    pct_W_AW: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)

    letters_count: Mapped[int] = mapped_column(Integer, nullable=True)
    faculty: Mapped[str] = mapped_column(String(256), nullable=True, index=True)

    raw_row: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
