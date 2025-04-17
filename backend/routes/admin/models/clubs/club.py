from fastapi import HTTPException, Request
from markupsafe import Markup
from sqladmin.models import ModelView

from backend.core.database.manager import SyncDatabaseManager
from backend.core.database.models import Club
from backend.routes.auth import UserRole
from backend.routes.auth.cruds import get_user_role_sync
from backend.routes.auth.utils import validate_access_token_sync


class ClubAdmin(ModelView, model=Club):
    icon = "fa-solid fa-users"
    category = "Clubs"

    # 1. Column Configuration
    column_list = [
        Club.picture,
        Club.name,
        Club.description,
        Club.president_user,
        # Show relationship in list view
        Club.telegram_url,
        Club.instagram_url,
    ]

    column_searchable_list = [Club.name, Club.president_user]

    form_columns = [
        Club.name,
        Club.type,  # Added Club Type, assuming you want to edit this
        Club.description,
        Club.president_user,  # Use the RELATIONSHIP field for selection
        Club.telegram_url,
        Club.instagram_url,
        Club.picture,
    ]
    form_ajax_refs = {
        "president_user": {
            "fields": ("name",),  # Search both name and surname
            "order_by": ("name",),
            "limit": 10,
        }
    }

    @staticmethod
    def _format_photo_url(obj: Club, context) -> str:
        if obj.picture:
            return Markup(
                f'<img src="{obj.picture}" alt="Club Photo" width="50" height="50">'
            )
        return "No Image"

    column_formatters = {
        "picture": _format_photo_url,
        "president_user": lambda m, c: (
            m.president_user.name if m.president_user else "Unknown"
        ),
    }

    def is_accessible(self, request: Request):
        try:
            db_manager_sync: SyncDatabaseManager = request.app.state.db_manager_sync
            kc_manager = request.app.state.kc_manager

            sub = validate_access_token_sync(
                request.cookies.get("access_token"), kc_manager
            )["sub"]

            # Use async with instead of async for
            with db_manager_sync.get_sync_session() as session:
                user_role = get_user_role_sync(session, sub)
                print(user_role)
                if str(user_role) == UserRole.admin.value:
                    return True
                else:
                    raise HTTPException(status_code=403, detail="unauthorized")
        except HTTPException as e:
            raise e
        except Exception as e:
            # Catch other potential errors
            raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
