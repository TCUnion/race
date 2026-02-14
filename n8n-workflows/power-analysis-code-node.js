/**
 * TCU-功率分析-42天AI報告
 * n8n Code 節點：計算功率指標並準備 AI 分析輸入
 * 
 * 輸入：$input.all() - 來自 Supabase 查詢的 strava_streams 資料
 * 輸出：彙整後的訓練數據 JSON
 */

// 功率區間定義 (Coggan)
const POWER_ZONES = [
    { zone: 1, name: '主動恢復', minPct: 0, maxPct: 0.55 },
    { zone: 2, name: '耐力', minPct: 0.56, maxPct: 0.75 },
    { zone: 3, name: '節奏', minPct: 0.76, maxPct: 0.90 },
    { zone: 4, name: '乳酸閾值', minPct: 0.91, maxPct: 1.05 },
    { zone: 5, name: 'VO2max', minPct: 1.06, maxPct: 1.20 },
    { zone: 6, name: '無氧', minPct: 1.21, maxPct: 1.50 },
    { zone: 7, name: '神經肌肉', minPct: 1.51, maxPct: 999 },
];

/**
 * 計算 Normalized Power (NP)
 * 30 秒滑動平均 + 4 次方平均
 */
function calculateNP(powerData) {
    if (!powerData || powerData.length < 30) {
        const sum = powerData.reduce((a, b) => a + b, 0);
        return Math.round(sum / powerData.length) || 0;
    }

    const rollingAvg = [];
    for (let i = 29; i < powerData.length; i++) {
        let sum = 0;
        for (let j = i - 29; j <= i; j++) {
            sum += powerData[j];
        }
        rollingAvg.push(sum / 30);
    }

    const sumFourthPower = rollingAvg.reduce((sum, val) => sum + Math.pow(val, 4), 0);
    const np = Math.pow(sumFourthPower / rollingAvg.length, 0.25);

    return Math.round(np);
}

/**
 * 計算 TSS (Training Stress Score)
 */
function calculateTSS(np, ftp, durationSeconds) {
    if (ftp <= 0 || np <= 0) return 0;
    const intensityFactor = np / ftp;
    const tss = (durationSeconds * np * intensityFactor) / (ftp * 3600) * 100;
    return Math.round(tss * 10) / 10;
}

/**
 * 計算功率區間分佈
 */
function calculateZoneDistribution(powerData, ftp) {
    const total = powerData.length;
    const distribution = {};

    POWER_ZONES.forEach(zone => {
        const minPower = Math.round(ftp * zone.minPct);
        const maxPower = zone.maxPct === 999 ? 99999 : Math.round(ftp * zone.maxPct);
        const count = powerData.filter(p => p >= minPower && p <= maxPower).length;
        distribution[`zone${zone.zone}`] = total > 0 ? Math.round((count / total) * 100) : 0;
    });

    return distribution;
}

/**
 * 從 streams 中提取功率數據
 */
function extractPowerData(streams) {
    if (!streams || !Array.isArray(streams)) return [];
    const wattsStream = streams.find(s => s.type === 'watts');
    return wattsStream?.data || [];
}

/**
 * 主處理函數
 */
