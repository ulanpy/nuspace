from aiogram import Bot
from aiogram.types import BotCommand, BotCommandScopeAllPrivateChats


async def set_commands(bot: Bot):
    start = BotCommand(command="start", description="🟢 Start")
    language = BotCommand(command="language", description="🟢 Change language")
    await bot.set_my_commands(commands=[start, language], scope=BotCommandScopeAllPrivateChats())

