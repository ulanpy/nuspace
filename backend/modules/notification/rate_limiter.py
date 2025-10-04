"""Async helpers for throttling Telegram bot sends."""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from time import monotonic
from typing import Deque, Dict


@dataclass
class _ChatState:
    """Mutable state for a single chat 
    used to enforce per-chat pacing."""

    lock: asyncio.Lock
    last_sent_at: float | None = None


class TelegramRateLimiter:
    """Enforces global and per-chat Telegram rate limits.

    The limiter respects Telegram's documented constraints:
    - A maximum global throughput of ``global_rate_per_sec`` messages per second across chats.
    - A minimum delay of ``per_chat_min_interval`` seconds between messages in the same chat.

    Calls to ``wait`` block (async) until both constraints are satisfied, at which point the
    caller is allowed to proceed with sending a message.
    """

    def __init__(self, *, global_rate_per_sec: int, per_chat_min_interval: float) -> None:
        if global_rate_per_sec <= 0:
            raise ValueError("global_rate_per_sec must be positive")
        if per_chat_min_interval < 0:
            raise ValueError("per_chat_min_interval must be non-negative")

        self._global_rate_per_sec = global_rate_per_sec
        self._global_window_seconds = 1.0
        self._global_timestamps: Deque[float] = deque()
        self._global_lock = asyncio.Lock()

        self._per_chat_min_interval = per_chat_min_interval
        self._chat_states: Dict[int, _ChatState] = {}
        self._chat_states_lock = asyncio.Lock()

    async def wait(self, chat_id: int | None) -> None:
        """Block until sending to ``chat_id`` respects both 
        global and per-chat limits."""

        if chat_id is None:
            await self._reserve_global_slot()
            return

        chat_state = await self._get_chat_state(chat_id)
        async with chat_state.lock:
            await self._respect_limits(chat_state)

    async def _get_chat_state(self, chat_id: int) -> _ChatState:
        """Return the state associated with ``chat_id``, 
        creating it if necessary."""

        async with self._chat_states_lock:
            state = self._chat_states.get(chat_id)
            if state is None:
                state = _ChatState(lock=asyncio.Lock())
                self._chat_states[chat_id] = state
            return state

    async def _respect_limits(self, chat_state: _ChatState) -> None:
        """Wait until both per-chat and global 
        constraints permit sending."""

        while True:
            if chat_state.last_sent_at is not None and self._per_chat_min_interval > 0:
                now = monotonic()
                elapsed = now - chat_state.last_sent_at
                wait_time = self._per_chat_min_interval - elapsed
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    continue

            sent_at = await self._reserve_global_slot()
            chat_state.last_sent_at = sent_at
            return

    async def _reserve_global_slot(self) -> float:
        """Reserve a slot within the global rate limit 
        and return the timestamp of the grant."""

        async with self._global_lock:
            while True:
                now = monotonic()

                while self._global_timestamps and now - self._global_timestamps[0] >= self._global_window_seconds:
                    self._global_timestamps.popleft()

                if len(self._global_timestamps) < self._global_rate_per_sec:
                    self._global_timestamps.append(now)
                    return now

                wait_time = self._global_window_seconds - (now - self._global_timestamps[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                else:
                    await asyncio.sleep(0)

