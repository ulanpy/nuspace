from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import ORJSONResponse

from backend.core.configs.config import config
from backend.lifespan import lifespan

# Import both the instrumentor and the metrics_app
from backend.middlewares.prometheus_metrics import instrument_app, metrics_app

app = FastAPI(
    debug=config.IS_DEBUG,
    lifespan=lifespan,
    default_response_class=ORJSONResponse, # for performance
    root_path="/api",
    docs_url="/docs" if config.IS_DEBUG else None,
    redoc_url="/redoc" if config.IS_DEBUG else None,
    openapi_url="/openapi.json" if config.IS_DEBUG else None,
    title="NU Space API",
    description=" Nuspace.kz is a SuperApp for NU students that streamlines communication and "
    "replaces disorganized Telegram chats with a more reliable solution. "
    "[Project Github](https://github.com/ulanpy/nuspace). ",
    version="1.0.4",
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

instrument_app(app)
