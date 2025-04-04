from fastapi import APIRouter, Depends, Request
from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session
from backend.core.database.models import User, Product
from .cruds import show_products, add_new_product_to_database

router = APIRouter(prefix="/products", tags=['Kupi-Prodai Routes'])


@router.get("/import") 
async def import_from_database(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await import_data_from_database(storage_name='products', db_manager = request.app.state.db_manager, model = Product, columns_for_searching=["id", "name"])


@router.post("/")
async def add_new_product(product_data: ProductSchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    try:
        new_product = await add_new_product_to_database(db_session, product_data)
        await add_meilisearch_data(storage_name='products', json_values={'id': new_product.id, 'name': new_product.name})
        return True
    except Exception as e:
        return e.error()


@router.get("/")
async def show_all_products(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await show_products(session = db_session, size = 1, page = 1)


@router.delete("/{product_id}")
async def remove_product(product_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await remove_meilisearch_data(storage_name='products', object_id=product_id)


@router.patch("/{product_id}/activate")
async def activate_product():
    pass


@router.patch("/{product_id}/deactivate")
async def deactivate_product():
    pass



@router.patch("/{product_id}")
async def update_product(product_id: int, new_name: str, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await update_meilisearch_data(storage_name= "products", json_values={"id": product_id, "name": new_name})


@router.get("/search")
async def search(keyword: str, request: Request):
    return await search_for_meilisearch_data(storage_name="products", keyword=keyword)


@router.get("/filter-products")
async def filter_products():
    pass


@router.get("{product_id}/pictures")
async def retrieve_product_pictures(product_id: int):
    pass


@router.delete('{product_id}/pictures')
async def remove_pictures(product_id: int):
    pass


@router.post("{product_id}/feedback")
async def store_new_product_feedback(product_id: int):
    pass


@router.get("{product_id}/feedback")
async def get_product_feedback(product_id: int):
    pass


@router.post("{product_id}/report")
async def store_new_product_report(product_id: int, request: Request):
    pass

