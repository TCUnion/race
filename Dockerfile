FROM python:3.10-slim

WORKDIR /app

# 複製後端相依套件
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有後端程式碼至 /app
COPY backend/ .

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# 確保腳本有執行權限
RUN chmod +x start.sh

# 啟動命令
CMD ["bash", "start.sh"]
