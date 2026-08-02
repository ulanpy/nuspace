"""Post tickets and bridge DMs between student and ticket assignee."""

from __future__ import annotations

import html
import logging
from typing import Literal

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, User
from backend.modules.sgotinish.models import Ticket
from backend.modules.sgotinish.service import (
    OtinishService,
    is_assignee,
    is_ticket_open,
    parse_ticket_id_from_text,
)

logger = logging.getLogger(__name__)

_CHANNEL_HINT_STUDENT_WAITING = (
    "Sent to SG. We'll message you here when someone picks it up — "
    "then you can type freely.\n\n"
    "Meanwhile /close to cancel appeal."
)
_CHANNEL_HINT_ASSIGNEE = (
    "You're connected — type freely to the student.\n"
    "/close to end."
)


def ticket_hashtag(ticket_id: int) -> str:
    return f"#тикет{ticket_id}"


def claim_deeplink_payload(ticket_id: int) -> str:
    return f"otinish_t_{ticket_id}"


async def resolve_ticket_id_from_reply(
    otinish: OtinishService,
    *,
    chat_id: int,
    reply: Message | None,
) -> int | None:
    """Resolve ticket from a replied message, walking a short reply chain."""
    cursor = reply
    for _ in range(4):
        if cursor is None:
            return None
        ticket_id = await otinish.resolve_ticket_id(
            chat_id=chat_id,
            telegram_message_id=cursor.message_id,
            fallback_text=cursor.text or cursor.caption,
        )
        if ticket_id is None:
            ticket_id = parse_ticket_id_from_text(cursor.text or cursor.caption)
        if ticket_id is not None:
            return ticket_id
        cursor = cursor.reply_to_message
    return None


def dept_answer_markup(*, ticket_id: int, bot_username: str) -> InlineKeyboardMarkup:
    url = f"https://t.me/{bot_username.lstrip('@')}?start={claim_deeplink_payload(ticket_id)}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Answer",
                    url=url,
                    style="success",
                )
            ]
        ]
    )


def format_ticket_card(ticket: Ticket, *, for_dept: bool) -> str:
    tag = html.escape(ticket_hashtag(ticket.id))
    body = html.escape(ticket.body)
    category = html.escape(ticket.category.value)
    status = html.escape(ticket.status.value)
    # Dept: hashtag once in the title line (no footer duplicate).
    if for_dept:
        return (
            f"🎫 {tag}\n"
            f"Category: {category}\n"
            f"Status: {status}\n\n"
            f"{body}"
        )
    return (
        f"🎫 {tag}\n"
        f"Category: {category}\n"
        f"Status: {status}\n\n"
        f"{body}\n\n"
        f"{html.escape(_CHANNEL_HINT_STUDENT_WAITING)}"
    )


def format_channel_card(ticket: Ticket) -> str:
    tag = html.escape(ticket_hashtag(ticket.id))
    body = html.escape(ticket.body)
    category = html.escape(ticket.category.value)
    return (
        f"🎫 {tag}\n"
        f"Category: {category}\n"
        f"Status: {html.escape(ticket.status.value)}\n\n"
        f"{body}\n\n"
        f"{html.escape(_CHANNEL_HINT_ASSIGNEE)}"
    )


def ticket_ref_footer(*, ticket_id: int) -> str:
    return f"\n\n{html.escape(ticket_hashtag(ticket_id))}"


