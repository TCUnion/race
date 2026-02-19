from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse, Response
from database import supabase

router = APIRouter(
    prefix="/api/share",
    tags=["share"]
)

# NOTE: 社群平台爬蟲 User-Agent 列表，用於區分爬蟲與人類訪客
BOT_USER_AGENTS = [
    'facebookexternalhit',  # Facebook 爬蟲
    'Facebot',              # Facebook 爬蟲
    'Twitterbot',           # Twitter/X 爬蟲
    'LinkedInBot',          # LinkedIn 爬蟲
    'Line',                 # LINE 爬蟲
    'Slackbot',             # Slack 爬蟲
    'Discordbot',           # Discord 爬蟲
    'TelegramBot',          # Telegram 爬蟲
    'WhatsApp',             # WhatsApp 爬蟲
    'Googlebot',            # Google 爬蟲
]

def _is_bot(user_agent: str) -> bool:
    """判斷 User-Agent 是否為社群平台爬蟲"""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    return any(bot.lower() in ua_lower for bot in BOT_USER_AGENTS)

@router.get("/race/{segment_id}", response_class=HTMLResponse)
async def share_race(segment_id: str, request: Request):
    """
    Generate an HTML page with Open Graph tags for Facebook sharing.
    爬蟲訪問時只回傳 OG 標籤（不重導），人類訪問時自動重導至前端頁面。
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
        # NOTE: OG 標題優先使用 description（賽事副標題），再回退至 name（Strava 路段原名）
        title = race_data.get("description") or race_data.get("name", "Unknown Race")

        # 從 segment_metadata 取得 race_description（挑戰內容長文）作為 OG 描述
        meta_desc_res = supabase.table("segment_metadata").select("race_description").eq("segment_id", segment_id).execute()
        race_description = ""
        if meta_desc_res.data and len(meta_desc_res.data) > 0:
            race_description = meta_desc_res.data[0].get("race_description", "") or ""

        # OG 描述：優先使用 race_description，再回退至距離/爬升摘要
        if race_description.strip():
            description = race_description.strip()
        else:
            distance_km = f"{float(race_data.get('distance', 0)) / 1000:.1f}km"
            elevation = f"{race_data.get('total_elevation_gain', race_data.get('elevation_gain', 0))}m"
            description = f"挑戰賽事：{title} | 距離：{distance_km} | 爬升：{elevation}"
            
        # Use automated image generation if no custom image is set
        custom_image = race_data.get("og_image")
        if custom_image and custom_image.startswith('http'):
            image_url = custom_image
        else:
            # Automated generation URL
            image_url = f"https://tcuapi.zeabur.app/api/share/image/{segment_id}"
        
        # Redirect URL (Frontend Dashboard)
        redirect_url = f"https://strava.criterium.tw/dashboard?segment_id={segment_id}"

        # NOTE: 偵測是否為社群爬蟲，爬蟲只需要 OG 標籤不需要重導
        user_agent = request.headers.get("user-agent", "")
        is_bot = _is_bot(user_agent)

        # OG 標籤區塊（爬蟲和人類共用）
        og_tags = f"""
            <meta charset="utf-8">
            <title>{title}</title>
            
            <!-- Open Graph / Facebook -->
            <meta property="fb:app_id" content="1964978887489880">
            <meta property="og:type" content="website">
            <meta property="og:url" content="https://tcuapi.zeabur.app/api/share/race/{segment_id}">
            <meta property="og:title" content="{title}">
            <meta property="og:description" content="{description}">
            <meta property="og:image" content="{image_url}">
            <meta property="og:image:width" content="1200">
            <meta property="og:image:height" content="630">
            
            <!-- Twitter -->
            <meta property="twitter:card" content="summary_large_image">
            <meta property="twitter:url" content="https://tcuapi.zeabur.app/api/share/race/{segment_id}">
            <meta property="twitter:title" content="{title}">
            <meta property="twitter:description" content="{description}">
            <meta property="twitter:image" content="{image_url}">
        """

        if is_bot:
            # 爬蟲版本：只有 OG 標籤，不含任何重導邏輯
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                {og_tags}
            </head>
            <body>
                <h1>{title}</h1>
                <p>{description}</p>
                <p><a href="{redirect_url}">前往挑戰頁面</a></p>
            </body>
            </html>
            """
        else:
            # 人類版本：OG 標籤 + JavaScript 重導至前端頁面
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                {og_tags}
                <meta http-equiv="refresh" content="1;url={redirect_url}">
                <script type="text/javascript">
                    window.location.href = "{redirect_url}";
                </script>
            </head>
            <body>
                <p>正在前往 <a href="{redirect_url}">{title}</a>...</p>
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

