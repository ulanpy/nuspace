from fastapi import FastAPI

from backend.routes.bot.utils import initialize_bot


async def setup_bot(app: FastAPI):
    await initialize_bot(app)


async def cleanup_bot(app: FastAPI):
    bot = getattr(app.state, "bot", None)
    if bot:
        await bot.session.close()
        await bot.delete_webhook(drop_pending_updates=True)
