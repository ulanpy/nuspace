from sqlalchemy import Column, Date, Integer, String, Text

from backend.core.database.models.base import Base


class OpportunityDigest(Base):
    __tablename__ = "opportunities_digest"

    opp_id = Column(Integer, primary_key=True, autoincrement=True)
    opp_name = Column(String(512), nullable=False)
    opp_description = Column(Text, nullable=True)
    opp_deadline = Column(Date, nullable=True)
    opp_steps = Column(Text, nullable=True)
    opp_host = Column(String(256), nullable=True)
    opp_type = Column(String(128), nullable=True)
    opp_majors = Column(String(512), nullable=True)
    opp_link = Column(String(1024), nullable=True)
    opp_location = Column(String(256), nullable=True)
    opp_eligibility = Column(Text, nullable=True)
    opp_funding = Column(String(256), nullable=True)
