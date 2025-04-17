from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend import lifespan, origins
from backend.core.configs.config import config

app = FastAPI(debug=True, lifespan=lifespan, root_path="/api", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
)
app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)
