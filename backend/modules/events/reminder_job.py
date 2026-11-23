"""Cloud Run Job entrypoint: send the 24h event reminders due now (#447).

Runs every 15 minutes from Cloud Scheduler. The environment file named by
NUSPACE_ENV_FILE is loaded before config is imported, since config reads the
environment when it is first imported.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys

from backend.common.datetime_utils import utc_now

logger = logging.getLogger(__name__)


async def run() -> int:
    from aiogram import Bot

    from backend.core.configs.config import config
    from backend.core.database.manager import AsyncDatabaseManager
    from backend.core.database.uow import UnitOfWork
    from backend.modules.bot.dependencies import build_direct_messenger
    from backend.modules.events.reminders import send_due_reminders

    db_manager = AsyncDatabaseManager()
    bot = Bot(token=config.TELEGRAM_BOT_TOKEN)
    try:
        uow = UnitOfWork(session_factory=db_manager.get_session_maker())
        return await send_due_reminders(
            uow,
            build_direct_messenger(bot),
            config.service_origin("events"),
            utc_now(),
        )
    finally:
        await bot.session.close()
        await db_manager.async_engine.dispose()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    env_file = os.environ.get("NUSPACE_ENV_FILE")
    if env_file:
        from dotenv import load_dotenv

        load_dotenv(env_file, override=False)
    try:
        sent = asyncio.run(run())
    except Exception:
        logger.exception("Event reminder job failed")
        raise SystemExit(1) from None
    logger.info("Event reminder job sent %s reminders", sent)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
