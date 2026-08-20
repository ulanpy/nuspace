from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from backend.common.datetime_utils import CAMPUS_TZ
from backend.core.configs.config import Config, config
from backend.modules.bot.schemas.event_post import ExtractedEventDraft
from backend.modules.bot.services.event_extraction_prompt import (
    build_event_extraction_system_prompt,
)
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

_NAIVE_CAMPUS_DATETIME_SCHEMA = {
    "anyOf": [
        {
            "type": "string",
            "description": (
                "Asia/Almaty wall-clock time as naive ISO-8601 YYYY-MM-DDTHH:MM:SS "
                "(no Z / offset). Backend converts to UTC for storage."
            ),
        },
        {"type": "null"},
    ],
    "default": None,
}


def build_gemini_event_response_schema() -> dict:
    """JSON schema for Gemini; datetime fields as plain strings to avoid +05:00 offsets."""
    schema = ExtractedEventDraft.model_json_schema()
    for key in ("start_datetime", "end_datetime"):
        schema["properties"][key] = _NAIVE_CAMPUS_DATETIME_SCHEMA
    return schema


_RESPONSE_SCHEMA = build_gemini_event_response_schema()


def build_gemini_client(app_config: Config | None = None) -> genai.Client:
    """Developer API (API key) locally; GCP enterprise (ADC) on prod VM."""
    cfg = app_config or config
    if cfg.gemini_use_enterprise:
        return genai.Client(
            enterprise=True,
            project=cfg.GCP_PROJECT_ID,
            location=cfg.GEMINI_LOCATION,
        )
    if not cfg.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Set GEMINI_API_KEY for local dev or GEMINI_USE_ENTERPRISE=true on GCP."
        )
    return genai.Client(api_key=cfg.GEMINI_API_KEY)


class GeminiEventExtractor:
    """Gemini generateContent client implementing EventDraftExtractor."""

    def __init__(
        self,
        *,
        app_config: Config | None = None,
        client: genai.Client | None = None,
        model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.app_config = app_config or config
        self._client = client or build_gemini_client(self.app_config)
        self.model = model or self.app_config.GEMINI_MODEL
        self.timeout = timeout

    async def extract_event_draft(
        self,
        *,
        caption: str,
        link_urls: list[str] | None = None,
        user_id: str | None = None,
    ) -> ExtractedEventDraft:
        _ = user_id  # reserved for future abuse-tracking hooks
        links = link_urls or []
        user_content = caption.strip() or "(empty caption)"
        if links:
            user_content += "\n\nDetected links:\n" + "\n".join(links)

        generation_config = types.GenerateContentConfig(
            system_instruction=build_event_extraction_system_prompt(datetime.now(CAMPUS_TZ)),
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=_RESPONSE_SCHEMA,
        )

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self._client.models.generate_content,
                    model=self.model,
                    contents=user_content,
                    config=generation_config,
                ),
                timeout=self.timeout,
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError("Gemini event extraction timed out") from exc

        content = (getattr(response, "text", None) or "").strip()
        if not content:
            raise ValueError("Gemini returned empty content")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.warning("Gemini returned non-JSON content: %s", content[:500])
            raise ValueError("Gemini returned invalid JSON") from exc

        return ExtractedEventDraft.model_validate(parsed)
