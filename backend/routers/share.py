from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from database import supabase

router = APIRouter(
    prefix="/api/share",
    tags=["share"]
)

@router.get("/race/{segment_id}", response_class=HTMLResponse)
async def share_race(segment_id: str):
    """
    Generate an HTML page with Open Graph tags for Facebook sharing.
    This page will automatically redirect to the frontend dashboard.
    """
    try:
        # 1. Fetch race details from team_races (preferred)
        # We try to find a race associated with this segment_id
        race_res = supabase.table("team_races").select("*").eq("segment_id", segment_id).execute()
        
        race_data = None
        if race_res.data and len(race_res.data) > 0:
            race_data = race_res.data[0]
        
        # 2. If not found in team_races, fetch from segments (fallback)
        if not race_data:
            seg_res = supabase.table("segments").select("*").eq("id", segment_id).execute()
            if seg_res.data and len(seg_res.data) > 0:
                race_data = seg_res.data[0]
                # Fetch metadata from extension table
                meta_res = supabase.table("segment_metadata").select("og_image").eq("segment_id", segment_id).execute()
                if meta_res.data and len(meta_res.data) > 0:
                    race_data["og_image"] = meta_res.data[0].get("og_image")
        
        if not race_data:
            raise HTTPException(status_code=404, detail="Race or Segment not found")

        # 3. Construct OG Tag Content
        title = race_data.get("name", "Unknown Race")
        description = race_data.get("description", "")
        if not description:
            # Fallback description if empty
            distance_km = f"{float(race_data.get('distance', 0)) / 1000:.1f}km"
            elevation = f"{race_data.get('total_elevation_gain', race_data.get('elevation_gain', 0))}m"
            description = f"挑戰賽事：{title} | 距離：{distance_km} | 爬升：{elevation}"
            
        # Use custom image if provided, otherwise default
        custom_image = race_data.get("og_image")
        if custom_image:
            image_url = custom_image
        else:
            image_url = "https://strava.criterium.tw/og-image.png"
        
        # The URL that Facebook will index (this endpoint)
        # It's important that this URL is publicly accessible
        # Since we are in the backend, we construct it based on the request or hardcode base URL
        # For now, let's assume valid base URL is passed or handled by the caller
        
        # Redirect URL (Frontend Dashboard)
        redirect_url = f"https://strava.criterium.tw/dashboard?segment_id={segment_id}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{title}</title>
            
            <!-- Open Graph / Facebook -->
            <meta property="fb:app_id" content="1964978887489880">
            <meta property="og:type" content="website">
            <meta property="og:url" content="https://service.criterium.tw/api/share/race/{segment_id}">
            <meta property="og:title" content="{title}">
            <meta property="og:description" content="{description}">
            <meta property="og:image" content="{image_url}">
            
            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="https://service.criterium.tw/api/share/race/{segment_id}">
            <meta property="twitter:title" content="{title}">
            <meta property="twitter:description" content="{description}">
            <meta property="twitter:image" content="{image_url}">

            <!-- Redirect to actual content -->
            <meta http-equiv="refresh" content="0;url={redirect_url}">
            <script type="text/javascript">
                window.location.href = "{redirect_url}";
            </script>
        </head>
        <body>
            <p>Redirecting to <a href="{redirect_url}">{title}</a>...</p>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content)

    except Exception as e:
        print(f"Error generating share page: {e}")
        # Identify as server error but still redirect to home if possible as fail-safe
        fail_safe_url = "https://strava.criterium.tw/dashboard"
        return HTMLResponse(content=f'<script>window.location.href="{fail_safe_url}";</script>', status_code=500)
