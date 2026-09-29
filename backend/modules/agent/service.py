"""Streaming OpenAI Agents SDK execution behind product-owned harnesses."""

import os
from collections.abc import AsyncIterator
from uuid import uuid4

from agents import Runner
from agents.stream_events import RawResponsesStreamEvent, RunItemStreamEvent

from backend.modules.agent.harness import RunContext, ScenarioHarness
from backend.modules.agent.schemas import (
    AgentHealth,
    RunEvent,
    RunEventType,
    RunStatus,
    WorkflowCommand,
    WorkflowRun,
)
from backend.modules.agent.store import RedisRunStore


class AgentService:
    """Executes a feature's harness without exposing a generic agent API."""

    def __init__(
        self,
        store: RedisRunStore,
        harness: ScenarioHarness,
        model: str,
        max_turns: int,
    ) -> None:
        self.store = store
        self.harness = harness
        self.model = model
        self.max_turns = max_turns

    def health(self) -> AgentHealth:
        return AgentHealth(sdk_configured=bool(os.getenv("OPENAI_API_KEY")), model=self.model)

    async def create(self, command: WorkflowCommand, actor_id: str | None) -> WorkflowRun:
        run = WorkflowRun(
            id=str(uuid4()), status=RunStatus.queued, command=command, actor_id=actor_id
        )
        await self.store.save(run)
        return run

    async def get(self, run_id: str) -> WorkflowRun | None:
        return await self.store.get(run_id)

    async def cancel(self, run_id: str) -> WorkflowRun | None:
        run = await self.store.get(run_id)
        if run is None:
            return None
        await self.store.cancel(run_id)
        if run.status == RunStatus.queued:
            run.status = RunStatus.cancelled
            await self.store.save(run)
        return run

    @staticmethod
    def _sdk_input(command: WorkflowCommand) -> list[dict[str, object]]:
        content: list[dict[str, str]] = [{"type": "input_text", "text": command.objective}]
        for part in command.inputs:
            if part.kind == "text":
                content.append({"type": "input_text", "text": part.value})
            elif part.kind == "image_url":
                content.append({"type": "input_image", "image_url": part.value})
            else:
                content.append({"type": "input_file", "file_url": part.value})
        return [{"role": "user", "content": content}]

    async def _emit(self, event: RunEvent) -> RunEvent:
        await self.store.append_event(event)
        return event

    async def execute(self, run_id: str) -> AsyncIterator[RunEvent]:
        run = await self.store.get(run_id)
        if run is None:
            raise KeyError(run_id)
        if run.status in {RunStatus.completed, RunStatus.cancelled, RunStatus.failed}:
            async for event in self.store.events(run_id):
                yield event
            return
        if not os.getenv("OPENAI_API_KEY"):
            run.status = RunStatus.failed
            run.error = "OPENAI_API_KEY is not configured"
            await self.store.save(run)
            yield await self._emit(
                RunEvent(type=RunEventType.failed, run_id=run.id, data={"error": run.error})
            )
            return

        run.status = RunStatus.running
        await self.store.save(run)
        yield await self._emit(RunEvent(type=RunEventType.started, run_id=run.id))
        context = RunContext(run_id=run.id, actor_id=run.actor_id, command=run.command)
        result = Runner.run_streamed(
            self.harness.build_agent(context),
            self._sdk_input(run.command),
            context=context,
            max_turns=self.max_turns,
        )
        try:
            async for sdk_event in result.stream_events():
                if await self.store.is_cancelled(run.id):
                    result.cancel()
                    run.status = RunStatus.cancelled
                    await self.store.save(run)
                    yield await self._emit(RunEvent(type=RunEventType.cancelled, run_id=run.id))
                    return
                event = self._normalise_event(run.id, sdk_event)
                if event is not None:
                    yield await self._emit(event)
            run.status = RunStatus.completed
            await self.store.save(run)
            yield await self._emit(
                RunEvent(
                    type=RunEventType.completed,
                    run_id=run.id,
                    data={"output_text": str(result.final_output or "")},
                )
            )
        except Exception as exc:
            run.status = RunStatus.failed
            run.error = str(exc)
            await self.store.save(run)
            yield await self._emit(
                RunEvent(type=RunEventType.failed, run_id=run.id, data={"error": run.error})
            )

    @staticmethod
    def _normalise_event(run_id: str, event: object) -> RunEvent | None:
        if isinstance(event, RawResponsesStreamEvent):
            data = event.data
            if getattr(data, "type", None) == "response.output_text.delta":
                return RunEvent(
                    type=RunEventType.text_delta,
                    run_id=run_id,
                    data={"delta": getattr(data, "delta", "")},
                )
        if isinstance(event, RunItemStreamEvent):
            if event.name == "tool_called":
                return RunEvent(
                    type=RunEventType.tool_started, run_id=run_id, data={"item": str(event.item)}
                )
            if event.name == "tool_output":
                return RunEvent(
                    type=RunEventType.tool_finished, run_id=run_id, data={"item": str(event.item)}
                )
            if event.name == "mcp_approval_requested":
                return RunEvent(type=RunEventType.approval_required, run_id=run_id)
        return None
