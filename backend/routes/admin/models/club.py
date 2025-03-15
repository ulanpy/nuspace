from backend.core.database.models import Club
from backend.routes.auth import UserRole
from backend.common.schemas import JWTSchema
from backend.common.dependencies import get_jwt_data
from sqladmin import ModelView
from fastapi import Request, HTTPException
from markupsafe import Markup

class ClubAdmin(ModelView, model=Club):
    icon = "fa-solid fa-users"
    category = "Clubs"

    # 1. Column Configuration
    column_list = [
        Club.picture,
        Club.name,
        Club.description,
        Club.president_user,  # Show relationship in list view
        Club.telegram_url,
        Club.instagram_url
    ]

    column_searchable_list = [Club.name]

    form_ajax_refs = {
        "president_user": {
            "fields": ("name","email"),
            "order_by": "name",
            "limit": 10
        }
    }


    @staticmethod
    def _format_photo_url(obj: Club, context) -> str:
        if obj.picture:
            return Markup(f'<img src="{obj.picture}" alt="Club Photo" width="50" height="50">')
        return "No Image"

    column_formatters = {
        "picture": _format_photo_url,
        "president": lambda m, c: m.president_user.name if m.president_user else "Unknown"
    }

    def is_accessible(self, request: Request):
        try:
            user: JWTSchema = get_jwt_data(request)
            if str(user.role) == UserRole.admin.value:
                return True
            else:
                raise HTTPException(status_code=403, detail="unauthorized")
        except HTTPException as e:
            raise e