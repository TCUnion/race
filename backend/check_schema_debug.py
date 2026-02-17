
import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import supabase

def check_schema():
    try:
        # Try to select one row to see columns
        print("Fetching one row from segments...")
        res = supabase.table('segments').select('*').limit(1).execute()
        if res.data:
            print("Columns in segments table:", res.data[0].keys())
        else:
            print("Segments table is empty, creating a dummy record to check schema logic is hard without direct schema access.")
            # Alternative: Info schema is not easily accessible via supabase client usually, 
            # unless we use rpc or raw sql if exposed.
            # But seeing keys of a row is usually enough.
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_schema()
