"""Interfaces for product features that opt into the agent runtime."""

from dataclasses import dataclass
from typing import Protocol

from agents import Agent

from backend.modules.agent.schemas import WorkflowCommand


@dataclass(frozen=True)
class RunContext:
    """Trusted, server-built context supplied to a single workflow run."""

    run_id: str
    actor_id: str | None
    command: WorkflowCommand


class ScenarioHarness(Protocol):
    """Build one bounded agent for one product-owned workflow."""

    def build_agent(self, context: RunContext) -> Agent[RunContext]: ...
