from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from backend.bootstrap.tracing import tracing_enabled
from backend.core.configs.config import config
from backend.lifespan import lifespan
from backend.middlewares.headers import AccessContextMiddleware
from backend.middlewares.errors import UnhandledExceptionLoggingMiddleware
from backend.middlewares.metrics import PrometheusMetricsMiddleware, metrics_app
from backend.middlewares.tracing import TracingMiddleware

app = FastAPI(
    debug=config.IS_DEBUG,
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs",
    openapi_url="/openapi.json",
    title="nuspace API",
    description=" Nuspace.kz is a SuperApp for NU students that streamlines communication and "
    "replaces disorganized Telegram chats with a more reliable solution. "
    "[Project Github](https://github.com/ulanpy/nuspace)",
)

app.mount("/metrics", metrics_app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.IS_DEBUG else config.ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_MIDDLEWARE_KEY)

app.add_middleware(PrometheusMetricsMiddleware)
app.add_middleware(UnhandledExceptionLoggingMiddleware)
app.add_middleware(AccessContextMiddleware)
if tracing_enabled():
    app.add_middleware(TracingMiddleware)
