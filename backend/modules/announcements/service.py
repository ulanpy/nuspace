import httpx
import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

CHANNEL_URL = "https://t.me/s/nuspacechannel"

POST_ID_PATTERN = re.compile(r'data-post="[^"]+/(\d+)"')

async def get_latest_telegram_post_id() -> Optional[int]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(CHANNEL_URL, follow_redirects=True)
            response.raise_for_status()
            
            matches = POST_ID_PATTERN.findall(response.text)
            
            if not matches:
                return None
            
            latest_id = int(matches[-1])
            return latest_id

    except Exception as e:
        logger.error(f"Failed to fetch telegram posts: {e}")
        return None