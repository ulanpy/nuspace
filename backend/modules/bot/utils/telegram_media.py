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


async def download_message_images(
    bot: Bot,
    messages: list[Message],
    *,
    max_images: int = 5,
) -> list[tuple[bytes, str]]:
    """Download up to ``max_images`` usable images from Telegram messages in order."""
    images: list[tuple[bytes, str]] = []
    for message in messages:
        image = await download_message_image(bot, message)
        if image is not None:
            images.append(image)
        if len(images) == max_images:
            break
    return images
