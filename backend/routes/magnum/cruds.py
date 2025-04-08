from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from backend.core.database.models.grocery import Grocery, GroceryCategory, Company, GroceryFeedback
from backend.routes.magnum.schemas import GrocerySchema, GroceryCategorySchema, CompanySchema, GroceryFeedbackSchema, GroceryCreateSchema
from backend.common.utils import add_meilisearch_data

# --- POST - GROCERY ---
async def add_new_grocery_to_database(session: AsyncSession, grocery_schema: GroceryCreateSchema):
    new_grocery = Grocery(**grocery_schema.model_dump())
    
    session.add(new_grocery)
    await session.commit()
    await session.refresh(new_grocery)
    return new_grocery


# # --- GET - GROCERY ---

async def show_groceries(session: AsyncSession, size: int, page: int):
    offset = size * (page - 1)
    result = await session.execute(
        select(Grocery).offset(offset).limit(size)
    )
    groceries = result.scalars().all()
    return groceries

async def show_full_grocery(session: AsyncSession, grocery_id: int):
    result = await session.execute(
        select(Grocery)
        .options(
            joinedload(Grocery.category),
            joinedload(Grocery.company),
            joinedload(Grocery.feedbacks)
        )
        .filter(Grocery.id == grocery_id)
    )
    grocery = result.scalars().first()
    return grocery

# # --- UPDATE - GROCERY ---
async def update_grocery(session: AsyncSession, grocery_schema: GrocerySchema):
    result = await session.execute(select(Grocery).filter_by(id=grocery_schema.id))
    grocery = result.scalars().first()
    if grocery:
        for key, value in grocery_schema.model_dump().items():
            setattr(grocery, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(grocery)
    return grocery


# # --- DELETE - GROCERY ---

async def remove_grocery(session: AsyncSession, grocery_schema: GrocerySchema):
    grocery = await session.execute(select(Grocery).filter_by(id=grocery_schema.id)).scalars().first()
    if grocery:
        await session.delete(grocery)
        await session.commit()
        return True
    else:
        return False



# --- GET - FEEDBACK ---
async def add_new_feedback_to_database(session: AsyncSession, grocery_feedback_schema: GroceryFeedbackSchema):
    new_feedback = GroceryFeedback(**grocery_feedback_schema.model_dump())
    session.add(new_feedback)
    await session.commit()
    await session.refresh(new_feedback)
    return new_feedback

# --- UPDATE -- FEEDBACK --- 
async def update_grocery_feedback(session: AsyncSession, grocery_feedback_schema: GroceryFeedbackSchema):
    feedback = await session.execute(select(GroceryFeedback).filter_by(id=grocery_feedback_schema.id)).scalars().first()
    if feedback:
        for key, value in grocery_feedback_schema.model_dump().items():
            setattr(feedback, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(feedback)
    return feedback


# --- DELETE - FEEDBACK --- 
 
async def remove_grocery_feedback(session: AsyncSession, grocery_feedback_schema: GroceryFeedbackSchema):
    feedback = await session.execute(select(GroceryFeedback).filter_by(id=grocery_feedback_schema.id)).scalars().first()
    if feedback:
        await session.delete(feedback)
        await session.commit()
        return True
    else:
        return False
    
# ---- COMPANY ----

# --- GET - COMPANY ---
async def show_company(session: AsyncSession):
    result = await session.execute(select(Company))
    companies = result.scalars().all()
    return companies

# --- POST - COMPANY ---
async def add_new_grocery_company(session: AsyncSession, company_schema: CompanySchema):
    new_company = Company(**company_schema.model_dump())
    session.add(new_company)
    await session.commit()
    await session.refresh(new_company)
    return new_company

# # --- CATEGORY ---

# # --- GET - CATEGORY ---
async def show_categories(session: AsyncSession, size: int, page: int):
    # offset = size * (page - 1)
    # result = await session.execute(select(GroceryCategory).offset(offset).limit(size))
    result = await session.execute(select(GroceryCategory))
    categories = result.scalars().all()
    return categories

# # --- POST - CATEGORY ---
async def add_new_grocery_category(session: AsyncSession, grocery_category_schema: GroceryCategorySchema):
    new_category = GroceryCategory(**grocery_category_schema.model_dump())
    session.add(new_category)
    await session.commit()
    await session.refresh(new_category)
    return new_category

# # --- DELETE - CATEGORY ---
async def remove_grocery_category(session: AsyncSession, grocery_category_schema: GroceryCategorySchema):
    category = await session.execute(select(GroceryCategory).filter_by(id=grocery_category_schema.id)).scalars().first()
    if category:
        await session.delete(category)
        await session.commit()
        return True
    else:
        return False
# # --- UPDATE - CATEGORY ---
async def update_grocery_category(session: AsyncSession, grocery_category_schema: GroceryCategorySchema):
    result = await session.execute(select(GroceryCategory).filter_by(id=grocery_category_schema.id))
    category = result.scalars().first()
    if category:
        for key, value in grocery_category_schema.model_dump().items():
            setattr(category, key, value)
    else:
        return False
    await session.commit()
    await session.refresh(category)
    return category

# # -- FILTERING ---
# async def filter_groceries_by_category(session: AsyncSession, size: int, page: int, grocery_category_schema: GroceryCategorySchema):
#     offset = size * (page - 1)
#     result = await session.execute(
#         select(Grocery).filter_by(category_id=grocery_category_schema.id).offset(offset).limit(size)
#     )
#     groceries = result.scalars().all()
#     return groceries
