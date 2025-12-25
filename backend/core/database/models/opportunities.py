from sqlalchemy import Column, Date, Integer, String, Text

from backend.core.database.models.base import Base


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(Date, nullable=True)
    steps = Column(Text, nullable=True)
    host = Column(String(256), nullable=True)
    type = Column(String(128), nullable=True)
    majors = Column(String(512), nullable=True)
    link = Column(String(1024), nullable=True)
    location = Column(String(256), nullable=True)
    eligibility = Column(Text, nullable=True)
    funding = Column(String(256), nullable=True)