class OtinishBridgeService:
    def __init__(self, bot: Bot, otinish_service: OtinishService):
        self.bot = bot
        self.otinish = otinish_service
        self._bot_username: str | None = None

    async def bot_username(self) -> str | None:
        if self._bot_username:
            return self._bot_username
        try:
            me = await self.bot.get_me()
        except TelegramAPIError:
            logger.exception("Failed to resolve bot username for otinish Answer button")
            return None
        if not me.username:
            return None
        self._bot_username = me.username.lstrip("@")
        return self._bot_username

    async def publish_new_ticket(self, ticket: Ticket, *, user_chat_id: int) -> Message:
        """Send card to student DM and dept chat; track both message ids."""
        user_msg = await self.bot.send_message(
            user_chat_id,
            format_ticket_card(ticket, for_dept=False),
            parse_mode=ParseMode.HTML,
        )
        await self.otinish.remember_telegram_message(
            ticket_id=ticket.id,
            chat_id=user_chat_id,
            telegram_message_id=user_msg.message_id,
        )

        ministry_chat_id = await self.otinish.resolve_ministry_chat_id(ticket)
        if ministry_chat_id is None:
            logger.warning(
                "No ministry chat or TELEGRAM_CHAT_ID fallback for ticket #%s; skipping inbox post",
                ticket.id,
            )
            return user_msg

        username = await self.bot_username()
        markup = (
            dept_answer_markup(ticket_id=ticket.id, bot_username=username) if username else None
        )
        try:
            dept_msg = await self.bot.send_message(
                ministry_chat_id,
                format_ticket_card(ticket, for_dept=True),
                parse_mode=ParseMode.HTML,
                reply_markup=markup,
            )
            await self.otinish.remember_telegram_message(
                ticket_id=ticket.id,
                chat_id=ministry_chat_id,
                telegram_message_id=dept_msg.message_id,
            )
        except TelegramAPIError:
            logger.exception("Failed to post ticket #%s to ministry chat", ticket.id)

        return user_msg

    async def remember_ack(
        self,
        *,
        ticket_id: int,
        chat_id: int,
        ack: Message,
    ) -> None:
        """Track delivery acks so /close works when replying to them."""
        await self.otinish.remember_telegram_message(
            ticket_id=ticket_id,
            chat_id=chat_id,
            telegram_message_id=ack.message_id,
        )

    async def _deliver_text(
        self,
        *,
        target_chat_id: int,
        reply_to_id: int | None,
        ticket_id: int,
        html_body: str,
    ) -> Message:
        return await self.bot.send_message(
            chat_id=target_chat_id,
            text=f"{html_body}{ticket_ref_footer(ticket_id=ticket_id)}",
            parse_mode=ParseMode.HTML,
            reply_to_message_id=reply_to_id,
            disable_web_page_preview=True,
        )

    async def _deliver_media(
        self,
        message: Message,
        *,
        target_chat_id: int,
        reply_to_id: int | None,
        ticket_id: int,
        caption_html: str,
    ) -> Message:
        copied = await self.bot.copy_message(
            chat_id=target_chat_id,
            from_chat_id=message.chat.id,
            message_id=message.message_id,
            reply_to_message_id=reply_to_id,
        )
        try:
            await self.bot.edit_message_caption(
                chat_id=target_chat_id,
                message_id=copied.message_id,
                caption=f"{caption_html}{ticket_ref_footer(ticket_id=ticket_id)}",
                parse_mode=ParseMode.HTML,
            )
        except TelegramAPIError:
            logger.debug(
                "Could not attach ticket footer to bridged message %s",
                copied.message_id,
            )
        return copied

    async def _deliver_message(
        self,
        message: Message,
        *,
        target_chat_id: int,
        reply_to_id: int | None,
        ticket_id: int,
    ) -> Message:
        if message.text is not None:
            body = message.html_text or html.escape(message.text)
            return await self._deliver_text(
                target_chat_id=target_chat_id,
                reply_to_id=reply_to_id,
                ticket_id=ticket_id,
                html_body=body,
            )
        # aiogram Message has html_text but no html_caption — escape plain caption.
        caption = html.escape(message.caption) if message.caption else ""
        return await self._deliver_media(
            message,
            target_chat_id=target_chat_id,
            reply_to_id=reply_to_id,
            ticket_id=ticket_id,
            caption_html=caption,
        )

    async def _send_ticket_notice(
        self,
        *,
        chat_id: int,
        ticket_id: int,
        text: str,
        reply_to_card: bool = False,
        parse_mode: str | None = None,
    ) -> None:
        if reply_to_card:
            reply_to = await self.otinish.get_card_message_id(ticket_id=ticket_id, chat_id=chat_id)
        else:
            reply_to = await self.otinish.get_latest_message_id(
                ticket_id=ticket_id, chat_id=chat_id
            )
        try:
            msg = await self.bot.send_message(
                chat_id,
                text,
                reply_to_message_id=reply_to,
                parse_mode=parse_mode,
            )
        except TelegramAPIError:
            msg = await self.bot.send_message(chat_id, text, parse_mode=parse_mode)
        await self.otinish.remember_telegram_message(
            ticket_id=ticket_id,
            chat_id=chat_id,
            telegram_message_id=msg.message_id,
        )

    async def _strip_ministry_answer_button(self, ticket: Ticket) -> None:
        ministry_chat_id = await self.otinish.resolve_ministry_chat_id(ticket)
        if ministry_chat_id is None:
            return
        card_id = await self.otinish.get_card_message_id(
            ticket_id=ticket.id, chat_id=ministry_chat_id
        )
        if card_id is None:
            return
        try:
            await self.bot.edit_message_reply_markup(
                chat_id=ministry_chat_id,
                message_id=card_id,
                reply_markup=None,
            )
        except TelegramAPIError:
            logger.debug("Could not strip Answer button on ticket #%s card", ticket.id)

    async def notify_claimed(self, ticket: Ticket, *, claimed_by: User) -> None:
        """Ministry status + tell the student the channel is live."""
        await self._strip_ministry_answer_button(ticket)
        tag = ticket_hashtag(ticket.id)

        try:
            await self._send_ticket_notice(
                chat_id=ticket.author_telegram_id,
                ticket_id=ticket.id,
                text=(
                    f"SG picked up {tag}.\n\n"
                    f"You can type freely here now.\n\n"
                    f"Meanwhile /close to cancel appeal."
                ),
            )
        except TelegramAPIError:
            logger.exception(
                "Failed to notify student that ticket #%s was claimed", ticket.id
            )

        ministry_chat_id = await self.otinish.resolve_ministry_chat_id(ticket)
        if ministry_chat_id is None:
            return
        text = f"👤 {claimed_by.mention_html()} claimed {tag}."
        try:
            await self._send_ticket_notice(
                chat_id=ministry_chat_id,
                ticket_id=ticket.id,
                text=text,
                reply_to_card=True,
                parse_mode=ParseMode.HTML,
            )
        except TelegramAPIError:
            logger.exception("Failed to notify ministry that ticket #%s was claimed", ticket.id)

    async def notify_ticket_closed(
        self,
        ticket: Ticket,
        *,
        closed_by: Literal["student", "sg"] = "student",
    ) -> None:
        """Post a closed notice in student DM, assignee DM (if any), and dept chat."""
        tag = ticket_hashtag(ticket.id)
        if closed_by == "sg":
            student_text = (
                f"🔒 Ticket {tag} was closed by Student Government.\n"
                f"You can start a new one with /otinish.\n{tag}"
            )
            dept_text = f"🔒 {tag} closed."
        else:
            student_text = (
                f"🔒 {tag} closed. You can start a new one with /otinish."
            )
            dept_text = f"🔒 {tag} closed by the student."

        try:
            await self._send_ticket_notice(
                chat_id=ticket.author_telegram_id,
                ticket_id=ticket.id,
                text=student_text,
            )
        except TelegramAPIError:
            logger.exception("Failed to notify student that ticket #%s closed", ticket.id)

        if (
            ticket.assignee_telegram_id is not None
            and ticket.assignee_telegram_id != ticket.author_telegram_id
        ):
            try:
                await self._send_ticket_notice(
                    chat_id=ticket.assignee_telegram_id,
                    ticket_id=ticket.id,
                    text=f"🔒 {tag} closed.",
                )
            except TelegramAPIError:
                logger.exception("Failed to notify assignee that ticket #%s closed", ticket.id)

        ministry_chat_id = await self.otinish.resolve_ministry_chat_id(ticket)
        if ministry_chat_id is None:
            return
        try:
            await self._send_ticket_notice(
                chat_id=ministry_chat_id,
                ticket_id=ticket.id,
                text=dept_text,
                reply_to_card=True,
            )
        except TelegramAPIError:
            logger.exception("Failed to notify ministry that ticket #%s closed", ticket.id)

    async def close_ticket_from_command(
        self,
        message: Message,
        *,
        ticket_id: int,
        closed_by: Literal["student", "sg", "assignee"],
    ) -> None:
        """Close ticket and post notices (no extra ack on /close)."""
        try:
            if closed_by == "student":
                if message.from_user is None:
                    return
                ticket = await self.otinish.close_ticket_by_author(
                    ticket_id=ticket_id,
                    telegram_id=message.from_user.id,
                )
                notice_role: Literal["student", "sg"] = "student"
            elif closed_by == "assignee":
                if message.from_user is None:
                    return
                ticket = await self.otinish.close_ticket_by_assignee(
                    ticket_id=ticket_id,
                    telegram_id=message.from_user.id,
                )
                notice_role = "sg"
            else:
                ticket = await self.otinish.close_ticket(ticket_id)
                notice_role = "sg"
        except LookupError:
            await message.reply("Ticket not found.")
            return
        except PermissionError as exc:
            await message.reply(str(exc) or "You cannot close this ticket.")
            return
        except ValueError:
            await message.reply("This ticket is already closed.")
            return

        await self.notify_ticket_closed(ticket, closed_by=notice_role)

    async def _forward_in_channel(
        self,
        message: Message,
        *,
        ticket: Ticket,
        target_chat_id: int,
    ) -> bool:
        reply_to_id = await self.otinish.get_latest_message_id(
            ticket_id=ticket.id, chat_id=target_chat_id
        )

        async def _send(reply_to: int | None) -> Message:
            return await self._deliver_message(
                message,
                target_chat_id=target_chat_id,
                reply_to_id=reply_to,
                ticket_id=ticket.id,
            )

        try:
            delivered = await _send(reply_to_id)
        except TelegramAPIError:
            try:
                delivered = await _send(None)
            except TelegramAPIError:
                logger.exception("Failed to pipe ticket #%s to chat %s", ticket.id, target_chat_id)
                await message.reply("Could not deliver. Try again later.")
                return False

        await self.otinish.remember_telegram_message(
            ticket_id=ticket.id,
            chat_id=target_chat_id,
            telegram_message_id=delivered.message_id,
        )
        return True

    async def pipe_channel_message(self, message: Message) -> bool:
        """
        Anon-chat style: while user has an open channel, every DM goes to the other side.

        Returns True if the message was handled (including waiting/closed notices).
        """
        if message.from_user is None or message.from_user.is_bot:
            return False
        if message.chat.type != "private":
            return False
        if message.text and message.text.startswith("/"):
            return False

        ticket = await self.otinish.get_open_channel(message.from_user.id)
        if ticket is None:
            return False
        if not is_ticket_open(ticket):
            return False

        user_id = message.from_user.id
        if user_id == ticket.author_telegram_id:
            if ticket.assignee_telegram_id is None:
                await message.reply(
                    "Still waiting for SG to pick this up. "
                    "You'll be able to chat freely after they Answer — "
                    f"until then only /close works. {ticket_hashtag(ticket.id)}"
                )
                return True
            return await self._forward_in_channel(
                message,
                ticket=ticket,
                target_chat_id=ticket.assignee_telegram_id,
            )

        if is_assignee(ticket, user_id):
            return await self._forward_in_channel(
                message,
                ticket=ticket,
                target_chat_id=ticket.author_telegram_id,
            )

        return False

    async def open_channel_thread(self, message: Message, ticket: Ticket) -> Message:
        """Send ticket summary into the user's DM and track it."""
        card = await message.answer(
            format_channel_card(ticket),
            parse_mode=ParseMode.HTML,
        )
        await self.otinish.remember_telegram_message(
            ticket_id=ticket.id,
            chat_id=message.chat.id,
            telegram_message_id=card.message_id,
        )
        return card
