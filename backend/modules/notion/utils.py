from __future__ import annotations

from typing import Iterable, Union

from backend.common.schemas import Infra
from backend.modules.notion import schemas
from backend.modules.notion.consts import NOTION_QUEUE_NAME



async def send(
    *,
    infra: Infra,
    notion_data: Union[schemas.NotionTicketMessage, Iterable[schemas.NotionTicketMessage]],
) -> list[schemas.NotionTicketMessage]:
    """
    Publish ticket snapshot(s) to the Notion queue.
    """
    if isinstance(notion_data, schemas.NotionTicketMessage):
        payloads = [notion_data]
    else:
        payloads = list(notion_data)

    for payload in payloads:
        await infra.broker.publish(payload, queue=NOTION_QUEUE_NAME)

    return payloads


