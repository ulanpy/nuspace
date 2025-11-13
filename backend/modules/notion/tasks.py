import logging

import httpx
from redis.asyncio import Redis
from faststream.rabbit.annotations import RabbitMessage

from backend.core.configs.config import config
from backend.modules.notion.client import NotionClient, NotionClientError
from backend.modules.notion.schemas import NotionTicketMessage
from backend.modules.notification.tasks import broker
from backend.modules.notion.consts import (
    NOTION_SYNC_REDIS_PREFIX,
    NOTION_PAGE_ID_REDIS_PREFIX,
    NOTION_PAGE_ID_TTL_SECONDS,
    NOTION_BLOCK_ID_REDIS_PREFIX,
    NOTION_BLOCK_ID_TTL_SECONDS,
    NOTION_QUEUE_NAME,
)


logger = logging.getLogger(__name__)
redis_client = Redis.from_url(config.REDIS_URL)


@broker.subscriber(NOTION_QUEUE_NAME)
async def process_ticket_sync(message: NotionTicketMessage, msg: RabbitMessage):
    sync_lock_key = f"{NOTION_SYNC_REDIS_PREFIX}:{message.database_id}:{message.ticket_id}"
    page_id_key = f"{NOTION_PAGE_ID_REDIS_PREFIX}:{message.database_id}:{message.ticket_id}"
    block_id_key = f"{NOTION_BLOCK_ID_REDIS_PREFIX}:{message.database_id}:{message.ticket_id}"
    
    try:
        async with NotionClient(token=config.INTEGRATION_SECRET) as client:
            if message.operation == "update" and message.notion_page_id:
                # Update existing page
                response = await client.update_ticket_entry(message.notion_page_id, message)
                # Store updated block ID if returned
                updated_block_id = response.get("_block_id")
                if updated_block_id:
                    normalized_block_id = updated_block_id.replace("-", "")
                    await redis_client.set(
                        block_id_key, normalized_block_id, ex=NOTION_BLOCK_ID_TTL_SECONDS
                    )
                logger.info(
                    "Notion update successful for ticket %s (page_id=%s, block_id=%s)",
                    message.ticket_id,
                    message.notion_page_id,
                    updated_block_id or "unknown",
                )
            else:
                # Create new page
                response = await client.create_ticket_entry(message)
                page_id = response.get("id")
                if page_id:
                    # Normalize page ID (remove dashes)
                    normalized_page_id = page_id.replace("-", "")
                    # Store page ID for future updates (longer TTL)
                    await redis_client.set(
                        page_id_key, normalized_page_id, ex=NOTION_PAGE_ID_TTL_SECONDS
                    )
                    
                    # Get block ID from newly created page children (first block)
                    # The create response doesn't include children, so we need to fetch them
                    try:
                        http_client = await client._ensure_client()
                        blocks_response = await http_client.get(f"/blocks/{normalized_page_id}/children")
                        if blocks_response.status_code == 200:
                            blocks_data = blocks_response.json()
                            results = blocks_data.get("results", [])
                            if results:
                                block_id = results[0].get("id")
                                if block_id:
                                    normalized_block_id = block_id.replace("-", "")
                                    await redis_client.set(
                                        block_id_key, normalized_block_id, ex=NOTION_BLOCK_ID_TTL_SECONDS
                                    )
                    except Exception as e:
                        logger.warning(
                            "Failed to retrieve block ID for ticket %s: %s",
                            message.ticket_id,
                            e,
                        )
                    
                    logger.info(
                        "Notion create successful for ticket %s (page_id=%s)",
                        message.ticket_id,
                        normalized_page_id,
                    )
                else:
                    logger.warning(
                        "Notion sync for ticket %s succeeded but no page ID returned.",
                        message.ticket_id,
                    )
    except NotionClientError as exc:
        await redis_client.delete(sync_lock_key)
        logger.warning(
            "Notion sync failed for ticket %s (operation=%s, status=%s, retryable=%s): %s",
            message.ticket_id,
            message.operation,
            exc.status_code,
            exc.retryable,
            exc,
        )
        if exc.retryable:
            await msg.nack()
        else:
            await msg.reject()
    except httpx.HTTPError as exc:
        await redis_client.delete(sync_lock_key)
        logger.warning(
            "HTTP error during Notion sync for ticket %s (operation=%s): %s",
            message.ticket_id,
            message.operation,
            exc,
        )
        await msg.nack()
    except Exception:
        await redis_client.delete(sync_lock_key)
        logger.exception(
            "Unexpected error during Notion sync for ticket %s (operation=%s)",
            message.ticket_id,
            message.operation,
        )
        await msg.nack()
    else:
        # Release sync lock on success
        await redis_client.delete(sync_lock_key)
        await msg.ack()


