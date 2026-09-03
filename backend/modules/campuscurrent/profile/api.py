from fastapi import APIRouter

router = APIRouter(tags=["Test Endpoint"])


@router.get("/test_endpoint")
async def get_profile():
    """Test endpoint for load testing & benchmarking. Does nothing, returns nothing"""
    return
