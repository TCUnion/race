
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from routers import leaderboard, activities, auth, teams
from database import supabase

app = FastAPI()

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,https://strava.criterium.tw,https://status-8wp.pages.dev,https://status.criterium.tw,https://n8n.criterium.tw,https://service.criterium.tw").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="http://localhost:.*", # 支援本地所有開發埠號
    allow_origins=origins if "*" not in origins else [], # 當有 credentials 時不能用 "*"
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
