from fastapi import Request, HTTPException
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import jwt_key, JWT_ALGORITHM
from backend.common.schemas import JWTSchema


def get_jwt_data(request: Request) -> JWTSchema:
    # Extract token from cookies
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        # Decode and validate the JWT token
        payload = jwt.decode(token, jwt_key, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("email")
        sub: str = payload.get("sub")
        role: str = payload.get("role")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        print(role)
        return JWTSchema(email=email, sub=sub, role=role)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Retrieve the database session from the shared db_manager"""
    db_manager: AsyncDatabaseManager = request.app.state.db_manager
    async for session in db_manager.get_async_session():
        yield session