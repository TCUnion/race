import json
from database import supabase

def query_activity(activity_id, segment_id):
    try:
        response = supabase.table('strava_activities').select('id, name, athlete_id, start_date, segment_efforts_dump').eq('id', activity_id).execute()
        
        if not response.data:
            print(f"No activity found with id {activity_id}.")
            return
            
        activity = response.data[0]
        efforts = activity.get('segment_efforts_dump', [])
        
        # Check if efforts is a string and needs parsing
        if isinstance(efforts, str):
            try:
                efforts = json.loads(efforts)
            except Exception as e:
                print(f"Could not parse segment_efforts_dump: {e}")
                efforts = []
        
        print(f"Activity ID: {activity['id']} | Name: {activity['name']} | Athlete: {activity['athlete_id']} | Date: {activity['start_date']}")
        print(f"Total segment efforts in activity: {len(efforts) if efforts else 0}")
        
        found = False
        if efforts:
            for effort in efforts:
                seg = effort.get('segment', {})
                eff_seg_id = str(seg.get('id', ''))
                if eff_seg_id == str(segment_id):
                    print("\n--- MATCH FOUND ---")
                    print(json.dumps(effort, indent=2, ensure_ascii=False))
                    found = True
                    break
        
        if not found:
            print(f"\nSegment {segment_id} NOT found in activity {activity_id}.")
            
    except Exception as e:
        print(f"Error querying data: {e}")

if __name__ == '__main__':
    query_activity(17458787106, 36682762)
