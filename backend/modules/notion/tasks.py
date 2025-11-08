import logging

import httpx
from faststream.rabbit.annotations import RabbitMessage

from backend.core.configs.config import config
from backend.modules.notion.client import NotionClient, NotionClientError
from backend.modules.notion.schemas import NotionTicketMessage
from backend.modules.notion.utils import NOTION_QUEUE_NAME
from backend.modules.notification.tasks import broker


logger = logging.getLogger(__name__)


@broker.subscriber(NOTION_QUEUE_NAME)
async def process_ticket_sync(message: NotionTicketMessage, msg: RabbitMessage):
    try:
        async with NotionClient(token=config.INTEGRATION_SECRET) as client:
            await client.create_ticket_entry(message)
    except NotionClientError as exc:
        logger.warning(
            "Notion sync failed for ticket %s (status=%s, retryable=%s): %s",
            message.ticket_id,
            exc.status_code,
            exc.retryable,
            exc,
        )
        if exc.retryable:
            await msg.nack()
        else:
            await msg.reject()
    except httpx.HTTPError as exc:
        logger.warning(
            "HTTP error during Notion sync for ticket %s: %s",
            message.ticket_id,
            exc,
        )
        await msg.nack()
    except Exception:
        logger.exception("Unexpected error during Notion sync for ticket %s", message.ticket_id)
        await msg.nack()
    else:
        await msg.ack()


