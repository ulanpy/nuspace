from sqladmin import Admin
from backend.routes.admin.models import UserAdmin, ClubAdmin


def get_admin(app):
    admin = Admin(app, app.state.db_manager.async_engine)

    # Share the main app's state with SQLAdmin's Starlette app
    admin.admin.state.db_manager = app.state.db_manager
    admin.admin.state.kc_manager = app.state.kc_manager

    admin.add_view(UserAdmin)
    admin.add_view(ClubAdmin)

    return admin
