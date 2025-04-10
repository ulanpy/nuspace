from sqladmin import Admin
from backend.routes.admin.models import UserAdmin, ClubAdmin, ClubManagerAdmin


def get_admin(app):
    admin = Admin(app, app.state.db_manager.async_engine)

    # Share the main app's state with SQLAdmin's Starlette app
    admin.admin.state.db_manager = app.state.db_manager
    admin.admin.state.db_manager_sync = app.state.db_manager_sync

    admin.admin.state.kc_manager = app.state.kc_manager

    admin.add_view(UserAdmin)
    admin.add_view(ClubAdmin)
    admin.add_view(ClubManagerAdmin)
    return admin
