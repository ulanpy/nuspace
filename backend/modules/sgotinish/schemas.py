from pydantic import BaseModel, Field


class CategoryStat(BaseModel):
    slug: str
    name: str
    count: int = Field(ge=0)


class OtinishPublicStats(BaseModel):
    """Anonymous aggregate stats for the /sgotinish landing page."""

    total_tickets: int = Field(ge=0)
    answered_tickets: int = Field(ge=0, description="Tickets claimed by an SG member")
    closed_tickets: int = Field(ge=0)
    tickets_last_7_days: int = Field(ge=0)
    tickets_last_30_days: int = Field(ge=0)
    unique_students: int = Field(ge=0, description="Distinct anonymous authors")
    by_category: list[CategoryStat] = Field(default_factory=list)
