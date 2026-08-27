from typing import Protocol

from aiogram.enums import ChatMemberStatus


class ChatMemberStatusLike(Protocol):
    status: ChatMemberStatus


def is_claim_authorized_member(member: ChatMemberStatusLike) -> bool:
    """Whether Telegram considers a user an active ministry-chat member."""
    if member.status in {
        ChatMemberStatus.CREATOR,
        ChatMemberStatus.ADMINISTRATOR,
        ChatMemberStatus.MEMBER,
    }:
        return True
    return member.status == ChatMemberStatus.RESTRICTED and bool(
        getattr(member, "is_member", False)
    )
