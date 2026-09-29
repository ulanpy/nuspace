"""Short-lived Redis persistence for workflow coordination only."""

from collections.abc import AsyncIterator

from redis.asyncio import Redis

from backend.modules.agent.schemas import RunEvent, WorkflowRun


class RedisRunStore:
    """Run state, event replay and cooperative cancellation with a finite TTL.

    Features remain responsible for any durable artifact, audit log or page
    publication. This store intentionally contains no business records.
    """

    def __init__(self, redis: Redis, ttl_seconds: int):
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    @staticmethod
    def _run_key(run_id: str) -> str:
        return f"agent:run:{run_id}"

    @staticmethod
    def _events_key(run_id: str) -> str:
        return f"agent:run:{run_id}:events"

    @staticmethod
    def _cancel_key(run_id: str) -> str:
        return f"agent:run:{run_id}:cancelled"

    async def save(self, run: WorkflowRun) -> None:
        await self.redis.set(self._run_key(run.id), run.model_dump_json(), ex=self.ttl_seconds)

    async def get(self, run_id: str) -> WorkflowRun | None:
        raw = await self.redis.get(self._run_key(run_id))
        return WorkflowRun.model_validate_json(raw) if raw else None

    async def append_event(self, event: RunEvent) -> None:
        key = self._events_key(event.run_id)
        await self.redis.rpush(key, event.model_dump_json())
        await self.redis.expire(key, self.ttl_seconds)

    async def events(self, run_id: str) -> AsyncIterator[RunEvent]:
        for raw in await self.redis.lrange(self._events_key(run_id), 0, -1):
            yield RunEvent.model_validate_json(raw)

    async def cancel(self, run_id: str) -> None:
        await self.redis.set(self._cancel_key(run_id), "1", ex=self.ttl_seconds)

    async def is_cancelled(self, run_id: str) -> bool:
        return bool(await self.redis.exists(self._cancel_key(run_id)))
