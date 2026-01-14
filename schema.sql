-- ==========================================
-- TCU Segment Challenge - Database Schema
-- ==========================================

-- 1. 路段資料表 (Segments)
CREATE TABLE IF NOT EXISTS public.segments (
    id BIGINT PRIMARY KEY, -- Strava Segment ID
    name TEXT NOT NULL,
    description TEXT,
    link TEXT,
    distance FLOAT,
    average_grade FLOAT,
    maximum_grade FLOAT,
    elevation_high FLOAT,
    elevation_low FLOAT,
    total_elevation_gain FLOAT,
    activity_type TEXT,
    polyline TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 報名資料表 (Registrations)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    segment_id BIGINT REFERENCES public.segments(id),
    strava_athlete_id BIGINT NOT NULL,
    athlete_name TEXT,
    athlete_profile TEXT,
    team TEXT,
    tcu_id TEXT,
    number TEXT,
    status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(segment_id, strava_athlete_id)
);

-- 3. Strava 授權金鑰表 (Strava Tokens)
CREATE TABLE IF NOT EXISTS public.strava_tokens (
    athlete_id BIGINT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 選手個人資料表 (Athletes)
CREATE TABLE IF NOT EXISTS public.athletes (
    id BIGINT PRIMARY KEY, -- Strava Athlete ID
    username TEXT,
    firstname TEXT,
    lastname TEXT,
    bio TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    sex TEXT,
    premium BOOLEAN,
    summit BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    badge_type_id INTEGER,
    weight FLOAT,
    profile_medium TEXT,
    profile TEXT,
    updated_at_db TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 單車設備表 (Bikes)
CREATE TABLE IF NOT EXISTS public.bikes (
    id TEXT PRIMARY KEY, -- Strava Gear ID (e.g. b2318099)
    athlete_id BIGINT REFERENCES public.athletes(id),
    primary_gear BOOLEAN,
    name TEXT,
    nickname TEXT,
    resource_state INTEGER,
    retired BOOLEAN,
    distance FLOAT, -- In meters
    converted_distance FLOAT, -- In km
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. 跑鞋設備表 (Shoes)
CREATE TABLE IF NOT EXISTS public.shoes (
    id TEXT PRIMARY KEY, -- Strava Gear ID (e.g. g345866)
    athlete_id BIGINT REFERENCES public.athletes(id),
    primary_gear BOOLEAN,
    name TEXT,
    nickname TEXT,
    resource_state INTEGER,
    retired BOOLEAN,
    distance FLOAT, -- In meters
    converted_distance FLOAT, -- In km
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. 俱樂部資料表 (Clubs)
CREATE TABLE IF NOT EXISTS public.clubs (
    id BIGINT PRIMARY KEY, -- Strava Club ID
    name TEXT,
    profile_medium TEXT,
    profile TEXT,
    cover_photo TEXT,
    cover_photo_small TEXT,
    sport_type TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    private BOOLEAN,
    member_count INTEGER,
    featured BOOLEAN,
    verified BOOLEAN,
    url TEXT,
    updated_at_db TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. 選手俱樂部關聯表 (Athlete Clubs)
CREATE TABLE IF NOT EXISTS public.athlete_clubs (
    athlete_id BIGINT REFERENCES public.athletes(id) ON DELETE CASCADE,
    club_id BIGINT REFERENCES public.clubs(id) ON DELETE CASCADE,
    membership TEXT, -- 'member', 'admin', 'owner'
    admin BOOLEAN,
    owner BOOLEAN,
    PRIMARY KEY (athlete_id, club_id)
);

-- 9. 路段成績紀錄表 (Segment Efforts)

-- ==========================================
-- Row Level Security (RLS) 配置
-- ==========================================

-- 啟用 RLS
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_efforts ENABLE ROW LEVEL SECURITY;

-- Segments 策略: 所有人可讀，僅管理者可寫
CREATE POLICY "Public read segments" ON public.segments FOR SELECT USING (true);
-- 注意: 管理者權限通常依賴於 auth.users，這裡先設為允許 authenticated 寫入，或視情況細分
CREATE POLICY "Admin full access segments" ON public.segments FOR ALL TO authenticated USING (true);

-- Registrations 策略: 所有人可讀，所有人可插入 (報名)，管理者可更新/刪除
CREATE POLICY "Public read registrations" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Public insert registrations" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin full access registrations" ON public.registrations FOR ALL TO authenticated USING (true);

-- Strava Tokens 策略: 僅限管理者操作 (後端 Service Role 或 Admin)
CREATE POLICY "Admin only strava_tokens" ON public.strava_tokens FOR ALL TO authenticated USING (true);

-- Athletes 策略: 所有人可讀，管理者可寫
CREATE POLICY "Public read athletes" ON public.athletes FOR SELECT USING (true);
CREATE POLICY "Admin full access athletes" ON public.athletes FOR ALL TO authenticated USING (true);

-- Bikes 策略: 所有人可讀，管理者可寫
CREATE POLICY "Public read bikes" ON public.bikes FOR SELECT USING (true);
CREATE POLICY "Admin full access bikes" ON public.bikes FOR ALL TO authenticated USING (true);

-- Shoes 策略: 所有人可讀，管理者可寫
CREATE POLICY "Public read shoes" ON public.shoes FOR SELECT USING (true);
CREATE POLICY "Admin full access shoes" ON public.shoes FOR ALL TO authenticated USING (true);

-- Clubs 策略: 所有人可讀，管理者可寫
CREATE POLICY "Public read clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Admin full access clubs" ON public.clubs FOR ALL TO authenticated USING (true);

-- Athlete Clubs 策略: 所有人可讀，管理者可寫
CREATE POLICY "Public read athlete_clubs" ON public.athlete_clubs FOR SELECT USING (true);
CREATE POLICY "Admin full access athlete_clubs" ON public.athlete_clubs FOR ALL TO authenticated USING (true);

-- Segment Efforts 策略: 所有人可讀，內部同步系統 (authenticated) 可寫
CREATE POLICY "Public read efforts" ON public.segment_efforts FOR SELECT USING (true);
CREATE POLICY "Sync system write efforts" ON public.segment_efforts FOR ALL TO authenticated USING (true);

-- ==========================================
-- 初始資料 (136 檢定)
-- ==========================================
INSERT INTO public.segments (id, name, description, link, distance, average_grade, maximum_grade, elevation_high, elevation_low, total_elevation_gain, activity_type, polyline)
VALUES (
    4928093, 
    '136 正上', 
    '台中經典挑戰：136檢定', 
    'https://www.strava.com/segments/4928093', 
    14459.6, 
    3.7, 
    19.8, 
    667.4, 
    135.2, 
    579.8, 
    'Ride', 
    'edhrCqs|_VLQRm@^}ABu@Cy@DwICyD@{BRuCL{BPoATy@^k@^YjDeAZUtGkG~B}AxDgDrAeAfB_A|@]bA_@nA_@fASHEPSbAuAbAoAl@eAb@m@h@_@RUvAiAfB_B~@eAf@s@^kAHm@P_DA[Q}@OU_@[c@g@MUEg@Hk@Vq@ZmA^k@bAiA\WpA_@~AYbCSlAD|@TZAd@OPOR]Fc@@i@AoA@e@BSPc@fAwBjDmGx@oA`D_GnAcBl@Wp@HNFfAp@hAb@NCb@a@vCuDb@g@\UtA[dEiAt@]zAmA~AgAtDoBx@[j@M^AlBDd@KnAOLEl@[t@g@nCsBTUP[Rk@PkBpA}CvBaGrA}C|AuDL[Pw@Di@AkAMcACq@BmCIk@_@m@s@YkAG]@qCd@cA?OAMGEs@FWAi@Q_@{@cAEO@iBCOWk@wDqEe@s@_@u@g@{BMWOQa@SQOa@c@aAoAg@g@SEgA@IACKGIAM?MHg@f@eAx@_AlB_BzAq@`@e@`@w@f@kBb@wBj@sA^q@NOZQ`@M^U^OXUh@cA|@{Dr@mAXWPKd@Mn@MnBIvA[`AKJCb@]`@k@@K?U]mBE[BUJ]HOJMbCcAJOB_@La@pAUt@IVIdAi@p@q@b@KtAIXMv@i@HOP_Bv@gCDU@YAMMs@c@e@mAkAo@u@Mg@YyBEg@_@mCCa@`@qAEiAO}@Ca@ISQQMGYCUGi@GW@SDi@PKCk@_@WIwAaAuAm@sAa@y@u@gAg@c@_@IMAW@_@X{BASc@}AA]D_@\cAn@sATo@LcA?g@DMLOTKt@FNCHEVYFU?aBZyAd@_BBQ?SCQ_@iAYaBIe@G}@i@aBAQ@QFMZAfAT^Pd@Zv@?ZS\QhAOd@HV@PCn@c@Pa@K[e@k@?ICEFYCGHIB[b@uBf@s@Re@TqCFUHKN@JHHLl@fDBj@Pp@HJRPh@R\Hj@TRB`AXV?JENSD_@CIGEo@QYMYU]g@?s@JSJCT?@DB?@FCLR^NJFCPWB?@EMy@@CGECI?YFGPBLJd@x@b@b@PGHYEWGEm@o@OUM[CK@SH]d@{A?WCIGm@@GJKRCPHHHJb@BhBHVPPv@f@fAx@f@j@NBTMDI@OCc@EWA{@SqAOa@q@{B]o@IGEQC_@AoAGgAV}@DWAWGOa@_@MSCw@He@Va@PCv@AfDTVEp@[r@e@\\[LWFa@JaBBOPKLCH?@LXp@Hv@Pt@RLJADCB]AiAEk@Ko@Oa@[k@CK@EDK\a@fAo@XW`@k@FONOj@Kb@@^FtBBl@C`AOz@Fj@Ib@UNQJQPq@RWdAc@|@i@rA_@POHW?UG]?[@WFGF@ZPFLDHXtBLZ\h@n@h@RJh@FREPIj@S~@KVKV]X_AHe@Do@Ty@NOp@c@JE'
) ON CONFLICT (id) DO NOTHING;
