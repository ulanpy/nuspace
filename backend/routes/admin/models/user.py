from backend.core.database.models import User, UserRole
from backend.common.schemas import JWTSchema
from backend.common.dependencies import get_jwt_data

from fastapi import Request, HTTPException
from markupsafe import Markup
from sqladmin import ModelView

# Custom ModelView for User
class UserAdmin(ModelView, model=User):
    icon = "fa-solid fa-user"
    category = "Accounts"
    column_list = [User.email, User.picture, User.role, User.scope, User.name, User.surname, User.created_at, User.updated_at]
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

    # Override is_accessible to restrict access
    def is_accessible(self, request: Request):
        try:
            user: JWTSchema = get_jwt_data(request)
            if str(user.role) == UserRole.admin.value:
                return True
            else:
                raise HTTPException(status_code=403, detail="unauthorized")
        except HTTPException as e:
            raise e

