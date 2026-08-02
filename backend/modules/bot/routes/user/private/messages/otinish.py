"""SG Otinish: create, claim, and anon-chat style open channel pipe."""

from __future__ import annotations

from aiogram import Bot, F, Router
from aiogram.dispatcher.event.bases import UNHANDLED
from aiogram.filters import Command, CommandObject, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)
from backend.core.configs.config import config
from backend.modules.bot.keyboards.callback_factory import (
    OtinishCategoryCallback,
    OtinishCheckLinkCallback,
    OtinishCloseConfirmCallback,
)
from backend.modules.bot.services.otinish_bridge import (
    OtinishBridgeService,
    ticket_hashtag,
)
from backend.modules.sgotinish.models import TicketCategory
from backend.modules.sgotinish.service import (
    MAX_TICKET_BODY_LENGTH,
    OpenChannelExistsError,
    OtinishService,
    TicketAlreadyClaimedError,
    is_assignee,
    parse_claim_deeplink_ticket_id,
)

router = Router(name="Otinish private router")

CATEGORY_LABELS: dict[TicketCategory, str] = {
    TicketCategory.education: "Education",
    TicketCategory.culture: "Culture",
    TicketCategory.research: "Research & Innovations",
    TicketCategory.residential: "Residential Life & Security",
    TicketCategory.sports: "Sports & Health",
    TicketCategory.student_rights: "Student Rights",
    TicketCategory.student_fund: "Student Fund / Budget",
    TicketCategory.external_affairs: "External Affairs",
}


class OtinishCreateStates(StatesGroup):
    choosing_category = State()
    waiting_body = State()


class OtinishChannelStates(StatesGroup):
    """Open pipe: student or assignee — all non-command DMs go to the other side."""

    active = State()


def _site_url() -> str:
    # Telegram rejects http://localhost URL buttons; use public tunnel/prod origin.
    return config.PUBLIC_WEBHOOK_URL.rstrip("/")


def _kb_link_required() -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    site_url = _site_url()
    if site_url.startswith("https://"):
        rows.append([InlineKeyboardButton(text="Open nuspace & bind Telegram", url=site_url)])
    rows.append(
        [
            InlineKeyboardButton(
                text="Check again",
                callback_data=OtinishCheckLinkCallback().pack(),
            )
        ]
    )
    return InlineKeyboardMarkup(inline_keyboard=rows)


def _kb_categories() -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                text=label,
                callback_data=OtinishCategoryCallback(category=category.value).pack(),
            )
        ]
        for category, label in CATEGORY_LABELS.items()
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows)


async def _enter_channel(state: FSMContext, ticket_id: int) -> None:
    await state.set_state(OtinishChannelStates.active)
    await state.update_data(ticket_id=ticket_id)


async def _start_create_flow(
    message: Message,
    state: FSMContext,
    otinish_service: OtinishService,
) -> None:
    if message.from_user is None:
        return

    open_ticket = await otinish_service.get_open_channel(message.from_user.id)
    if open_ticket is not None:
        await _enter_channel(state, open_ticket.id)
        await message.answer(
            f"You already have an open channel ({ticket_hashtag(open_ticket.id)}).\n"
            "Type freely to continue, or /close to end it before starting a new appeal."
        )
        return

    await state.clear()
    linked = await otinish_service.is_linked_student(message.from_user.id)
    if not linked:
        await message.answer(
            "To submit an SG appeal you need a NU account linked to this Telegram.\n\n"
            "1. Open nuspace and bind Telegram in your profile\n"
            "2. Come back and press Check again",
            reply_markup=_kb_link_required(),
        )
        return

    await state.set_state(OtinishCreateStates.choosing_category)
    await message.answer(
        "Choose a category for your appeal:",
        reply_markup=_kb_categories(),
    )


@router.message(Command("otinish"))
async def otinish_command(
    message: Message,
    state: FSMContext,
    otinish_service: OtinishService,
) -> None:
    await _start_create_flow(message, state, otinish_service)


@router.message(CommandStart(deep_link=True), F.text.regexp(r"^/start(?:@\w+)? otinish$"))
async def otinish_start_deeplink(
    message: Message,
    state: FSMContext,
    otinish_service: OtinishService,
) -> None:
    await _start_create_flow(message, state, otinish_service)


