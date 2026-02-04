FROM python:3.10-slim

WORKDIR /app

# 因為 Zeabur 根目錄設為 backend，所以這裡直接複製當前目錄內容
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# 確保腳本有執行權限
RUN chmod +x start.sh

# 啟動命令 (由平台注入 $PORT)
CMD ["bash", "start.sh"]
