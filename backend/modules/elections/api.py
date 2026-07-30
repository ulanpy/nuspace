import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.elections.schemas import SurveyResponseCount
from backend.modules.elections.service import get_survey_responses_count

router = APIRouter(
    prefix="/elections",
    tags=["elections"],
)


async def survey_event_generator(request: Request):
    """
    Yields the survey response count every 2 seconds if it has changed.
    """
    last_count = -1
    while True:
        if await request.is_disconnected():
            break

        count = await get_survey_responses_count()
        if count != last_count:
            yield f"data: {count}\n\n"
            last_count = count
        await asyncio.sleep(2)


@router.get("/counter/stream")
async def stream_election_counter(
    request: Request,
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
):
    """
    Stream the number of submitted responses for the election survey.
    """
    event_generator = survey_event_generator(request)
    return StreamingResponse(event_generator, media_type="text/event-stream")


@router.get("/counter", response_model=SurveyResponseCount)
async def get_election_counter(
    _user: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
) -> SurveyResponseCount:
    """
    Get the number of submitted responses for the election survey.
    """
    count = await get_survey_responses_count()
    return SurveyResponseCount(survey_responses=count)
