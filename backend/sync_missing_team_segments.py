import os
import sys
from datetime import datetime
from database import supabase

def sync_missing_segments():
    print("Starting sync of missing team segments...")
    
    # 1. Get all active team races
    try:
        response = supabase.table('team_races').select('*').eq('is_active', True).execute()
        team_races = response.data
        print(f"Found {len(team_races)} active team races.")
    except Exception as e:
        print(f"Error fetching team races: {e}")
        return

    # 2. Check each race against segments table
    for race in team_races:
        segment_id = race.get('segment_id')
        if not segment_id:
            continue
            
        print(f"Checking segment {segment_id} for race '{race.get('name')}'...")
        
        try:
            # Check if segment exists
            seg_res = supabase.table('segments').select('id').eq('id', segment_id).execute()
            
            if not seg_res.data:
                print(f"Segment {segment_id} missing! Inserting...")
                
                # Prepare segment data from race data
                new_segment = {
                    "id": segment_id,
                    "strava_id": segment_id,
                    "name": race.get('name'),
                    "description": race.get('name'), # Use race name as description if missing
                    "distance": race.get('distance'),
                    "average_grade": race.get('average_grade'),
                    "elevation_gain": race.get('elevation_gain'),
                    "total_elevation_gain": race.get('elevation_gain'), # Sync field name
                    "polyline": race.get('polyline'),
                    "start_date": race.get('start_date'),
                    "end_date": race.get('end_date'),
                    "is_active": True,
                    "activity_type": "Ride" # Default
                }
                
                # Insert
                insert_res = supabase.table('segments').insert(new_segment).execute()
                print(f"Inserted segment {segment_id}: {insert_res.data}")
            else:
                print(f"Segment {segment_id} exists. Updating team info if needed...")
                # Optional: Update team info if it's missing in segments but present in team_races
                # This handles the case where backfill might have missed active races logic
                supabase.table('segments').update({
                    "start_date": race.get('start_date'),
                    "end_date": race.get('end_date')
                }).eq('id', segment_id).execute()
                print("Updated segment team info.")
                
        except Exception as e:
            print(f"Error processing segment {segment_id}: {e}")

    print("Sync completed.")

if __name__ == "__main__":
    sync_missing_segments()
