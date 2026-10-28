from fastapi import Depends, Request

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.search.retrieval import LexicalRetriever
from backend.modules.search.service import SearchService


async def get_search_service(
    request: Request,
    uow: UnitOfWork = Depends(get_uow),
) -> SearchService:
    return SearchService(
        uow=uow,
        retriever=LexicalRetriever(request.app.state.meilisearch_client),
        service_origin=request.app.state.config.service_origin,
    )
