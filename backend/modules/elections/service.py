
import logging

import httpx
from fastapi import HTTPException

from backend.core.configs.config import config

logger = logging.getLogger(__name__)


async def get_survey_responses_count() -> int:
    """
    Fetches the number of submitted responses for a Qualtrics survey.
    """
    if not all(
        [
            config.QUALTRICS_API_TOKEN,
            config.QUALTRICS_DATA_CENTER_ID,
            config.QUALTRICS_SURVEY_ID,
        ]
    ):
        logger.warning("Qualtrics API credentials are not fully configured.")
        return 0
    
    headers = {
        "X-API-TOKEN": config.QUALTRICS_API_TOKEN,
        "Content-Type": "application/json",
    }
    url = (
        f"https://{config.QUALTRICS_DATA_CENTER_ID}.qualtrics.com/API/v3/"
        f"surveys/{config.QUALTRICS_SURVEY_ID}"
    )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # The 'auditable' field in responseCounts represents the number of
            # completed, valid survey responses.
            if 'result' in data and 'responseCounts' in data['result']:
                return data['result']['responseCounts'].get('auditable', 0)
            
            return 0
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Qualtrics API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error connecting to Qualtrics API: {e}",
            )
