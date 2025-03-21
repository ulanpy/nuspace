import uvicorn
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware


from backend import lifespan, origins, session_middleware_key


app = FastAPI(debug=True, lifespan=lifespan, root_path="/api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allow your frontend origin
    allow_credentials=True,
    allow_methods=["*"],       # Allow all HTTP methods
    allow_headers=["*"],       # Allow all headers
)
app.add_middleware(SessionMiddleware, secret_key=session_middleware_key)

if __name__ == "__main__":
    uvicorn.run(app="backend.main:app", host="fastapi", port=8000, reload=True)
