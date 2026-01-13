
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import leaderboard, activities, auth

app = FastAPI()

origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leaderboard.router)
app.include_router(activities.router)
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "TCU Segment Challenge API"}
