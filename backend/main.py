from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from backend.core.configs.config import config


from backend import lifespan, origins
from backend.routes.bot.entry import start_bot

<<<<<<< HEAD
app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")
=======
app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")
>>>>>>> f407768aaefa459b0de1b2b2177d4d77028b40a1
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,)
app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)

if __name__ == "__main__":
    start_bot()
    uvicorn.run(app="backend.main:app", host="fastapi", port=8000, reload=True)
