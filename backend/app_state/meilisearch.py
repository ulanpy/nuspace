from dataclasses import dataclass
from typing import List, Type

import httpx
from fastapi import FastAPI
from sqlalchemy import Column
from sqlalchemy.orm import DeclarativeBase

from backend.common.utils import meilisearch
from backend.core.configs.config import config
from backend.core.database.models import (
    Community,
    CommunityPost,
    Course,
    Event,
    GradeReport,
    Product,
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

    # Delete all existing indexes first
    try:
        response = await app.state.meilisearch_client.get("/indexes")
        existing_indexes = response.json()
        for index in existing_indexes["results"]:
            await app.state.meilisearch_client.delete(f"/indexes/{index['uid']}")
    except Exception as e:
        print(f"Error clearing existing indexes: {str(e)}")

    # Define index configurations directly
    index_configs = [
        MeilisearchIndexConfig(
            model=Product,
            searchable_columns=[Product.name, Product.status, Product.category],
            filterable_attributes=[Product.status],
            primary_key=Product.id,  # Explicitly specify primary key
        ),
        MeilisearchIndexConfig(
            model=Event,
            searchable_columns=[Event.name, Event.description],
            filterable_attributes=None,
            primary_key=Event.id,  # Explicitly specify primary key
        ),
        MeilisearchIndexConfig(
            model=Community,
            searchable_columns=[Community.name, Community.description],
            filterable_attributes=None,
            primary_key=Community.id,  # Explicitly specify primary key
        ),
        MeilisearchIndexConfig(
            model=CommunityPost,
            searchable_columns=[CommunityPost.title, CommunityPost.description],
            filterable_attributes=None,
            primary_key=CommunityPost.id,  # Explicitly specify primary key
        ),
        MeilisearchIndexConfig(
            model=GradeReport,
            searchable_columns=[
                GradeReport.course_code,
                GradeReport.course_title,
                GradeReport.faculty,
            ],
            filterable_attributes=None,
            primary_key=GradeReport.id,  # Explicitly specify primary key
        ),
        MeilisearchIndexConfig(
            model=Course,
            searchable_columns=[Course.course_code, Course.faculty, Course.term],
            filterable_attributes=[Course.term],
            primary_key=Course.id,  # Explicitly specify primary key
        ),
    ]

    # Import data for each configured index
    for index_config in index_configs:
        await meilisearch.sync_with_db(
            meilisearch_client=app.state.meilisearch_client,
            storage_name=index_config.model.__tablename__,
            db_manager=app.state.db_manager,
            model=index_config.model,
            columns_for_searching=index_config.get_searchable_names(),
            primary_key=index_config.get_primary_key_name(),  # Pass primary key name
        )

        # Ensure only intended attributes are searchable (avoid matching by id)
        try:
            await app.state.meilisearch_client.patch(
                f"/indexes/{index_config.model.__tablename__}/settings",
                json={
                    "searchableAttributes": index_config.get_searchable_names(),
                },
            )
        except Exception as e:
            print(
                f"Error setting searchable attributes for {index_config.model.__tablename__}: {str(e)}"
            )

        # Set filterable attributes if specified
        if index_config.filterable_attributes:
            await app.state.meilisearch_client.patch(
                f"/indexes/{index_config.model.__tablename__}/settings",
                json={"filterableAttributes": index_config.get_filterable_names()},
            )


async def cleanup_meilisearch(app: FastAPI):
    """Clean up Meilisearch client connection"""
    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
