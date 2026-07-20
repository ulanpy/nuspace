"""Process startup: create infra clients and attach them to the FastAPI app.

Domain-specific registration (Meilisearch indexes, bot wiring, Rabbit
subscribers) lives in modules and is wired from ``lifespan.py``.
"""
