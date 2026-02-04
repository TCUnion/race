#!/bin/bash
echo "--- TCU API STARTUP SCRIPT ---"
echo "Current Directory: $(pwd)"
echo "Python Version: $(python3 --version)"
echo "Assigned Port: $PORT"

# 確保 PORT 變數存在，若不存在則預設為 8080 (Zeabur 常用埠號)
FINAL_PORT=${PORT:-8080}
echo "Using Port: $FINAL_PORT"

# 啟動 Uvicorn
echo "Running: uvicorn main:app --host 0.0.0.0 --port $FINAL_PORT"
exec uvicorn main:app --host 0.0.0.0 --port $FINAL_PORT
