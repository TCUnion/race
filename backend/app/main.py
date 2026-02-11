from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from routers import leaderboard, activities, auth, teams
from database import supabase

app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    # 支援本地開發來源 (localhost, 10.*, 192.168.*, 127.*)
    allow_origin_regex=r"http://localhost:.*|http://10\..*|http://192\.168\..*|http://127\..*",
    allow_origins=origins if "*" not in origins else [],
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
