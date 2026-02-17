from utils.og_generator import generate_race_og_image
from database import supabase
import sys
import os

def test():
    # 取得一個現有的路段資料來測試
    res = supabase.table("segments").select("*").filter("polyline", "neq", "null").limit(1).execute()
    if not res.data:
        print("No segments with polyline found.")
        return
        
    seg = res.data[0]
    name = seg.get("name", "Test Segment")
    poly = seg.get("polyline")
    dist = seg.get("distance", 0)
    elev = seg.get("elevation_gain", 0)
    
    print(f"Testing with: {name}")
    img_data = generate_race_og_image(name, poly, dist, elev)
    
    if img_data:
        filename = "verify_og.jpg"
        with open(filename, "wb") as f:
            f.write(img_data)
        print(f"Success! Saved to {filename} ({len(img_data)} bytes)")
        print(f"File path: {os.path.abspath(filename)}")
    else:
        print("Failed to generate image.")

if __name__ == "__main__":
    test()
