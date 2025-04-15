from aiogram.filters import BaseFilter, CommandObject
from aiogram.types import Message
from aiogram.utils.payload import decode_payload
from typing import Optional


class EncodedDeepLinkFilter(BaseFilter):
    def __init__(self, prefix: Optional[str] = None):
        self.prefix = prefix

    async def __call__(self, message: Message, command: CommandObject) -> bool:
        args = command.args
        payload: str = decode_payload(args)

        if not payload:
            return False

        if self.prefix:
            if payload.startswith(self.prefix):
                return True
            return False
        return False

