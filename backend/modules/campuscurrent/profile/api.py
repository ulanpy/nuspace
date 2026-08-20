from typing import Annotated

from fastapi import APIRouter, Depends

from backend.modules.auth.dependencies import get_creds_or_guest

router = APIRouter(tags=["Test Endpoint"])


@router.get("/test_endpoint")
async def get_profile(
):
    """Test endpoint for load testing & benchmarking. Does nothing, returns nothing"""
    return
