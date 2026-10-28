import asyncio
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Callable, List, Optional, Type

import httpx
from fastapi import FastAPI
from sqlalchemy import Column
from sqlalchemy.orm import DeclarativeBase

from backend.common.utils import meilisearch
from backend.core.configs.config import config
from backend.core.database.manager import AsyncDatabaseManager


@dataclass
class MeilisearchIndexConfig:
    """Configuration for a single Meilisearch index.

    A document carries the primary key, every searchable column and every
    filterable column. Only the searchable ones are matched against a query: a
    filter facet such as ``visibility`` is stored so it can be filtered on, but
    never becomes a search term. ``to_document`` is the one place a document is
    built, for the full rebuild and for the upsert at write time alike, so the
    two can never write different fields.
    """

    model: Type[DeclarativeBase]
    searchable_columns: List[Column]
    filterable_attributes: List[Column] | None = None
    primary_key: Column | None = None
    distinct_attribute: str | None = None
    document_transformer: Callable[[dict[str, Any]], dict[str, Any]] | None = None

    @property
    def uid(self) -> str:
        return self.model.__tablename__

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

    def get_document_names(self) -> List[str]:
        """The columns a document holds besides its primary key: searchable then filterable."""
        names = [*self.get_searchable_names(), *(self.get_filterable_names() or [])]
        return [
            name
            for position, name in enumerate(names)
            if name not in names[:position] and name != self.get_primary_key_name()
        ]

    def get_settings(self) -> dict[str, Any]:
        settings: dict[str, Any] = {"searchableAttributes": self.get_searchable_names()}
        if self.filterable_attributes:
            settings["filterableAttributes"] = self.get_filterable_names()
        if self.distinct_attribute:
            settings["distinctAttribute"] = self.distinct_attribute
        return settings

    def to_document(self, source: Mapping[str, Any] | Any) -> dict[str, Any]:
        """The index document for a database row (a mapping) or an ORM instance."""
        names = [self.get_primary_key_name(), *self.get_document_names()]
        if isinstance(source, Mapping):
            values = {name: source[name] for name in names}
        else:
            values = {name: getattr(source, name) for name in names}
        document = meilisearch.to_document(values)
        if self.document_transformer:
            document = self.document_transformer(document)
        return document

    async def upsert(self, client: httpx.AsyncClient, source: Any) -> None:
        """Index one ORM instance after its transaction has committed."""
        await meilisearch.upsert(
            client,
            self.uid,
            self.to_document(source),
            primary_key=self.get_primary_key_name(),
        )

    async def upsert_many(self, client: httpx.AsyncClient, sources: Sequence[Any]) -> None:
        """Index several ORM instances in one request, after their transaction has committed."""
        await meilisearch.upsert_many(client, self.uid, [self.to_document(s) for s in sources])

    async def delete(self, client: httpx.AsyncClient, primary_key: int | str) -> None:
        await meilisearch.delete(client, self.uid, str(primary_key))


def create_meilisearch_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=config.MEILISEARCH_URL,
        headers={"Authorization": f"Bearer {config.MEILISEARCH_MASTER_KEY}"},
        # The default HTTPX pool admits 100 active connections.  When the
        # downstream search service slows down, assigning a large backlog over
        # that pool becomes CPU-expensive in the API process.  A bounded pool
        # gives Meilisearch controlled concurrency and fails overloaded work
        # promptly instead of retaining thousands of waiting coroutines.
        limits=httpx.Limits(
            max_connections=200,
            max_keepalive_connections=20,
            keepalive_expiry=100.0,
        ),
        timeout=httpx.Timeout(
            timeout=10.0,
            connect=2.0,
            pool=2.0,
        ),
    )


async def ensure_index(
    client: httpx.AsyncClient, index_config: MeilisearchIndexConfig, *, uid: str | None = None
) -> None:
    """Create the index if it is missing and apply its settings.

    Idempotent and non-destructive: it never deletes an index or touches a
    document, so it is safe to run on every boot of a stack whose indexes live
    on a persistent volume. ``uid`` names a staging index with the same settings.
    """
    uid = uid or index_config.uid
    if (await client.get(f"/indexes/{uid}")).status_code == 404:
        response = await client.post(
            "/indexes", json={"uid": uid, "primaryKey": index_config.get_primary_key_name()}
        )
        try:
            await meilisearch.wait_for_task(client, response)
        except RuntimeError as exc:
            # Another process created it between the check and the create.
            if "index_already_exists" not in str(exc):
                raise
    response = await client.patch(f"/indexes/{uid}/settings", json=index_config.get_settings())
    await meilisearch.wait_for_task(client, response)


