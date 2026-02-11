import sys
import os

# 將 main.py 所在的目錄加入 sys.path，解決模組引入問題
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import leaderboard, activities, auth, teams, webhooks
from database import supabase

app = FastAPI()


# 必選的允許來源 (不受環境變數影響，強制啟用)
REQUIRED_ORIGINS = [
    "http://localhost:3000",
    "http://10.0.0.30:3000",
    "https://strava.criterium.tw",
    "https://status-8wp.pages.dev",
    "https://status.criterium.tw",
    "https://n8n.criterium.tw",
    "https://service.criterium.tw"
]

# 從環境變數讀取額外設定，並與必選清單合併
env_origins = os.getenv("CORS_ORIGINS", "").split(",")
origins = list(set(REQUIRED_ORIGINS + [o.strip() for o in env_origins if o.strip()]))

# 當 allow_credentials=True 時，不能包含 "*"
if "*" in origins:
    origins.remove("*")

app.add_middleware(
    CORSMiddleware,
    # 支援 *.criterium.tw 及本地開發來源 (localhost, 10.*, 192.168.*, 127.*)
    allow_origin_regex=r"https?://.*\.criterium\.tw|http://localhost:.*|http://10\..*|http://192\.168\..*|http://127\..*",
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(leaderboard.router)
app.include_router(activities.router)
app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(webhooks.router)

@app.get("/")
def read_root():
    return {"message": "TCU Segment Challenge API"}
