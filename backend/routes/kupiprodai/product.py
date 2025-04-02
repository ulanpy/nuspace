from fastapi import APIRouter, Depends, Request
from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session
from backend.core.database.models import User, Product
from .cruds import show_products, add_new_product_to_database

router = APIRouter(tags = ['Kupi-Prodai Routes'])

@router.get("/import") 
async def import_from_database(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await import_data_from_database(storage_name='products', db_manager = request.app.state.db_manager, model = Product, columns_for_searching=["id", "name"])

@router.post("/new-product")
async def add_new_product(product_data: ProductSchema,request: Request, db_session: AsyncSession = Depends(get_db_session)):
    #return await add_meilisearch_data(storage_name='products', json_values={'id':product_id, 'name': product_name})
    return await add_new_product_to_database(db_session, product_data)

@router.get("/all-products")
async def show_all_products(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await show_products(session = db_session, size = 1, page = 1)

@router.post("/remove-product")
async def remove_product(product_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await remove_meilisearch_data(storage_name='products', object_id=product_id)

@router.post("/update-product")
async def update_product(product_id: int, new_name: str, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await update_meilisearch_data(storage_name= "products", json_values={"id": product_id, "name": new_name})

@router.get("/search-for-product")
async def search(keyword: str, request: Request):
    return await search_for_meilisearch_data(storage_name="products", keyword=keyword)

@router.get("/filter-products")
async def filter_products():
    pass

@router.get("/product-pictures")
async def retrieve_product_pictures():
    pass

@router.get("/product-feedbacks")
async def get_product_feedbacks():
    pass

