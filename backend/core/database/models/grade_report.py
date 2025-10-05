from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class LevelType(PyEnum):
    GrM = "GrM"
    ND = "ND"
    PhD = "PhD"
    UG = "UG"


class SchoolType(PyEnum):
    GSB = "GSB"
    GSE = "GSE"
    GSPP = "GSPP"
    SEDS = "SEDS"
    SMG = "SMG"
    SoM = "SoM"
    SSH = "SSH"
    Other = "Other"


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

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    school: Mapped[SchoolType] = mapped_column(
        SQLEnum(SchoolType, name="school_type"), nullable=False, index=True
    )
    level: Mapped[LevelType] = mapped_column(
        SQLEnum(LevelType, name="level_type"), nullable=False, index=True
    )
    course_code: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    section: Mapped[str] = mapped_column(String(64), nullable=True)
    faculty: Mapped[str] = mapped_column(String(512), nullable=True, index=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=True)
    term: Mapped[str] = mapped_column(String(32), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    student_courses = relationship("StudentCourse", back_populates="course")
    templates = relationship("CourseTemplate", back_populates="course")


class StudentCourse(Base):
    __tablename__ = "student_courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    items = relationship(
        "CourseItem",
        back_populates="student_course",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    course = relationship("Course", back_populates="student_courses")


class CourseItem(Base):
    """
    Stores individual assignment/exam scores for a student in a course.
    """

    __tablename__ = "course_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    student_course_id: Mapped[int] = mapped_column(
        ForeignKey("student_courses.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Assignment/Exam name
    item_name: Mapped[str] = mapped_column(
        String(256), nullable=False
    )  # e.g., "Midterm Exam", "Assignment 1"

    # Weight and scoring
    total_weight_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=True
    )  # e.g., 20.00 for 20%
    max_score: Mapped[float] = mapped_column(Numeric(7, 2), nullable=True)
    obtained_score: Mapped[float] = mapped_column(Numeric(7, 2), nullable=True)
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    student_course = relationship("StudentCourse", back_populates="items")


class CourseTemplate(Base):
    __tablename__ = "course_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_sub: Mapped[str] = mapped_column(
        ForeignKey("users.sub", ondelete="CASCADE"), nullable=False, index=True
    )


    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("course_id", "student_sub", name="uq_course_templates_course_student"),
    )

    # ORM relationships
    course = relationship("Course", back_populates="templates")
    items = relationship(
        "TemplateItem",
        back_populates="template",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    student = relationship("User", back_populates="templates")

class TemplateItem(Base):
    __tablename__ = "template_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    template_id: Mapped[int] = mapped_column(
        ForeignKey("course_templates.id", ondelete="CASCADE"), nullable=False, index=True
    )

    item_name: Mapped[str] = mapped_column(String(256), nullable=False)
    total_weight_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # ORM relationships
    template = relationship("CourseTemplate", back_populates="items")
