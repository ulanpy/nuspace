from backend.core.database.models import User, UserRole

from fastapi import Request, HTTPException
from markupsafe import Markup
from sqladmin import ModelView


from backend.routes.auth.utils import validate_access_token_sync
from backend.routes.auth.cruds import get_user_role_sync
from backend.core.database.manager import SyncDatabaseManager

# Custom ModelView for User
class UserAdmin(ModelView, model=User):
    icon = "fa-solid fa-user"
    category = "Accounts"
    column_list = [User.email, User.picture, User.telegram_id, User.role, User.scope, User.name, User.surname, User.created_at, User.updated_at]
    column_sortable_list = [User.email, User.name, User.surname, User.created_at]
    column_searchable_list = [User.email, User.name, User.role, User.surname]
    column_details_list = [User.email, User.picture, User.role, User.scope, User.name, User.surname, User.created_at, User.updated_at]

    # Render the 'picture' column as an image

    @staticmethod
    def _format_photo_url(obj: User, context) -> str:
        if obj.picture:
            # Use Markup to mark the HTML string as safe
            return Markup(
                f'<img src="{obj.picture}" alt="User Photo" width="50" height="50">'
            )
        return "No Image"

    column_formatters = {
        "picture": _format_photo_url,  # Apply the custom formatter to the column

    }
    column_formatters_detail = column_formatters
    column_labels = {"picture": "Photo",
                     "created_at": "Created At (UTC)"  # Properly label the 'created_at' column
                     }  # Set a user-friendly label

    def is_accessible(self, request: Request):
        try:
            db_manager_sync: SyncDatabaseManager = request.app.state.db_manager_sync
            kc_manager = request.app.state.kc_manager

            sub = validate_access_token_sync(
                request.cookies.get("access_token"),
                kc_manager
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
