"""Dense retrieval: one embedding per structured Source, in Postgres (pgvector).

Pages, events, courses, grade reports and the catalogue are embedded with
`gemini-embedding-001` at 768 dimensions over the same ADC path as the other
Gemini calls. Documents are embedded as RETRIEVAL_DOCUMENT and queries as
RETRIEVAL_QUERY. Vectors are normalised in SQL (`l2_normalize`), so the
negative inner product `<#>` orders by cosine similarity, and the scan is
exact: no ANN index. Messages and profiles are not embedded.

Embeddings are written wherever a Meilisearch document is written
(`MeilisearchIndexConfig.upsert`, `upsert_many`, `delete` and the rebuild, and
the catalogue sync), from the same document, so the two stores hold the same
Sources. A failed embedding never fails the write: the Source stays findable
lexically until the next rebuild or edit.
"""

import asyncio
import hashlib
import logging
from collections.abc import Mapping, Sequence
from typing import Any, Literal, Protocol

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.modules.search.sources import EMBEDDED_SOURCES_BY_UID

logger = logging.getLogger(__name__)

DIMENSIONS = 768
# Cosine similarity a Source must reach to be a dense hit; without a floor every
# query would return its nearest neighbours however far. Tune on real queries.
MIN_SIMILARITY = 0.6
# Gemini embeds one text per request on Vertex, so a batch is fanned out.
MAX_CONCURRENT_EMBEDDINGS = 8
# Characters of a document that are embedded; the model reads 2048 tokens.
MAX_TEXT_CHARS = 6000

EmbedTask = Literal["RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY"]


class Embedder(Protocol):
    async def embed(self, texts: Sequence[str], *, task: EmbedTask) -> list[list[float]]: ...


class GeminiEmbedder:
    """`gemini-embedding-001` through the app's Gemini client, built on first use."""

    def __init__(self) -> None:
        self._client = None

    async def embed(self, texts: Sequence[str], *, task: EmbedTask) -> list[list[float]]:
        from google.genai import types

        from backend.core.configs.config import config
        from backend.modules.bot.services.gemini_event_extractor import build_gemini_client

        if self._client is None:
            self._client = build_gemini_client()
        client = self._client
        embed_config = types.EmbedContentConfig(task_type=task, output_dimensionality=DIMENSIONS)
        limit = asyncio.Semaphore(MAX_CONCURRENT_EMBEDDINGS)

        async def one(content: str) -> list[float]:
            async with limit:
                response = await client.aio.models.embed_content(
                    model=config.GEMINI_EMBEDDING_MODEL, contents=content, config=embed_config
                )
            return list(response.embeddings[0].values)

        return list(await asyncio.gather(*(one(content) for content in texts)))


def document_text(document: Mapping[str, Any], attributes: Sequence[str]) -> str:
    """The text a document is embedded from: its searchable attributes, joined."""
    parts = (document.get(name) for name in attributes)
    return "\n".join(str(part) for part in parts if part)[:MAX_TEXT_CHARS]


def _vector(values: Sequence[float]) -> str:
    return "[" + ",".join(repr(float(value)) for value in values) + "]"


_NORMALISED = "l2_normalize(CAST(CAST(:vector AS text) AS vector))"


class EmbeddingIndex:
    def __init__(self, embedder: Embedder, session_maker: async_sessionmaker[AsyncSession]) -> None:
        self.embedder = embedder
        self.session_maker = session_maker

    async def upsert(self, source: str, items: Mapping[str, str]) -> None:
        """Embed and store `{key: text}`. Rows whose text is unchanged are not re-embedded."""
        items = {key: body for key, body in items.items() if body.strip()}
        if not items:
            return
        hashes = {key: hashlib.sha256(body.encode()).hexdigest() for key, body in items.items()}
        async with self.session_maker() as session:
            rows = await session.execute(
                text(
                    "SELECT key, content_hash FROM search_embeddings"
                    " WHERE source = :source AND key = ANY(:keys)"
                ),
                {"source": source, "keys": list(items)},
            )
            current = {key: content_hash for key, content_hash in rows.all()}
        stale = [key for key in items if current.get(key) != hashes[key]]
        if not stale:
            return
        vectors = await self.embedder.embed(
            [items[key] for key in stale], task="RETRIEVAL_DOCUMENT"
        )
        async with self.session_maker.begin() as session:
            for key, vector in zip(stale, vectors, strict=True):
                await session.execute(
                    text(
                        "INSERT INTO search_embeddings (source, key, content_hash, embedding)"
                        f" VALUES (:source, :key, :hash, {_NORMALISED})"
                        " ON CONFLICT (source, key) DO UPDATE"
                        " SET content_hash = EXCLUDED.content_hash, embedding = EXCLUDED.embedding"
                    ),
                    {"source": source, "key": key, "hash": hashes[key], "vector": _vector(vector)},
                )

    async def delete(self, source: str, key: str) -> None:
        async with self.session_maker.begin() as session:
            await session.execute(
                text("DELETE FROM search_embeddings WHERE source = :source AND key = :key"),
                {"source": source, "key": key},
            )

    async def prune(self, source: str, keep: Sequence[str]) -> None:
        """Drop the source's embeddings whose key is not in `keep`."""
        async with self.session_maker.begin() as session:
            await session.execute(
                text("DELETE FROM search_embeddings WHERE source = :source AND key <> ALL(:keep)"),
                {"source": source, "keep": list(keep)},
            )

    async def nearest(self, query: str, limit: int) -> list[str]:
        """Keys (`page:12`) of the Sources nearest the query, best first."""
        (vector,) = await self.embedder.embed([query], task="RETRIEVAL_QUERY")
        async with self.session_maker() as session:
            rows = await session.execute(
                text(
                    "SELECT source || ':' || key FROM search_embeddings"
                    f" WHERE embedding <#> {_NORMALISED} < :ceiling"
                    f" ORDER BY embedding <#> {_NORMALISED} LIMIT :limit"
                ),
                {"vector": _vector(vector), "limit": limit, "ceiling": -MIN_SIMILARITY},
            )
            return list(rows.scalars().all())


_index: EmbeddingIndex | None = None


def configure(index: EmbeddingIndex | None) -> None:
    global _index
    _index = index


async def embed_documents(
    uid: str,
    documents: Sequence[Mapping[str, Any]],
    attributes: Sequence[str],
    *,
    primary_key: str = "id",
    prune: bool = False,
) -> None:
    """Embed the documents written to Meilisearch index `uid`, if it is an embedded source."""
    source = EMBEDDED_SOURCES_BY_UID.get(uid)
    index = _index
    if source is None or index is None:
        return
    try:
        items = {str(d[primary_key]): document_text(d, attributes) for d in documents}
        await index.upsert(source.name, items)
        if prune:
            await index.prune(source.name, list(items))
    except Exception:
        logger.exception("Could not embed %s documents for %s", len(documents), uid)


async def delete_document(uid: str, primary_key: int | str) -> None:
    source = EMBEDDED_SOURCES_BY_UID.get(uid)
    index = _index
    if source is None or index is None:
        return
    try:
        await index.delete(source.name, str(primary_key))
    except Exception:
        logger.exception("Could not delete the embedding of %s:%s", source.name, primary_key)
