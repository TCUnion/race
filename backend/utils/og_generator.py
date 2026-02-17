import os
import polyline
from staticmap import StaticMap, Line
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io

# 設定
OG_WIDTH = 1200
OG_HEIGHT = 630
TCU_ORANGE = (252, 82, 0) # Strava Orange
FONT_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "NotoSansTC-Bold.otf")

def generate_race_og_image(race_name, polyline_str, distance_m, elevation_m):
    """
    從 Polyline 產生具有地圖背景與數據疊加的 OG Image。
    回傳圖片的 bytes。
    """
    try:
        # 1. 解碼 Polyline
        path = polyline.decode(polyline_str)
        if not path:
            raise ValueError("Invalid polyline")
            
        # 2. 建立靜態地圖
        # 使用 OpenStreetMap 或 CartoDB 樣式
        # 由於是背景，我們可以使用比較深色的底圖或標準地圖
        m = StaticMap(OG_WIDTH, OG_HEIGHT, url_template='https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png')
        
        # 加入路段線條
        line = Line(path, '#FC5200', 6) # TCU Orange
        m.add_line(line)
        
        # 渲染地圖
        base_img = m.render()
        base_img = base_img.convert("RGBA")
        
        # 3. 疊加遮罩與漸層 (底部深色方便閱讀文字)
        overlay = Image.new('RGBA', (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # 繪製底部漸層
        for y in range(OG_HEIGHT // 2, OG_HEIGHT):
            alpha = int((y - (OG_HEIGHT // 2)) / (OG_HEIGHT // 2) * 180) # 最大透明度 180 (大約 70%)
            draw.line([(0, y), (OG_WIDTH, y)], fill=(0, 0, 0, alpha))
            
        # 合併遮罩
        combined = Image.alpha_composite(base_img, overlay)
        draw = ImageDraw.Draw(combined)
        
        # 4. 繪製文字
        try:
            # 嘗試載入字體
            title_font = ImageFont.truetype(FONT_PATH, 72)
            meta_font = ImageFont.truetype(FONT_PATH, 42)
        except Exception as e:
            print(f"Font load error: {e}. Falling back to default.")
            title_font = ImageFont.load_default()
            meta_font = ImageFont.load_default()
            
        # 繪製標題 (賽事名稱)
        # 限制長度
        display_name = race_name[:20] + "..." if len(race_name) > 20 else race_name
        draw.text((60, OG_HEIGHT - 180), display_name, font=title_font, fill=(255, 255, 255))
        
        # 繪製數據 (里程 & 爬升)
        dist_km = f"{distance_m / 1000:.1f} km"
        elev_m = f"{int(elevation_m)} m"
        stats_text = f"距離 {dist_km}  |  總爬升 {elev_m}"
        
        # 數據底下的橘色小條
        draw.rectangle([60, OG_HEIGHT - 90, 100, OG_HEIGHT - 85], fill=TCU_ORANGE)
        draw.text((120, OG_HEIGHT - 105), stats_text, font=meta_font, fill=(200, 200, 200))
        
        # 加上 TCU 水印
        draw.text((OG_WIDTH - 250, 40), "TCU 賽事小幫手", font=meta_font, fill=(255, 255, 255, 120))
        
        # 5. 輸出為 Bytes
        img_byte_arr = io.BytesIO()
        combined.convert("RGB").save(img_byte_arr, format='JPEG', quality=85)
        return img_byte_arr.getvalue()
        
    except Exception as e:
        print(f"OG Image generation failed: {e}")
        return None

if __name__ == "__main__":
    # 測試腳本
    test_poly = "uz{zEqd|uVp@f@~@h@v@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@t@j@" # 簡化測試
    img_data = generate_race_og_image("測試路段 136 縣道", test_poly, 15000, 450)
    if img_data:
        with open("test_og_output.jpg", "wb") as f:
            f.write(img_data)
        print("Test image generated: test_og_output.jpg")
