from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.core.configs.config import config
from backend.lifespan import lifespan

app = FastAPI(
    debug=True,
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs" if config.IS_DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.origins,
    allow_credentials=True,
)
app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)
