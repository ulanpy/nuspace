from fastapi import APIRouter

router = APIRouter(tags=["Profile"])


@router.get("/profile")
async def get_profile():
    return
