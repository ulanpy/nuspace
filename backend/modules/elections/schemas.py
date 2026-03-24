
from pydantic import BaseModel


class SurveyResponseCount(BaseModel):
    survey_responses: int
