import asyncio
from dataclasses import dataclass
from typing import List, Type, Optional

import httpx
from fastapi import FastAPI
from sqlalchemy import Column
from sqlalchemy.orm import DeclarativeBase

from backend.common.utils import meilisearch
from backend.core.configs.config import config
from backend.core.database.models import (
    Community,
    Course,
    Event,
    GradeReport,
)
from backend.modules.courses.registrar.priority_sync import (
    PriorityRequirementsRefresher,
    sync_priority_requirements,
)
from backend.modules.courses.registrar.schedule_sync import (
    ScheduleCatalogRefresher,
    sync_schedule_catalog,
)


@dataclass
class MeilisearchIndexConfig:
    """Configuration for a single Meilisearch index"""

    model: Type[DeclarativeBase]
    searchable_columns: List[Column]
    filterable_attributes: List[Column] = None
    primary_key: Column = None  # Add primary key field

    def get_searchable_names(self) -> List[str]:
        """Get the column names for searching"""
        return [col.key for col in self.searchable_columns]

    def get_filterable_names(self) -> List[str]:
        """Get the column names for filtering"""
        return (
            [col.key for col in self.filterable_attributes] if self.filterable_attributes else None
        )

    def get_primary_key_name(self) -> str:
        """Get the primary key column name"""
        if self.primary_key:
            return self.primary_key.key
        return "id"  # Default to 'id' if not specified


async def setup_meilisearch(app: FastAPI):
    """Set up Meilisearch client and initialize indices based on configuration"""
    # Initialize Meilisearch client
    app.state.meilisearch_client = httpx.AsyncClient(
        base_url=config.MEILISEARCH_URL,
        headers={"Authorization": f"Bearer {config.MEILISEARCH_MASTER_KEY}"},
    )

    async def _init_meili_indices() -> None:
        # Delete all existing indexes first
        try:
            response = await app.state.meilisearch_client.get("/indexes")
            existing_indexes = response.json()
            for index in existing_indexes.get("results", []):
                await app.state.meilisearch_client.delete(f"/indexes/{index['uid']}")
        except Exception as e:
            print(f"Error clearing existing indexes: {str(e)}")

        # Define index configurations directly
        index_configs = [
            MeilisearchIndexConfig(
                model=Event,
                searchable_columns=[Event.name, Event.description],
                filterable_attributes=None,
                primary_key=Event.id,
            ),
            MeilisearchIndexConfig(
                model=Community,
                searchable_columns=[Community.name, Community.description],
                filterable_attributes=None,
                primary_key=Community.id,
            ),
            MeilisearchIndexConfig(
                model=GradeReport,
                searchable_columns=[
                    GradeReport.course_code,
                    GradeReport.course_title,
                    GradeReport.faculty,
                    GradeReport.term,
                ],
                filterable_attributes=[GradeReport.term],
                primary_key=GradeReport.id,
            ),
            MeilisearchIndexConfig(
                model=Course,
                searchable_columns=[Course.course_code, Course.term],
                filterable_attributes=[Course.term],
                primary_key=Course.id,
            ),
        ]

        # Import data for each configured index
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

        # Initialize registrar course priority and schedule indexes + refreshers (run in debug)
        if config.IS_DEBUG:
            app.state.course_priority_refresher = PriorityRequirementsRefresher(
                app.state.meilisearch_client
            )
            app.state.course_schedule_refresher = ScheduleCatalogRefresher(
                app.state.meilisearch_client
            )
            try:
                count = await sync_priority_requirements(app.state.meilisearch_client)
                print(f"Synced priority requirements docs: {count}")
            except Exception as exc:
                print(f"Error syncing registrar course priority: {exc}")
            app.state.course_priority_refresher.start()
            try:
                count = await sync_schedule_catalog(app.state.meilisearch_client)
                print(f"Synced schedule catalog docs: {count}")
            except Exception as exc:
                print(f"Error syncing registrar course schedule: {exc}")
            app.state.course_schedule_refresher.start()

    # Kick off indexing in background to avoid blocking startup
    app.state.meili_init_task: Optional[asyncio.Task] = asyncio.create_task(_init_meili_indices())


async def cleanup_meilisearch(app: FastAPI):
    """Clean up Meilisearch client connection"""
    init_task: Optional[asyncio.Task] = getattr(app.state, "meili_init_task", None)
    if init_task and not init_task.done():
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass

    refresher = getattr(app.state, "course_priority_refresher", None)
    if refresher:
        await refresher.stop()
    schedule_refresher = getattr(app.state, "course_schedule_refresher", None)
    if schedule_refresher:
        await schedule_refresher.stop()
    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
