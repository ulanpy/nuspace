from fastapi import APIRouter, Depends, Request
from .__init__ import *
from backend.common.utils import *
from backend.common.dependencies import get_db_session
from backend.core.database.models.grocery import Grocery, GroceryCategory, Company, GroceryFeedback
from .cruds import (
    show_groceries, 
    add_new_grocery_to_database,
    remove_grocery,
    add_new_feedback_to_database,
    add_new_grocery_category,
    remove_grocery_category,
    update_grocery_category,
    add_new_grocery_company,
    show_company,
    update_grocery,
    remove_grocery_feedback
)
from backend.routes.magnum.schemas import GrocerySchema, GroceryCategorySchema, GroceryFeedbackSchema, CompanySchema, GroceryCreateSchema


router = APIRouter(tags=['Grocery Routes'])


@router.post("/new-grocery")
async def add_new_grocery(grocery_data: GroceryCreateSchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await add_new_grocery_to_database(db_session, grocery_data)

@router.get("/all-groceries")
async def show_all_groceries(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await show_groceries(session=db_session, size=1, page=1)

@router.get("/groceries/{grocery_id}")
async def show_grocery(grocery_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await show_full_grocery(session=db_session, grocery_id=grocery_id)

@router.delete("/remove-grocery")
async def remove_grocery(grocery_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await remove_grocery(db_session, grocery_id)

@router.put("/update-grocery")
async def update_grocery(grocery_id: int, grocery_data: GrocerySchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await update_grocery(db_session, grocery_data)

@router.get("/search-for-grocery")
async def search_groceries(keyword: str, request: Request):
    return await search_for_meilisearch_data(storage_name="groceries", keyword=keyword)

# @router.get("/filter-groceries")
# async def filter_groceries_by_category_route(request: Request, grocery_category: GroceryCategorySchema, size: int = 10, page: int = 1, db_session: AsyncSession = Depends(get_db_session)):
#     return await filter_groceries_by_category(db_session, size, page, grocery_category)

@router.post("/new-feedback")
async def add_new_feedback(feedback_data: GroceryFeedbackSchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await add_new_feedback_to_database(db_session, feedback_data)

@router.delete("/remove-feedback")
async def remove_feedback(feedback_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await remove_grocery_feedback(db_session, feedback_id)

# --- COMPANY ---
@router.get("/company")
async def show_all_company(db_session: AsyncSession = Depends(get_db_session)):
    return await show_company(db_session)

@router.post("/new-company")
async def add_new_company(company_data: CompanySchema, db_session: AsyncSession = Depends(get_db_session)):
    return await add_new_grocery_company(db_session, company_data)

# --- CATEGORY ---
@router.post("/new-category")
async def add_new_category(category_data: GroceryCategorySchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await add_new_grocery_category(db_session, category_data)

@router.get("/category")
async def show_all_categories(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await show_categories(session=db_session, size=1, page=1)

@router.delete("/remove-category")
async def remove_category(category_id: int, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await remove_grocery_category(db_session, category_id)

@router.put("/update-category")
async def update_category(category_data: GroceryCategorySchema, request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await update_grocery_category(db_session, category_data)
