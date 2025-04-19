from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, Request
from backend.routes.google_bucket.schemas import  MediaSection
from backend.core.database.models.dormeats import CanteenProductCategory, CanteenProduct
from .schemas import CanteenProductRequestSchema, CanteenProductResponseSchema


# create read update delete
# add get update delete
async def add_new_canteenproduct_to_db(
        session: AsyncSession, 
        request: Request, 
        product_data: CanteenProductRequestSchema,
        media_section: MediaSection = MediaSection.de
) -> CanteenProductResponseSchema: 
    from .utils import build_canteen_product_response
    new_canteenproduct = CanteenProduct(**product_data.dict())
    session.add(new_canteenproduct)
    await session.commit()
    await session.refresh(new_canteenproduct)
    
    return await build_canteen_product_response(canteen_product = new_canteenproduct, session = session, request = request, media_section = media_section)



# front: scales like in small veggies section
async def filter_canteenproducts_from_db(
        session: AsyncSession,
        category: CanteenProductCategory
):
    pass

    
    



