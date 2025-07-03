from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# Import both the instrumentor and the metrics_app
from monitoring.prometheus_metrics import instrument_app, metrics_app

from backend.core.configs.config import config
from backend.lifespan import lifespan

app = FastAPI(
    debug=config.IS_DEBUG,
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs" if config.IS_DEBUG else None,
    redoc_url="/redoc" if config.IS_DEBUG else None,
    openapi_url="/openapi.json" if config.IS_DEBUG else None,
    title="NU Space API",
    description=" Nuspace.kz is a secure, verified platform "
    "for NU students that streamlines communication and "
    "replaces disorganized Telegram chats with a more reliable solution. "
    "[Project Github](https://github.com/ulanpy/nuspace). ",
    version="1.0.1",
)

# 1. Mount the metrics app at a fixed path, independent of root_path
# This will now always be available at /metrics
app.mount("/metrics", metrics_app)

# 2. Add other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.IS_DEBUG else config.ORIGINS,
    allow_credentials=True,
)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_MIDDLEWARE_KEY)

# 3. Apply the Prometheus instrumentation middleware LAST
# This ensures it measures the latency of all other middleware as well
instrument_app(app)

# Your API routers would be included after this
# from backend.api import router
# app.include_router(router)