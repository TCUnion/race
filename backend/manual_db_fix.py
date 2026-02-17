import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def probe():
    host = "db.criterium.tw"
    port = 5432
    user = "postgres"
    password = os.getenv("PASSWORD") # From root .env
    dbname = "postgres" # Default Supabase DB name
    
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
        cur.execute("SELECT 1")
        print("Query test successful!")
        
        # Check if table segments exists and has team_name
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'segments' AND column_name = 'team_name'
        """)
        res = cur.fetchone()
        if res:
            print("Column 'team_name' already exists in 'segments'!")
        else:
            print("Column 'team_name' is MISSING in 'segments'.")
            print("Attempting to add column...")
            cur.execute("ALTER TABLE segments ADD COLUMN IF NOT EXISTS team_name TEXT;")
            conn.commit()
            print("Column added successfully!")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    probe()
