"""Internal workflow contracts, deliberately separate from HTTP request DTOs."""

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class InputPart(BaseModel):
    """A product-prepared multimodal input for an agent workflow."""

    kind: Literal["text", "image_url", "file_url"]
    value: str = Field(min_length=1, max_length=20_000)
    name: str | None = Field(default=None, max_length=200)


class WorkflowCommand(BaseModel):
    """Trusted input assembled by a product feature, not a chat DTO."""

    objective: str = Field(min_length=1, max_length=20_000)
    inputs: list[InputPart] = Field(default_factory=list, max_length=20)
    # This is server-side feature context. It is never exposed as a model tool
    # schema or accepted as an open-ended public request body.
    context: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = Field(default=None, max_length=128)


class RunStatus(StrEnum):
    queued = "queued"
    running = "running"
    awaiting_approval = "awaiting_approval"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"


class RunEventType(StrEnum):
    started = "started"
    text_delta = "text_delta"
    tool_started = "tool_started"
    tool_finished = "tool_finished"
    approval_required = "approval_required"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class RunEvent(BaseModel):
    type: RunEventType
    run_id: str
    data: dict[str, Any] = Field(default_factory=dict)


class WorkflowRun(BaseModel):
    id: str
    status: RunStatus
    command: WorkflowCommand
    actor_id: str | None = None
    error: str | None = None


class AgentHealth(BaseModel):
    sdk_configured: bool
    model: str
