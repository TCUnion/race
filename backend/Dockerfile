FROM python:3.10-slim

WORKDIR /app

# 安裝相依套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製程式碼
COPY . .

# 設定環境變數預設值
ENV PORT=8080
ENV HOST=0.0.0.0

# 啟動命令
CMD ["sh", "-c", "uvicorn main:app --host $HOST --port $PORT"]
