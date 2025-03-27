from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from backend.core.configs.config import config


from backend import lifespan, origins

app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")
<<<<<<< HEAD
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow your frontend origin
    allow_credentials=True,
    allow_methods=["*"],       # Allow all HTTP methods
    allow_headers=["*"],       # Allow all headers
)
app.add_middleware(SessionMiddleware, secret_key=session_middleware_key)
=======
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,)
app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)
>>>>>>> b51bca356404a37a8b65092a57da5bf526a78f1e

