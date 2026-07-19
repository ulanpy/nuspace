from __future__ import annotations

from io import BytesIO

from aiogram import Bot
from aiogram.types import Message


async def download_message_image(bot: Bot, message: Message) -> tuple[bytes, str] | None:
    """
    Download the largest photo (or image document) from a Telegram message.

    Returns (bytes, mime_type) or None if there is no usable image.
    """
    if message.photo:
        photo = message.photo[-1]
        buffer = BytesIO()
        await bot.download(photo, destination=buffer)
        return buffer.getvalue(), "image/jpeg"

    document = message.document
    if document is not None and document.mime_type and document.mime_type.startswith("image/"):
        buffer = BytesIO()
        await bot.download(document, destination=buffer)
        return buffer.getvalue(), document.mime_type

    return None
