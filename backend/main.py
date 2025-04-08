# from fastapi import FastAPI
# from starlette.middleware.sessions import SessionMiddleware
# from fastapi.middleware.cors import CORSMiddleware
# from backend.core.configs.config import config


# from backend import lifespan, origins


# app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")

# app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,)
# app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)


from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from backend.core.configs.config import config
from backend import lifespan, origins
from backend.routes import routers  

app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")


app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True)
app.add_middleware(SessionMiddleware, secret_key=config.session_middleware_key)




for router in routers:
    app.include_router(router)

print("=== ALL REGISTERED ROUTES ===")
for route in app.routes:
    print(f"Path: {route.path}, name: {route.name}, methods: {route.methods}")