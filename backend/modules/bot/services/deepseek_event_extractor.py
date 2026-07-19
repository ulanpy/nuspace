from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from backend.core.configs.config import config
from backend.modules.bot.schemas.event_post import ExtractedEventDraft

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You extract Nazarbayev University campus event data from Telegram posts.

Return ONLY a JSON object with these keys:
- name: string | null (short event title)
- place: string | null (room/building/platform, e.g. "9.105" or "Lichess")
- start_datetime: string | null (ISO-8601 with offset, assume Asia/Almaty +05:00 if timezone missing)
- end_datetime: string | null (ISO-8601; if only start time given, set end = start + 2 hours)
- description: string | null (cleaned post text without excessive emoji spam)
- type: one of academic, professional, recreational, cultural, sports, social, art, recruitment | null
- policy: "open" or "registration" (use registration if a signup/form/tournament join link is present)
- registration_link: string | null (best signup URL from the post or provided links)
- missing_fields: string[] (names of required fields that could not be determined:
  name, place, start_datetime, end_datetime, description, type)
- reject: boolean (true if spam, scam, adult, illegal, off-topic, or not an event)
- reject_reason: string | null

Rules:
- Do not invent a concrete date/time/place if the post does not contain it.
- Prefer registration_link from explicit URLs in the post.
- Year is 2026+ if the post omits year but gives month/day for a near-term campus event.
- Output valid JSON only. No markdown.
"""


class DeepSeekEventExtractor:
    """DeepSeek chat-completions client implementing EventDraftExtractor."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.api_key = api_key if api_key is not None else config.DEEPSEEK_API_KEY
        self.base_url = (base_url or config.DEEPSEEK_BASE_URL).rstrip("/")
        self.model = model or config.DEEPSEEK_MODEL
        self.timeout = timeout

    async def extract_event_draft(
        self,
        *,
        caption: str,
        link_urls: list[str] | None = None,
        user_id: str | None = None,
    ) -> ExtractedEventDraft:
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY is not configured")

        links = link_urls or []
        user_content = caption.strip() or "(empty caption)"
        if links:
            user_content += "\n\nDetected links:\n" + "\n".join(links)

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 2048,
            "stream": False,
        }
        if user_id:
            # DeepSeek isolation / safety review id (no PII).
            safe_user = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in user_id)[:512]
            payload["user_id"] = safe_user or None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = (
            ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
        ).strip()
        if not content:
            raise ValueError("DeepSeek returned empty content")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.warning("DeepSeek returned non-JSON content: %s", content[:500])
            raise ValueError("DeepSeek returned invalid JSON") from exc

        return ExtractedEventDraft.model_validate(parsed)