from PIL import Image, ImageDraw, ImageFont
import io
import math

def latlon_to_pixels(lat, lon, min_lat, max_lat, min_lon, max_lon, width, height, padding):
    """Convert lat/lon to pixel coordinates using Mercator projection"""
    # Convert all to radians for consistency
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    max_lat_rad = math.radians(max_lat)
    min_lat_rad = math.radians(min_lat)
    max_lon_rad = math.radians(max_lon)
    min_lon_rad = math.radians(min_lon)
    
    # Mercator projection-like scaling
    def y_merc(l): return math.log(math.tan(math.pi/4 + l/2))
    
    y = y_merc(lat_rad)
    y_min = y_merc(min_lat_rad)
    y_max = y_merc(max_lat_rad)
    
    # Use radians for X to match Y's scale
    x = lon_rad
    x_min = min_lon_rad
    x_max = max_lon_rad
    
    # Scale to fit width/height
    x_span = x_max - x_min
    y_span = y_max - y_min
    
    if x_span == 0 or y_span == 0:
        return width/2, height/2

    available_w = width - 2*padding
    available_h = height - 2*padding
    
    scale_x = available_w / x_span
    scale_y = available_h / y_span
    scale = min(scale_x, scale_y)
    
    # Center
    drawn_w = x_span * scale
    drawn_h = y_span * scale
    offset_x = padding + (available_w - drawn_w) / 2
    offset_y = padding + (available_h - drawn_h) / 2
    
    px = (x - x_min) * scale + offset_x
    py = height - ((y - y_min) * scale + offset_y) # Invert Y for image coords
    
    return px, py

