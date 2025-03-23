from aiogram import Bot






async def kick_user(chat_id: int, user_id: int, bot: Bot):
    await bot.ban_chat_member(chat_id, user_id)
    await bot.unban_chat_member(chat_id, user_id)
