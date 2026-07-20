"""Feature modules package.

HTTP routers are registered in ``backend.modules.routers`` (imported from lifespan).
Keep this package init free of side-effect imports so ORM models can load cleanly.
"""
