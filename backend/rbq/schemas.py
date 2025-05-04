from pydantic import BaseModel


class Notification(BaseModel):
    user_id: int
    text: str
    url: str
