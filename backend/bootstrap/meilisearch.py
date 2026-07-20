import asyncio
from collections.abc import Awaitable, Callable, Sequence
from dataclasses import dataclass
from typing import List, Optional, Type

import httpx
from fastapi import FastAPI
from sqlalchemy import Column
from sqlalchemy.orm import DeclarativeBase

from backend.common.utils import meilisearch
from backend.core.configs.config import config

MeilisearchHook = Callable[[FastAPI], Awaitable[None]]


@dataclass
class MeilisearchIndexConfig:
    """Configuration for a single Meilisearch index."""

    model: Type[DeclarativeBase]
    searchable_columns: List[Column]
    filterable_attributes: List[Column] | None = None
    primary_key: Column | None = None

    def get_searchable_names(self) -> List[str]:
        return [col.key for col in self.searchable_columns]

    def get_filterable_names(self) -> List[str] | None:
        if self.filterable_attributes:
            return [col.key for col in self.filterable_attributes]
        return None

    def get_primary_key_name(self) -> str:
        if self.primary_key:
            return self.primary_key.key
        return "id"


async def _sync_index_configs(
    app: FastAPI, index_configs: Sequence[MeilisearchIndexConfig]
) -> None:
    try:
        response = await app.state.meilisearch_client.get("/indexes")
        existing_indexes = response.json()
        for index in existing_indexes.get("results", []):
            await app.state.meilisearch_client.delete(f"/indexes/{index['uid']}")
    except Exception as e:
        print(f"Error clearing existing indexes: {str(e)}")

    for index_config in index_configs:
        try:
            await meilisearch.sync_with_db(
                meilisearch_client=app.state.meilisearch_client,
                storage_name=index_config.model.__tablename__,
                db_manager=app.state.db_manager,
                model=index_config.model,
                columns_for_searching=index_config.get_searchable_names(),
                primary_key=index_config.get_primary_key_name(),
            )
            await app.state.meilisearch_client.patch(
                f"/indexes/{index_config.model.__tablename__}/settings",
                json={"searchableAttributes": index_config.get_searchable_names()},
            )
            if index_config.filterable_attributes:
                await app.state.meilisearch_client.patch(
                    f"/indexes/{index_config.model.__tablename__}/settings",
                    json={"filterableAttributes": index_config.get_filterable_names()},
                )
        except Exception as e:
            print(f"Error syncing index {index_config.model.__tablename__}: {e}")


async def setup_meilisearch(
    app: FastAPI,
    *,
    index_configs: Sequence[MeilisearchIndexConfig] = (),
    after_sync: Sequence[MeilisearchHook] = (),
    on_cleanup: Sequence[MeilisearchHook] = (),
) -> None:
    """Create the Meilisearch client and sync indexes from module contributors."""
    app.state.meilisearch_client = httpx.AsyncClient(
        base_url=config.MEILISEARCH_URL,
        headers={"Authorization": f"Bearer {config.MEILISEARCH_MASTER_KEY}"},
    )
    app.state.meili_cleanup_hooks = list(on_cleanup)

    async def _init_meili_indices() -> None:
        await _sync_index_configs(app, index_configs)
        for hook in after_sync:
            try:
                await hook(app)
            except Exception as e:
                print(f"Error in Meilisearch after_sync hook: {e}")

    app.state.meili_init_task: Optional[asyncio.Task] = asyncio.create_task(_init_meili_indices())


async def cleanup_meilisearch(app: FastAPI) -> None:
    init_task: Optional[asyncio.Task] = getattr(app.state, "meili_init_task", None)
    if init_task and not init_task.done():
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass

    for hook in getattr(app.state, "meili_cleanup_hooks", []) or []:
        try:
            await hook(app)
        except Exception as e:
            print(f"Error in Meilisearch cleanup hook: {e}")

    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
