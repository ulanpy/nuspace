from aiogram import Dispatcher

from .db_session import DatabaseMiddleware
from .redis import RedisMiddleware
from .public_url import UrlMiddleware


def setup_middlewares(dp: Dispatcher):
    middlewares = [DatabaseMiddleware, RedisMiddleware, UrlMiddleware]
    for middleware in middlewares:
        dp.update.middleware(middleware)
        dp.message.middleware(middleware)
        dp.callback_query.middleware(middleware)
        dp.chat_member.middleware(middleware)