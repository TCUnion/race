import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    host = "db.criterium.tw"
    port = 5432
    user = "postgres"
    password = os.getenv("PASSWORD")
    dbname = "postgres"
    
    print(f"Connecting to {host}:{port}...")
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
            connect_timeout=5
        )
        print("Connection successful!")
        cur = conn.cursor()
        
        print("Adding 'og_image' column to 'segments' table...")
        cur.execute("ALTER TABLE segments ADD COLUMN IF NOT EXISTS og_image TEXT;")
        conn.commit()
        print("Migration successful!")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