@router.message(
    CommandStart(deep_link=True),
    F.text.regexp(r"^/start(?:@\w+)? otinish_t_\d+$"),
)
async def otinish_claim_deeplink(
    message: Message,
    command: CommandObject,
    state: FSMContext,
    otinish_service: OtinishService,
    bot: Bot,
) -> None:
    if message.from_user is None:
        return

    ticket_id = parse_claim_deeplink_ticket_id(command.args)
    if ticket_id is None:
        await message.answer("Invalid ticket link.")
        return

    bridge = OtinishBridgeService(bot, otinish_service)
    try:
        ticket, newly_claimed = await otinish_service.claim_ticket(
            ticket_id=ticket_id,
            telegram_id=message.from_user.id,
        )
    except LookupError:
        await message.answer("Ticket not found.")
        return
    except ValueError:
        await message.answer("This ticket is closed.")
        return
    except OpenChannelExistsError as exc:
        await message.answer(
            f"You already have an open channel ({ticket_hashtag(exc.ticket.id)}).\n"
            "Send /close there first, then Answer this ticket again."
        )
        return
    except TicketAlreadyClaimedError as exc:
        other_id = exc.ticket.assignee_telegram_id
        await message.answer(
            f"Ticket #{exc.ticket.id} is already claimed"
            + (f" by another SG member (id {other_id})." if other_id else ".")
        )
        return

    await _enter_channel(state, ticket.id)
    await bridge.open_channel_thread(message, ticket)
    if newly_claimed:
        await bridge.notify_claimed(ticket, claimed_by=message.from_user)


@router.callback_query(OtinishCheckLinkCallback.filter())
async def otinish_check_link(
    callback: CallbackQuery,
    state: FSMContext,
    otinish_service: OtinishService,
) -> None:
    if callback.from_user is None or callback.message is None:
        return

    linked = await otinish_service.is_linked_student(callback.from_user.id)
    if not linked:
        await callback.answer("Still not linked", show_alert=True)
        return

    await callback.answer("Linked!")
    await state.set_state(OtinishCreateStates.choosing_category)
    await callback.message.answer(
        "Choose a category for your appeal:",
        reply_markup=_kb_categories(),
    )


@router.callback_query(
    OtinishCategoryCallback.filter(),
    StateFilter(OtinishCreateStates.choosing_category),
)
async def otinish_category_chosen(
    callback: CallbackQuery,
    callback_data: OtinishCategoryCallback,
    state: FSMContext,
) -> None:
    if callback.message is None:
        return
    try:
        category = TicketCategory(callback_data.category)
    except ValueError:
        await callback.answer("Unknown category", show_alert=True)
        return

    await state.update_data(category=category.value)
    await state.set_state(OtinishCreateStates.waiting_body)
    await callback.answer()
    await callback.message.answer(
        f"Category: {CATEGORY_LABELS[category]}\n\n"
        f"Send your appeal as one message (max {MAX_TICKET_BODY_LENGTH} characters).\n"
        "Send /cancel to abort."
    )


@router.message(Command("cancel"), StateFilter(OtinishCreateStates))
async def otinish_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("Appeal creation cancelled.")


def _kb_close_confirm(*, ticket_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Yes, close",
                    callback_data=OtinishCloseConfirmCallback(
                        ticket_id=ticket_id, confirm=1
                    ).pack(),
                    style="danger",
                ),
                InlineKeyboardButton(
                    text="Cancel",
                    callback_data=OtinishCloseConfirmCallback(
                        ticket_id=ticket_id, confirm=0
                    ).pack(),
                ),
            ]
        ]
    )


def _can_close_channel(*, ticket, telegram_id: int) -> bool:
    """
    Unclaimed: student may abandon.
    Claimed: only the claimer (assignee) may close — not other SG, not student.
    """
    if ticket.assignee_telegram_id is None:
        return telegram_id == ticket.author_telegram_id
    return is_assignee(ticket, telegram_id)


@router.message(Command("close"))
async def otinish_close_ticket(
    message: Message,
    otinish_service: OtinishService,
) -> None:
    """Prompt confirmation before closing the open channel."""
    if message.from_user is None:
        return

    ticket = await otinish_service.get_open_channel(message.from_user.id)
    if ticket is None:
        await message.answer("No open channel. Start one with /otinish.")
        return

    if not _can_close_channel(ticket=ticket, telegram_id=message.from_user.id):
        await message.answer("Only the SG member who claimed this ticket can close the channel.")
        return

    await message.answer(
        f"Close channel {ticket_hashtag(ticket.id)}?\n"
        "This ends the conversation. You can't undo this.",
        reply_markup=_kb_close_confirm(ticket_id=ticket.id),
    )