@router.get("/image/{segment_id}")
async def share_image(segment_id: str):
    """
    Dynamically generate a PNG image for Open Graph sharing.
    Uses Pillow to draw text and polyline on a background.
    """
    # from fastapi.responses import Response # Moved to top-level
    try:
        # 1. Fetch Data
        race_res = supabase.table("team_races").select("*").eq("segment_id", segment_id).execute()
        race_data = race_res.data[0] if race_res.data else None
        
        if not race_data:
            # Fallback to segments table
            seg_res = supabase.table("segments").select("*").eq("id", segment_id).execute()
            race_data = seg_res.data[0] if seg_res.data else None

        if not race_data:
            raise Exception("Segment not found")
            
        # 2. Setup Image
        W, H = 1200, 630
        img = Image.new('RGB', (W, H), color='#0f172a')
        draw = ImageDraw.Draw(img)
        
        # Background pattern (subtle lines)
        for y in range(H):
            r = int(30 - (y/H)*15)
            g = int(41 - (y/H)*18)
            b = int(59 - (y/H)*17)
            draw.line([(0, y), (W, y)], fill=(r, g, b))

        # 3. Load Fonts (Moved up)
        try:
            import os
            current_dir = os.path.dirname(__file__)
            # Path to bundled font: backend/assets/fonts/NotoSansTC-Bold.otf
            # We are in backend/routers/, so go up one level then to assets/fonts
            font_path = os.path.join(current_dir, "../assets/fonts/NotoSansTC-Bold.otf")
            
            print(f"DEBUG: Checking font path: {font_path}")
            
            if os.path.exists(font_path):
                # Use bundled Noto Sans TC
                try:
                    print("DEBUG: Loading bundled font...")
                    title_font = ImageFont.truetype(font_path, 60)
                    stat_label_font = ImageFont.truetype(font_path, 24)
                    stat_value_font = ImageFont.truetype(font_path, 48)
                    stat_value_font_large = ImageFont.truetype(font_path, 64)
                    footer_font = ImageFont.truetype(font_path, 20)
                except Exception as ie:
                    print(f"Failed to load bundled font: {ie}")
                    raise ie
            else:
                print(f"DEBUG: Bundled font not found at {font_path}")
                # Fallback to macOS system font for local dev
                title_font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 60, index=1)
                stat_label_font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 24)
                stat_value_font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 48, index=1)
                stat_value_font_large = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 64, index=1)
                footer_font = ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", 20, index=1)
        except Exception as e:
            print(f"Font loading error: {e}, using default")
            # Fallback to default
            title_font = ImageFont.load_default()
            stat_label_font = ImageFont.load_default()
            stat_value_font = ImageFont.load_default()
            stat_value_font_large = ImageFont.load_default()
            footer_font = ImageFont.load_default()

        # 4. Draw Text & Logo (Background Layer)
        try:
            # Title
            description = race_data.get("description")
            name = race_data.get("name", "Unknown Race")
            title_text = description if description and description.strip() else name
            
            # Center Title: X=W/2, anchor='mm' (middle-middle)
            # Y=200 seems okay, maybe slightly lower if text is big? Keep 200.
            draw.text((W/2, 200), title_text, font=title_font, fill="white", anchor="mm")

            # Stats
            dist = f"{float(race_data.get('distance', 0)) / 1000:.1f}km"
            elev = f"{race_data.get('total_elevation_gain', race_data.get('elevation_gain', 0))}m"
            grade = f"{race_data.get('average_grade', 0)}%"
            
            # Label Y=480 -> 510
            # Value Y=530 -> 560
            # Footer Bar starts at 580
            
            draw.text((300, 510), "DISTANCE", font=stat_label_font, fill="#94a3b8", anchor="md")
            draw.text((300, 560), dist, font=stat_value_font_large, fill="white", anchor="md")
            
            draw.text((600, 510), "ELEVATION", font=stat_label_font, fill="#94a3b8", anchor="md")
            draw.text((600, 560), elev, font=stat_value_font_large, fill="white", anchor="md")
            
            draw.text((900, 510), "AVG GRADE", font=stat_label_font, fill="#94a3b8", anchor="md")
            draw.text((900, 560), grade, font=stat_value_font_large, fill="white", anchor="md")

            # Footer
            draw.rectangle([(0, 580), (W, 630)], fill="#38bdf8")
            draw.text((600, 605), "JOIN THE CHALLENGE AT STRAVA.CRITERIUM.TW", font=footer_font, fill="#0f172a", anchor="mm")
            
            # Draw Logo (Top Left)
            logo_path = os.path.join(current_dir, "../assets/images/logo.png")
            if os.path.exists(logo_path):
                try:
                     logo_img = Image.open(logo_path).convert("RGBA")
                     # Resize logo to width 100 or something reasonable
                     # aspect ratio preserve
                     logo_h = 80
                     aspect = logo_img.width / logo_img.height
                     logo_w = int(logo_h * aspect)
                     logo_img = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
                     
                     # Paste at (40, 40)
                     img.paste(logo_img, (40, 40), logo_img)
                except Exception as e:
                    print(f"Failed to load logo: {e}")

        except UnicodeEncodeError:
            print("Font encoding error, falling back to ASCII")
            try:
                draw.text((W/2, 200), "Race Info Available", font=ImageFont.load_default(), fill="white", anchor="mm")
                draw.text((600, 605), "strava.criterium.tw", font=ImageFont.load_default(), fill="#0f172a", anchor="mm")
            except Exception as e2:
                 print(f"Fallback text drawing failed: {e2}")

        # 5. Draw Polyline (Foreground Layer - On Top)
        poly_str = find_polyline_in_data(race_data)
        if poly_str:
            points = polyline.decode(poly_str)
            if points:
                lats = [p[0] for p in points]
                lons = [p[1] for p in points]
                min_lat, max_lat = min(lats), max(lats)
                min_lon, max_lon = min(lons), max(lons)
                
                pixels = []
                for lat, lon in points:
                    px, py = latlon_to_pixels(lat, lon, min_lat, max_lat, min_lon, max_lon, W, H, 50)
                    pixels.append((px, py))
                
                if len(pixels) > 1:
                    draw.line(pixels, fill="#fc4c02", width=5)

        # Save to buffer
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()

        return Response(content=img_byte_arr, media_type="image/png")

    except Exception as e:
        print(f"Error generating OG image: {e}")
        # Return a 1x1 transparent PNG as fallback
        fallback = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        return Response(content=fallback, media_type="image/png")
