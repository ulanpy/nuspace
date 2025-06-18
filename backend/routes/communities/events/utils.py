from typing import Tuple

from backend.common.schemas import ResourcePermissions
from backend.core.database.models import Event, EventScope, EventStatus, EventTag
from backend.core.database.models.user import UserRole
from backend.routes.communities.events import schemas


def get_event_permissions(
    event: Event,
    user: Tuple[dict, dict],
) -> ResourcePermissions:
    """
    Determines event permissions for a user based on their role and the event state.

    Args:
        event: The event to check permissions for
        user: The user tuple containing user info and claims

    Returns:
        EventPermissions object containing can_edit, can_delete flags and list of editable fields
    """
    user_role = user[1]["role"]
    user_sub = user[0]["sub"]
    user_communities = user[1]["communities"]

    # Initialize permissions
    permissions = ResourcePermissions()

    # Admin can do everything
    if user_role == UserRole.admin.value:
        permissions.can_edit = True
        permissions.can_delete = True
        permissions.editable_fields = [
            "name",
            "place",
            "event_datetime",
            "description",
            "duration",
            "policy",
            "status",
            "type",
            "tag",
        ]
        return permissions

    # Check if user is event creator
    is_creator = event.creator_sub == user_sub

    # Check if user is community head (for community events)
    is_head = False
    if event.community_id:
        is_head = event.community_id in user_communities

    # Set can_delete permission
    permissions.can_delete = is_creator or (event.scope == EventScope.community and is_head)

    # Set can_edit and editable_fields based on role
    if is_creator or (event.scope == EventScope.community and is_head):
        permissions.can_edit = True
        permissions.editable_fields = [
            "name",
            "place",
            "event_datetime",
            "description",
            "duration",
            "policy",
            "type",
        ]

        # Community head can also edit status
        if is_head or event.scope == EventScope.personal:
            permissions.editable_fields.append("status")

    return permissions


class EventEnrichmentService:
    """Handles the business logic for enriching event data"""

    def __init__(self, user: tuple[dict, dict]):
        self.user = user
        self.user_communities = user[1]["communities"]

    async def enrich_event_data(
        self, event_data: schemas.EventCreateRequest
    ) -> schemas.EnrichedEventCreateRequest:
        # Handle creator_sub
        if event_data.creator_sub == "me":
            event_data.creator_sub = self.user[0].get("sub")

        # Determine scope based on community_id
        scope = EventScope.community if event_data.community_id else EventScope.personal

        if scope == EventScope.community:
            # Determine status based on user role and community membership
            status = await self._determine_event_status(event_data)
        else:
            # don't set status for personal events
            status = EventStatus.approved

        # All created events are regular when created
        tag = EventTag.regular

        return schemas.EnrichedEventCreateRequest(
            **event_data.model_dump(), scope=scope, status=status, tag=tag
        )

    async def _determine_event_status(self, event_data: schemas.EventCreateRequest) -> EventStatus:
        # Business logic for determining status
        if event_data.community_id in self.user_communities:
            return EventStatus.approved
        else:
            return EventStatus.pending
