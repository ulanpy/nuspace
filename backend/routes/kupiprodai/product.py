from fastapi import APIRouter, Depends, Request
from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session
from backend.core.database.models import User, Product
from .cruds import *
from typing import Literal

router = APIRouter(tags = ['Kupi-Prodai Routes'])
ConditionType = Literal['Used', 'New', 'Like New', 'Any']

@router.post("/import") #works
async def import_from_database(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await import_data_from_database(storage_name='products', db_manager = request.app.state.db_manager, model = Product, columns_for_searching=["id", "name"])

@router.post("/products") #works
async def add_new_product(product_data: ProductSchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    try:
        new_product = await add_new_product_to_database(db_session, product_data)
        await add_meilisearch_data(storage_name='products', json_values={'id': new_product.id, 'name': new_product.name})
        return True
    except Exception as e:
        return {'error': str(e)}

@router.get("/products/{product_id}") #works
async def get_product(product_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    product = await get_product_from_database(product_id = product_id, session = db_session)
    return product
    
@router.get("/products") #works
async def get_products(request: Request, db_session: AsyncSession = Depends(get_db_session), categoryId: int = None, size: int = 20, page: int = 1, condition: ConditionType = "Any"):
    return await show_products(categoryId = categoryId, condition = condition, session = db_session, size = size, page = page)

@router.get('/products/user/{user_sub}') #works
async def get_products_of_user(user_sub: str, request: Request, db_session: AsyncSession = Depends(get_db_session), status: ProductStatus = ProductStatus.active):
    return await get_products_of_user_from_database(user_sub = user_sub, status = status, session = db_session)

@router.delete("/products/{product_id}") #works
async def remove_product(product_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    await remove_meilisearch_data(storage_name='products', object_id=product_id)
    await remove_product_from_database(product_id=product_id, session=db_session)

@router.put("/products/deactivate/{product_id}") #works
async def deactivate_product(product_id: int, db_session: AsyncSession = Depends(get_db_session)):
    await deactivate_product_in_database(product_id=product_id, session = db_session)

@router.put("/products/activate/{product_id}") #works
async def activate_product(product_id: int, db_session: AsyncSession = Depends(get_db_session)):
    await activate_product_in_database(product_id=product_id, session = db_session)

@router.put("/product/{product_id}") #works
async def update_product(product_id: int, product_schema: ProductSchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    await update_meilisearch_data(storage_name= "products", json_values={"id": product_id, "name": product_schema.name})
    await update_product_from_database(product_id = product_id, product_schema=product_schema, session=db_session)

@router.get("/products/search/{keyword}") #works
async def search(keyword: str, request: Request, db_session = Depends(get_db_session)):
    result = await search_for_meilisearch_data(storage_name="products", keyword=keyword)
    products = result['data']['hits']
    product_objects = []
    for product in products:
        product_objects.append(await get_product_from_database(product_id=product['id'], session=db_session))
    return product_objects
    
#method for retriving products of a user
#updating the time updated_at inside update function




@router.get("/product-pictures")
async def retrieve_product_pictures():
    pass

@router.delete('/pictures')
async def remove_pictures():
    pass

@router.post("/new-product-feedback")
async def store_new_product_feedback():
    pass

@router.get("/product_feedback")
async def get_product_feedback():
    pass

@router.post("/new-product-report")
async def store_new_product_report():
    pass

