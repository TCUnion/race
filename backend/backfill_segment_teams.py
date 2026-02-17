
import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import supabase

def backfill():
    print("Fetching active team races...")
    # Fetch all active team races
    races_res = supabase.table('team_races').select('*').eq('is_active', True).execute()
    
    if not races_res.data:
        print("No active team races found.")
        return

    races = races_res.data
    print(f"Found {len(races)} active races. Updating segments...")
    
    count = 0
    for race in races:
        segment_id = race.get('segment_id')
        team_name = race.get('team_name')
        
        if segment_id and team_name:
            print(f"Updating segment {segment_id} with team {team_name}...")
            try:
                # Update the segment metadata with the team name
                supabase.table('segment_metadata').upsert({
                    'segment_id': segment_id,
                    'team_name': team_name
                }).execute()
                count += 1
            except Exception as e:
                print(f"Failed to update segment metadata {segment_id}: {e}")
                
    print(f"Backfill complete. Updated {count} segments.")

if __name__ == "__main__":
    backfill()
