FROM python:3.10-slim

WORKDIR /app

# 複製後端相依套件
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有後端程式碼至 /app
COPY backend/ .

# 設定環境變數
ENV PORT=${WEB_PORT:-8000}
ENV PYTHONPATH=/app

# 啟動命令
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