function processStravaStreams(items, athleteInfo) {
    const activities = [];
    const dailyTSS = {};
    let totalDuration = 0;
    let totalDistance = 0;

    // 使用選手設定的 FTP，或預設值
    const ftp = athleteInfo.ftp || 200;
    const maxHR = athleteInfo.maxHR || 185;

    // 處理每個活動
    for (const item of items) {
        const json = item.json;
        const streams = json.streams || [];
        const powerData = extractPowerData(streams);

        if (powerData.length === 0) continue;

        const np = calculateNP(powerData);
        const duration = json.moving_time || powerData.length;
        const tss = calculateTSS(np, ftp, duration);
        const intensityFactor = ftp > 0 ? Math.round((np / ftp) * 100) / 100 : 0;

        const activityDate = new Date(json.start_date || json.created_at);
        const dateKey = activityDate.toISOString().split('T')[0];

        // 記錄每日 TSS
        dailyTSS[dateKey] = (dailyTSS[dateKey] || 0) + tss;

        // 累計總時間和距離
        totalDuration += duration;
        totalDistance += json.distance || 0;

        activities.push({
            id: json.activity_id,
            date: dateKey,
            name: json.name || `活動 ${json.activity_id}`,
            duration,
            distance: json.distance || 0,
            np,
            tss,
            intensityFactor,
            avgPower: Math.round(powerData.reduce((a, b) => a + b, 0) / powerData.length),
            maxPower: Math.max(...powerData),
        });
    }

    // 計算 42 天內的 CTL/ATL/TSB
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fortyTwoDaysAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

    let weeklyTSS = 0;
    let monthlyTSS = 0;
    let totalTSS = 0;

    Object.entries(dailyTSS).forEach(([date, tss]) => {
        const d = new Date(date);
        totalTSS += tss;
        if (d >= sevenDaysAgo) weeklyTSS += tss;
        if (d >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) monthlyTSS += tss;
    });

    const ctl = Math.round(totalTSS / 42);
    const atl = Math.round(weeklyTSS / 7);
    const tsb = ctl - atl;

    // 計算週趨勢
    const weeklyTrend = [];
    for (let week = 0; week < 6; week++) {
        const weekStart = new Date(fortyTwoDaysAgo.getTime() + week * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        let weekTss = 0;
        let weekHours = 0;
        let weekActivities = 0;

        activities.forEach(a => {
            const aDate = new Date(a.date);
            if (aDate >= weekStart && aDate < weekEnd) {
                weekTss += a.tss;
                weekHours += a.duration / 3600;
                weekActivities++;
            }
        });

        weeklyTrend.push({
            week: week + 1,
            startDate: weekStart.toISOString().split('T')[0],
            tss: Math.round(weekTss),
            hours: Math.round(weekHours * 10) / 10,
            activities: weekActivities,
        });
    }

    // 計算整體功率區間分佈
    const allPowerData = items.flatMap(item => extractPowerData(item.json.streams || []));
    const zoneDistribution = calculateZoneDistribution(allPowerData, ftp);

    // 找出亮點
    const sortedByTSS = [...activities].sort((a, b) => b.tss - a.tss);
    const sortedByDuration = [...activities].sort((a, b) => b.duration - a.duration);
    const sortedByIF = [...activities].sort((a, b) => b.intensityFactor - a.intensityFactor);

    return {
        athlete: {
            name: athleteInfo.name || '選手',
            ftp,
            maxHR,
        },
        period: {
            startDate: fortyTwoDaysAgo.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
            totalDays: 42,
        },
        summary: {
            totalActivities: activities.length,
            totalTSS: Math.round(totalTSS),
            avgDailyTSS: Math.round(totalTSS / 42),
            ctl,
            atl,
            tsb,
            totalDuration: Math.round(totalDuration),
            totalDistance: Math.round(totalDistance / 1000), // km
        },
        weeklyTrend,
        zoneDistribution,
        highlights: {
            bestTSSDay: sortedByTSS[0] ? { date: sortedByTSS[0].date, tss: sortedByTSS[0].tss, name: sortedByTSS[0].name } : null,
            longestRide: sortedByDuration[0] ? { date: sortedByDuration[0].date, duration: sortedByDuration[0].duration, name: sortedByDuration[0].name } : null,
            highestIF: sortedByIF[0] ? { date: sortedByIF[0].date, if: sortedByIF[0].intensityFactor, name: sortedByIF[0].name } : null,
        },
        recentActivities: activities.slice(0, 10),
    };
}

// n8n 入口點
const items = $input.all();
const athleteInfo = {
    name: items[0]?.json?.firstname ? `${items[0].json.firstname} ${items[0].json.lastname || ''}`.trim() : '選手',
    ftp: items[0]?.json?.ftp || 200,
    maxHR: items[0]?.json?.max_heartrate || 185,
};

const analysisData = processStravaStreams(items, athleteInfo);

return [{ json: analysisData }];
