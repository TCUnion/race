
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from routers import leaderboard, activities, auth, teams
from database import supabase

app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "*").split(",")

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
app.include_router(teams.router)

@app.get("/")
def read_root():
    return {"message": "TCU Segment Challenge API"}
