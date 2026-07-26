from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.core.configs.config import config
from backend.lifespan import lifespan

# Import both the instrumentor and the metrics_app
from backend.middlewares.prometheus_metrics import instrument_app, metrics_app
from backend.modules.routers import routers

app = FastAPI(
    debug=True if config.IS_DEBUG else False,
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs" if config.IS_DEBUG else None,
    redoc_url="/redoc" if config.IS_DEBUG else None,
    openapi_url="/openapi.json" if config.IS_DEBUG else None,
    title="nuspace API",
    description=" Nuspace.kz is a SuperApp for NU students that streamlines communication and "
    "replaces disorganized Telegram chats with a more reliable solution. "
    "[Project Github](https://github.com/ulanpy/nuspace). ",
)

# Routes describe the application and must exist before lifespan starts.
# Keeping them out of startup lets tooling export OpenAPI without connecting to
# Postgres, Redis, Meilisearch, RabbitMQ, GCS, or Telegram.
for router in routers:
    app.include_router(router)

app.mount("/metrics", metrics_app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.IS_DEBUG else config.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_MIDDLEWARE_KEY)

instrument_app(app)
