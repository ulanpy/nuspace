from pydantic import BaseModel, EmailStr


class JWTSchema(BaseModel):
    email: EmailStr
    sub: str
    role: str
