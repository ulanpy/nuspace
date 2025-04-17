from typing import Callable

from aiogram import Router, html
from aiogram.types import Message
from aiogram.filters import CommandStart, CommandObject
from aiogram.utils.deep_linking import decode_payload
from sqlalchemy.ext.asyncio import AsyncSession
from google.cloud import storage


from backend.core.database.models import Product, Media
from backend.routes.bot.keyboards.kb import kb_confirmation, user_profile_button
from backend.routes.bot.cruds import get_telegram_id, check_existance_by_sub, find_product, find_media
from backend.routes.bot.filters import EncodedDeepLinkFilter
from backend.routes.bot.utils.google_bucket import generate_download_url

router = Router()


@router.message(CommandStart(deep_link=True), EncodedDeepLinkFilter("contact"))
async def get_contact_seller(
    m: Message,
    command: CommandObject,
    db_session: AsyncSession,
    _: Callable[[str], str],
    storage_client: storage.Client
):
    payload: str = decode_payload(command.args)
    _prefix, product_id = payload.split("&")

    media: Media | None = await find_media(db_session, int(product_id))
    product: Product | None = await find_product(db_session, int(product_id))

    if not product:
        return await m.answer("Error: Not Found, missing product")
    elif product and media:
        filename: str = media.name
        url: str = await generate_download_url(storage_client, filename)
        caption: str = f"{product.name}"
        seller_user_id: int = await get_telegram_id(db_session, product.user_sub)
        await m.bot.send_photo(
            m.chat.id,
            photo=url,
            caption=caption,
            reply_markup=user_profile_button(seller_user_id, _)
        )
    elif product:
        caption: str = f"{product.name}"
        seller_user_id: int = await get_telegram_id(db_session, product.user_sub)
        await m.answer(caption, reply_markup=user_profile_button(seller_user_id, _))


@router.message(CommandStart(deep_link=True))
async def user_start_link(
        m: Message,
        command: CommandObject,
        db_session: AsyncSession,
        _: Callable[[str], str]
) -> Message:
    args = command.args
    payload: str = decode_payload(args)
    sub, confirmation_number = payload.split("&")

    if await check_existance_by_sub(session=db_session, sub=sub):
        if await get_telegram_id(session=db_session, sub=sub) is None:
            return await m.answer(_("Отлично, теперь выбери верный смайлик!"),
                                  reply_markup=kb_confirmation(sub=sub, confirmation_number=confirmation_number))
        return await m.answer(_("Ваш телеграм аккаунт уже привязан!"))
    return await m.answer(_("Некорректная ссылка"))
