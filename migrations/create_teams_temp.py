
import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path="backend/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

def run_migration():
    print("Starting migration...")
    
    # 1. Create teams table
    teams_sql = """
    CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        admin_strava_id TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    """
    
    # 2. Create team_races table
    races_sql = """
    CREATE TABLE IF NOT EXISTS team_races (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        segment_id TEXT NOT NULL,
        name TEXT NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    """

    try:
        # Note: 'rpc' or direct 'query' usually needed for DDL if 'postgres_functions' like exec_sql are not set up.
        # But supabase-py select/insert methods don't run arbitrary SQL DDL easily without an RPC function.
        # However, many Supabase setups have an arbitrary SQL exec function or we can try to use the mcp tool if this fails.
        # Actually, standard supabase-py doesn't support raw SQL execution directly on the client object unless there's a stored procedure.
        # I'll rely on a common request pattern or assume there's a database interaction method I missed, 
        # OR I will try to use the 'mcp_supabase-mcp-server_execute_sql' tool which IS available to me.
        # The prompt says: "You have created the following artifacts...".
        # Let's check available MCP tools again. Yes, 'mcp_supabase-mcp-server_execute_sql' is available.
        # BUT I need 'project_id' for that.
        
        # Alternative: The user has `backend/database.py`. Let's assume I can't easily run DDL via python client without an RPC.
        # I will create this script but I might just use the `run_command` to execute it if it utilized a postgres driver instead of supabase-py.
        # Since I want to be reliable, I will use `psycopg2` or similar if available? 
        # `requirements.txt` only had `supabase`.
        
        # Let's try to find an RPC function 'exec_sql' or similar using the view_file on database related files?
        # Or, I can just use the MCP tool. I'll need to find the project ID.
        pass
    except Exception as e:
        print(f"Error: {e}")

# Re-evaluating: usage of MCP tool is cleaner if I can find project ID.
# Use mcp_supabase-mcp-server_list_projects to find project ID.
