from backend.common.schemas import Infra
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationService:
    """Notification orchestration used by other modules via utils.send."""

    def __init__(self, session: AsyncSession, infra: Infra):
        self.session = session
        self.infra = infra
