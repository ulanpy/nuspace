from sqladmin import Admin
from backend.core.database.manager import AsyncDatabaseManager


from backend.routes.admin.models import UserAdmin, ClubAdmin
db = AsyncDatabaseManager()


async def get_admin(app):
    admin = Admin(app, db.async_engine)
    admin.add_view(UserAdmin)
    admin.add_view(ClubAdmin)

    return admin