async def ensure_indexes(
    client: httpx.AsyncClient, index_configs: Sequence[MeilisearchIndexConfig]
) -> None:
    for index_config in index_configs:
        await ensure_index(client, index_config)


async def _delete_index(client: httpx.AsyncClient, uid: str) -> None:
    response = await client.delete(f"/indexes/{uid}")
    try:
        await meilisearch.wait_for_task(client, response)
    except RuntimeError as exc:
        # Meilisearch accepts the delete of a missing index and fails the task.
        if "index_not_found" not in str(exc):
            raise


async def rebuild_index(
    client: httpx.AsyncClient,
    db_manager: AsyncDatabaseManager,
    index_config: MeilisearchIndexConfig,
    *,
    batch_size: int = meilisearch.DEFAULT_BATCH_SIZE,
) -> int:
    """Rebuild one index from Postgres and return the number of documents written.

    The new copy is built in a staging index and swapped in, so search keeps
    answering from the old one until the new one is complete, rows deleted from
    Postgres since the last rebuild disappear from the index, and a failure
    part-way leaves the live index as it was.
    """
    live_uid = index_config.uid
    staging_uid = f"{live_uid}__rebuild"
    await ensure_index(client, index_config)  # the swap needs both sides to exist
    await _delete_index(client, staging_uid)  # a previous run may have died mid-way
    await ensure_index(client, index_config, uid=staging_uid)
    try:
        count = await meilisearch.sync_with_db(
            meilisearch_client=client,
            storage_name=staging_uid,
            db_manager=db_manager,
            model=index_config.model,
            document_columns=index_config.get_document_names(),
            primary_key=index_config.get_primary_key_name(),
            make_document=index_config.to_document,
            batch_size=batch_size,
        )
        response = await client.post("/swap-indexes", json=[{"indexes": [live_uid, staging_uid]}])
        await meilisearch.wait_for_task(client, response)
    finally:
        await _delete_index(client, staging_uid)
    return count


async def rebuild_indexes(
    client: httpx.AsyncClient,
    db_manager: AsyncDatabaseManager,
    index_configs: Sequence[MeilisearchIndexConfig],
    *,
    batch_size: int = meilisearch.DEFAULT_BATCH_SIZE,
) -> dict[str, int]:
    """Rebuild every index from Postgres. Runs only when someone asks for it.

    ``python -m backend.bootstrap.rebuild_search`` is the entry point; the app
    never calls this at startup.
    """
    counts: dict[str, int] = {}
    for index_config in index_configs:
        counts[index_config.uid] = await rebuild_index(
            client, db_manager, index_config, batch_size=batch_size
        )
    return counts


async def setup_meilisearch(
    app: FastAPI,
    *,
    index_configs: Sequence[MeilisearchIndexConfig] = (),
) -> None:
    """Create the Meilisearch client and make sure every index exists with its settings.

    Indexes live on a persistent volume, so boot only creates what is missing and
    re-applies settings. It never deletes an index or writes a document: filling
    the indexes from Postgres is `rebuild_indexes`, run on request.
    """
    app.state.meilisearch_client = create_meilisearch_client()

    async def _ensure_meili_indices() -> None:
        try:
            await ensure_indexes(app.state.meilisearch_client, index_configs)
        except Exception as e:
            print(f"Error ensuring Meilisearch indexes: {e}")

    app.state.meili_ensure_task: Optional[asyncio.Task] = asyncio.create_task(
        _ensure_meili_indices()
    )


async def cleanup_meilisearch(app: FastAPI) -> None:
    init_task: Optional[asyncio.Task] = getattr(app.state, "meili_ensure_task", None)
    if init_task and not init_task.done():
        init_task.cancel()
        try:
            await init_task
        except asyncio.CancelledError:
            pass

    client = getattr(app.state, "meilisearch_client", None)
    if client:
        await client.aclose()
