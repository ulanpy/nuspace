import base64
import hashlib
import hmac

from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.utils import response_builder
from backend.core.configs.config import config
from backend.modules.rejection_board import schemas
from backend.modules.rejection_board.repository import RejectionBoardRepository


class RejectionBoardService:
    """
    Service layer handles anonymity and data access for rejection board posts.
    """

    def __init__(self, db_session: AsyncSession, repo: RejectionBoardRepository | None = None):
        self.repo = repo or RejectionBoardRepository(db_session)

    @staticmethod
    def _build_nickname(user_sub: str) -> str:
        secret = config.APP_JWT_SECRET_256
        digest = hmac.new(secret.encode(), user_sub.encode(), hashlib.sha256).digest()
        token = base64.b32encode(digest).decode().lower().rstrip("=")
        return f"anon-{token[:10]}"

    async def list(self, flt: schemas.RejectionBoardFilter) -> schemas.RejectionBoardListResponse:
        items, total = await self.repo.list(flt=flt)
        total_pages = response_builder.calculate_pages(count=total, size=flt.size) if flt.size else 0
        return schemas.RejectionBoardListResponse(
            items=[schemas.RejectionBoardResponseDTO.model_validate(item) for item in items],
            total=total,
            page=flt.page,
            size=flt.size,
            total_pages=total_pages,
            has_next=flt.page < total_pages,
        )

    async def create(
        self,
        *,
        payload: schemas.RejectionBoardCreateDTO,
        user_sub: str,
    ) -> schemas.RejectionBoardResponseDTO:
        nickname = self._build_nickname(user_sub)
        record = await self.repo.create(payload=payload, nickname=nickname)
        return schemas.RejectionBoardResponseDTO.model_validate(record)