@router.callback_query(OtinishCloseConfirmCallback.filter())
async def otinish_close_confirm(
    callback: CallbackQuery,
    callback_data: OtinishCloseConfirmCallback,
    state: FSMContext,
    otinish_service: OtinishService,
    bot: Bot,
) -> None:
    if callback.from_user is None or callback.message is None:
        return

    if callback_data.confirm != 1:
        await callback.answer("Cancelled")
        try:
            await callback.message.edit_text("Close cancelled.")
        except Exception:
            await callback.message.answer("Close cancelled.")
        return

    ticket = await otinish_service.get_ticket(callback_data.ticket_id)
    if ticket is None:
        await callback.answer("Ticket not found", show_alert=True)
        return

    open_ticket = await otinish_service.get_open_channel(callback.from_user.id)
    if open_ticket is None or open_ticket.id != ticket.id:
        await callback.answer("No open channel for this ticket", show_alert=True)
        return

    if not _can_close_channel(ticket=ticket, telegram_id=callback.from_user.id):
        await callback.answer("You cannot close this ticket", show_alert=True)
        return

    bridge = OtinishBridgeService(bot, otinish_service)
    closed_by = "student" if callback.from_user.id == ticket.author_telegram_id else "assignee"
    try:
        if closed_by == "student":
            closed = await otinish_service.close_ticket_by_author(
                ticket_id=ticket.id,
                telegram_id=callback.from_user.id,
            )
        else:
            closed = await otinish_service.close_ticket_by_assignee(
                ticket_id=ticket.id,
                telegram_id=callback.from_user.id,
            )
    except (LookupError, PermissionError, ValueError) as exc:
        await callback.answer(str(exc) or "Could not close", show_alert=True)
        return

    await bridge.notify_ticket_closed(
        closed, closed_by="student" if closed_by == "student" else "sg"
    )
    await state.clear()
    await callback.answer("Closed")
    try:
        await callback.message.edit_text(
            f"Channel closed ({ticket_hashtag(ticket.id)}). " "Bot features work as usual again."
        )
    except Exception:
        await callback.message.answer(
            f"Channel closed ({ticket_hashtag(ticket.id)}). " "Bot features work as usual again."
        )


@router.message(StateFilter(OtinishCreateStates.waiting_body), F.text)
async def otinish_body_received(
    message: Message,
    state: FSMContext,
    otinish_service: OtinishService,
    bot: Bot,
) -> None:
    if message.from_user is None or not message.text:
        return

    data = await state.get_data()
    category_raw = data.get("category")
    if not category_raw:
        await state.clear()
        await message.answer("Session expired. Start again with /otinish.")
        return

    try:
        category = TicketCategory(category_raw)
        ticket = await otinish_service.create_ticket_from_telegram(
            telegram_id=message.from_user.id,
            category=category,
            body=message.text,
        )
    except OpenChannelExistsError as exc:
        await _enter_channel(state, exc.ticket.id)
        await message.answer(
            f"You already have an open channel ({ticket_hashtag(exc.ticket.id)}).\n"
            "Type freely, or /close to end it."
        )
        return
    except PermissionError:
        await state.clear()
        await message.answer(
            "Your Telegram is not linked to a NU account.",
            reply_markup=_kb_link_required(),
        )
        return
    except ValueError as exc:
        await message.answer(str(exc))
        return

    bridge = OtinishBridgeService(bot, otinish_service)
    await bridge.publish_new_ticket(ticket, user_chat_id=message.chat.id)
    await _enter_channel(state, ticket.id)


@router.message(StateFilter(OtinishCreateStates.waiting_body))
async def otinish_body_non_text(message: Message) -> None:
    await message.answer("Please send a text message, or /cancel.")


@router.message()
async def otinish_channel_pipe(
    message: Message,
    state: FSMContext,
    otinish_service: OtinishService,
    bot: Bot,
) -> None:
    """
    While an open channel exists for this user, pipe DMs to the other side.
    Source of truth is DB (survives bot restart); FSM is kept in sync.
    """
    if message.from_user is None or message.from_user.is_bot:
        return UNHANDLED
    if message.text and message.text.startswith("/"):
        return UNHANDLED

    # Don't steal the create-flow body step.
    current = await state.get_state()
    if current in {
        OtinishCreateStates.choosing_category.state,
        OtinishCreateStates.waiting_body.state,
    }:
        return UNHANDLED

    ticket = await otinish_service.get_open_channel(message.from_user.id)
    if ticket is None:
        if current == OtinishChannelStates.active.state:
            await state.clear()
        return UNHANDLED

    await _enter_channel(state, ticket.id)
    bridge = OtinishBridgeService(bot, otinish_service)
    if await bridge.pipe_channel_message(message):
        return
    return UNHANDLED
