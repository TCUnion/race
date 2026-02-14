/**
 * TCU-功率分析-42天AI報告
 * n8n Code 節點：格式化 AI 回應為通知訊息
 * 
 * 輸入：$input.first().json - AI 回應 + 原始分析數據
 * 輸出：格式化的 Line/Email 訊息
 */

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}小時${minutes}分`;
    }
    return `${minutes}分鐘`;
}

function getTSBStatus(tsb) {
    if (tsb > 25) return '💚 恢復充足';
    if (tsb > 5) return '💙 狀態良好';
    if (tsb > -10) return '🟡 適度疲勞';
    if (tsb > -30) return '🟠 疲勞累積';
    return '🔴 過度訓練';
}

function formatLineMessage(data, aiResponse) {
    const { athlete, summary, highlights } = data;
    const tsbStatus = getTSBStatus(summary.tsb);

    let message = `🚴 ${athlete.name} 的 42 天訓練報告\n`;
    message += `━━━━━━━━━━━━━━━━\n\n`;

    // 訓練概覽
    message += `📊 訓練概覽\n`;
    message += `• 總騎乘次數: ${summary.totalActivities} 次\n`;
    message += `• 總時間: ${formatDuration(summary.totalDuration)}\n`;
    message += `• 總距離: ${summary.totalDistance} km\n`;
    message += `• 總 TSS: ${summary.totalTSS}\n\n`;

    // 訓練狀態
    message += `💪 訓練狀態\n`;
    message += `• CTL (體能): ${summary.ctl}\n`;
    message += `• ATL (疲勞): ${summary.atl}\n`;
    message += `• TSB (狀態): ${summary.tsb} ${tsbStatus}\n\n`;

    // 亮點
    if (highlights.bestTSSDay) {
        message += `🏆 最高 TSS: ${highlights.bestTSSDay.tss} (${highlights.bestTSSDay.date})\n`;
    }
    if (highlights.longestRide) {
        message += `⏱️ 最長騎乘: ${formatDuration(highlights.longestRide.duration)}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `🤖 AI 分析建議\n\n`;

    // AI 分析結果
    if (aiResponse.overallAssessment) {
        message += `${aiResponse.overallAssessment}\n\n`;
    }

    if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
        message += `📝 建議事項:\n`;
        aiResponse.recommendations.forEach((rec, i) => {
            const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
            message += `${i + 1}. ${priorityIcon} ${rec.content}\n`;
        });
    }

    message += `\n📅 報告生成時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;

    return message;
}

function formatEmailHtml(data, aiResponse) {
    const { athlete, summary, weeklyTrend, zoneDistribution, highlights } = data;
    const tsbStatus = getTSBStatus(summary.tsb);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .metric { display: inline-block; width: 45%; margin: 8px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .metric-label { font-size: 12px; color: #666; }
    .tsb-status { padding: 4px 12px; border-radius: 20px; font-size: 14px; }
    .recommendation { padding: 10px; margin: 8px 0; border-left: 4px solid #667eea; background: #f0f0ff; }
    .zone-bar { height: 20px; border-radius: 4px; margin: 2px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚴 42 天訓練報告</h1>
    <p>${athlete.name} | FTP: ${athlete.ftp}W</p>
  </div>
  
  <div class="card">
    <h3>📊 訓練概覽</h3>
    <div class="metric">
      <div class="metric-value">${summary.totalActivities}</div>
      <div class="metric-label">騎乘次數</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.totalDistance} km</div>
      <div class="metric-label">總距離</div>
    </div>
    <div class="metric">
      <div class="metric-value">${formatDuration(summary.totalDuration)}</div>
      <div class="metric-label">總時間</div>
    </div>
    <div class="metric">
      <div class="metric-value">${summary.totalTSS}</div>
      <div class="metric-label">總 TSS</div>
    </div>
  </div>
  
  <div class="card">
    <h3>💪 訓練狀態</h3>
    <p>
      <strong>CTL (體能):</strong> ${summary.ctl} | 
      <strong>ATL (疲勞):</strong> ${summary.atl} | 
      <strong>TSB:</strong> ${summary.tsb} <span class="tsb-status">${tsbStatus}</span>
    </p>
  </div>
  
  <div class="card">
    <h3>📈 功率區間分佈</h3>
    ${Object.entries(zoneDistribution).map(([zone, pct]) => {
        const colors = ['#9CA3AF', '#60A5FA', '#34D399', '#FBBF24', '#F97316', '#EF4444', '#A855F7'];
        const zoneNum = parseInt(zone.replace('zone', ''));
        return `<div><span>Z${zoneNum}:</span> <span style="display:inline-block;width:${pct}%;background:${colors[zoneNum - 1]};height:16px;border-radius:4px;"></span> ${pct}%</div>`;
    }).join('')}
  </div>
  
  <div class="card">
    <h3>🤖 AI 分析建議</h3>
    <p>${aiResponse.overallAssessment || ''}</p>
    ${(aiResponse.recommendations || []).map(rec =>
        `<div class="recommendation"><strong>${rec.type === 'recovery' ? '恢復' : rec.type === 'training' ? '訓練' : '一般'}:</strong> ${rec.content}</div>`
    ).join('')}
  </div>
  
  ${aiResponse.weeklyPlan ? `
  <div class="card">
    <h3>📅 下週訓練計劃建議</h3>
    <table style="width:100%">
      ${Object.entries(aiResponse.weeklyPlan).map(([day, plan]) =>
        `<tr><td><strong>${day}</strong></td><td>${plan}</td></tr>`
    ).join('')}
    </table>
  </div>
  ` : ''}
  
  <p style="text-align:center;color:#888;font-size:12px;">
    報告生成時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}<br>
    TCU 功率訓練分析系統
  </p>
</body>
</html>`;
}

// n8n 入口點
const input = $input.first().json;
const analysisData = input.analysisData;
const aiResponse = input.aiResponse || {};

const lineMessage = formatLineMessage(analysisData, aiResponse);
const emailHtml = formatEmailHtml(analysisData, aiResponse);
const emailSubject = `🚴 ${analysisData.athlete.name} - 42 天訓練報告 (TSB: ${analysisData.summary.tsb})`;

return [{
    json: {
        lineMessage,
        emailHtml,
        emailSubject,
        athleteEmail: input.athleteEmail,
        notificationType: input.notificationType,
    }
}];
