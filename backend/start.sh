#!/bin/bash
export PYTHONUNBUFFERED=1
echo "--- TCU API STARTUP SCRIPT ---"
echo "Date: $(date)"
echo "Current Directory: $(pwd)"
echo "Listing files: $(ls -F)"
echo "Python Version: $(python3 --version)"
echo "Assigned Port: $PORT"

# 確保 PORT 變數存在，若不存在則預設為 8080
FINAL_PORT=${PORT:-8080}
echo "Using Port: $FINAL_PORT"

# 啟動 Uvicorn
echo "Starting Uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port $FINAL_PORT
