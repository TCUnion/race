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
            distance_km = f"{float(race_data.get('distance', 0)) / 1000:.1f}km"
            elevation = f"{race_data.get('total_elevation_gain', race_data.get('elevation_gain', 0))}m"
            description = f"挑戰賽事：{title} | 距離：{distance_km} | 爬升：{elevation}"
            
        # Use automated image generation if no custom image is set
        custom_image = race_data.get("og_image")
        if custom_image and custom_image.startswith('http'):
            image_url = custom_image
        else:
            # Automated generation URL
            image_url = f"https://service.criterium.tw/api/share/image/{segment_id}"
        
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

import polyline

def find_polyline_in_data(data: dict) -> str:
    """
    Recursively find a polyline string in a dictionary.
    Prioritizes 'polyline', 'summary_polyline', 'map.polyline'.
    """
    if not data:
        return ""
    
    # Direct keys
    if isinstance(data.get("polyline"), str) and len(data["polyline"]) > 5:
        return data["polyline"]
    if isinstance(data.get("summary_polyline"), str) and len(data["summary_polyline"]) > 5:
        return data["summary_polyline"]
    
    # Map object
    map_obj = data.get("map")
    if isinstance(map_obj, dict):
        if isinstance(map_obj.get("polyline"), str) and len(map_obj["polyline"]) > 5:
            return map_obj["polyline"]
        if isinstance(map_obj.get("summary_polyline"), str) and len(map_obj["summary_polyline"]) > 5:
            return map_obj["summary_polyline"]
    elif isinstance(map_obj, str) and len(map_obj) > 5:
        return map_obj
        
    return ""

def latlon_to_svg_path(polyline_str: str, width: int = 1200, height: int = 630, padding: int = 50) -> str:
    """
    Convert a polyline string to an SVG path data string.
    Scales the route to fit within the given dimensions with padding.
    """
    try:
        points = polyline.decode(polyline_str)
        if not points:
            return ""
            
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)
        
        lat_span = max_lat - min_lat
        lon_span = max_lon - min_lon
        
        if lat_span == 0 or lon_span == 0:
            return ""
            
        # Determine scale to fit
        # SVG Y grows downwards, so Latitude needs to be inverted relative to max_lat
        available_w = width - (padding * 2)
        available_h = height - (padding * 2)
        
        scale_x = available_w / lon_span
        scale_y = available_h / lat_span
        scale = min(scale_x, scale_y)
        
        # Center the path
        # Calculate the actual drawn width/height
        drawn_w = lon_span * scale
        drawn_h = lat_span * scale
        
        offset_x = padding + (available_w - drawn_w) / 2
        offset_y = padding + (available_h - drawn_h) / 2
        
        path_data = []
        for lat, lon in points:
            x = (lon - min_lon) * scale + offset_x
            y = (max_lat - lat) * scale + offset_y  # Invert Y
            path_data.append(f"{x:.1f},{y:.1f}")
            
        return "M" + " L".join(path_data)
        
    except Exception as e:
        print(f"Error converting polyline to path: {e}")
        return ""


@router.get("/image/{segment_id}")
async def share_image(segment_id: str):
    """
    Dynamically generate a segment summary image.
    Uses a simple SVG template converted to response.
    """
    try:
        # Fetch data
        race_res = supabase.table("team_races").select("*").eq("segment_id", segment_id).execute()
        race_data = race_res.data[0] if race_res.data else None
        
        if not race_data:
            seg_res = supabase.table("segments").select("*").eq("id", segment_id).execute()
            race_data = seg_res.data[0] if seg_res.data else None

        if not race_data:
            raise HTTPException(status_code=404, detail="Segment not found")
            
        # Generate Polyline Path
        poly_str = find_polyline_in_data(race_data)
        path_d = latlon_to_svg_path(poly_str)
        path_element = f'<path d="{path_d}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />' if path_d else ""

        # Logic: Use description as main title if available, else name
        description = race_data.get("description")
        name = race_data.get("name", "Unknown Race")
        
        # If description exists and is not empty, use it. Otherwise use name.
        title_text = description if description and description.strip() else name
        
        dist = f"{float(race_data.get('distance', 0)) / 1000:.1f}km"
        elev = f"{race_data.get('total_elevation_gain', race_data.get('elevation_gain', 0))}m"
        grade = f"{race_data.get('average_grade', 0)}%"
        
        # Logo URL - Assuming hosted on the frontend domain
        logo_url = "https://strava.criterium.tw/tcu-logo-light.png"

        # Simple SVG Template
        svg = f"""
        <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="630" fill="#0f172a"/>
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#grad)"/>
            
            <!-- Polyline Path (Behind text) -->
            {path_element}
            
            <!-- Header Logo -->
            <image href="{logo_url}" x="60" y="60" height="60" />
            
            <!-- Title -->
            <text x="60" y="240" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#ffffff" width="1080">{title_text}</text>
            
            <!-- Stats -->
            <g transform="translate(60, 400)">
                <text x="0" y="0" font-family="Arial, sans-serif" font-size="24" fill="#64748b">DISTANCE</text>
                <text x="0" y="50" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">{dist}</text>
                
                <text x="300" y="0" font-family="Arial, sans-serif" font-size="24" fill="#64748b">ELEVATION</text>
                <text x="300" y="50" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">{elev}</text>
                
                <text x="600" y="0" font-family="Arial, sans-serif" font-size="24" fill="#64748b">AVG GRADE</text>
                <text x="600" y="50" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff">{grade}</text>
            </g>
            
            <!-- Footer -->
            <rect x="0" y="580" width="1200" height="50" fill="#38bdf8"/>
            <text x="600" y="615" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">JOIN THE CHALLENGE AT STRAVA.CRITERIUM.TW</text>
        </svg>
        """
        
        from fastapi.responses import Response
        return Response(content=svg, media_type="image/svg+xml")

    except Exception as e:
        print(f"Error generating OG image: {e}")
        raise HTTPException(status_code=500, detail="Image generation failed")

