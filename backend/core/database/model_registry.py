"""Import all ORM models so they register on ``Base.metadata``.

Call ``import_models()`` from Alembic and any code that needs a complete
metadata graph. Domain models live in modules; this module is the composition
root for SQLAlchemy registration only.
"""


def import_models() -> None:
    # Shared / platform
    from backend.modules.auth import models as _auth_models  # noqa: F401

    # Domain
    from backend.modules.courses import models as _courses_models  # noqa: F401
    from backend.modules.events import models as _events_models  # noqa: F401
    from backend.modules.media import models as _media_models  # noqa: F401
    from backend.modules.notification import models as _notification_models  # noqa: F401
    from backend.modules.opportunities import models as _opportunities_models  # noqa: F401
    from backend.modules.pages import models as _pages_models  # noqa: F401
    from backend.modules.sgotinish import models as _sgotinish_models  # noqa: F401
