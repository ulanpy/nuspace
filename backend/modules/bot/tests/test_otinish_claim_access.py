from types import SimpleNamespace

import pytest
from aiogram.enums import ChatMemberStatus
from backend.modules.bot.utils.otinish_claim_access import is_claim_authorized_member


@pytest.mark.parametrize(
    "member",
    [
        SimpleNamespace(status=ChatMemberStatus.CREATOR),
        SimpleNamespace(status=ChatMemberStatus.ADMINISTRATOR),
        SimpleNamespace(status=ChatMemberStatus.MEMBER),
        SimpleNamespace(status=ChatMemberStatus.RESTRICTED, is_member=True),
    ],
)
def test_active_ministry_chat_members_can_claim(member: SimpleNamespace) -> None:
    assert is_claim_authorized_member(member)


@pytest.mark.parametrize(
    "member",
    [
        SimpleNamespace(status=ChatMemberStatus.LEFT),
        SimpleNamespace(status=ChatMemberStatus.KICKED),
        SimpleNamespace(status=ChatMemberStatus.RESTRICTED, is_member=False),
    ],
)
def test_inactive_ministry_chat_members_cannot_claim(member: SimpleNamespace) -> None:
    assert not is_claim_authorized_member(member)
