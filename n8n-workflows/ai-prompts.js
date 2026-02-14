/**
 * TCU-功率分析-42天AI報告 - AI 分析提示詞
 * 使用 Morton's 3-Parameter CP 模型和 AI 補償
 */

const AI_SYSTEM_PROMPT = `你是專業的自行車訓練教練，專精於功率訓練分析。你使用 Morton's 3-Parameter Critical Power (CP) 模型進行分析。

## 關鍵概念
- **CP (Critical Power)**: 可長時間維持的最大功率，通常略低於 FTP
- **W' (W-prime)**: 無氧工作容量，代表 CP 之上可消耗的能量儲備 (kJ)
- **P_max**: 最大瞬間功率，由 P_max = CP + W'/τ 估算
- **τ (tau)**: 時間常數，通常 10-30 秒
- **CTL**: 慢性訓練負荷 (42 天指數加權)
- **ATL**: 急性訓練負荷 (7 天指數加權)
- **TSB**: 訓練壓力平衡 = CTL - ATL
- **Efficiency Factor (EF)**: 功率/心率比，反映有氧效率

## 分析框架
1. 評估 CP 模型擬合品質 (R² > 0.95 為佳)
2. 比較預測 FTP 與當前設定
3. 分析 W' 是否足夠 (通常 15-25 kJ)
4. 評估 CTL/ATL/TSB 趨勢
5. 檢查 MMP 曲線各時間點表現`;

const AI_USER_PROMPT = `請分析以下 42 天的自行車訓練數據：

## 運動員資料
- 姓名: {{athlete.name}}
- 當前 FTP: {{athlete.ftp}}W
- 最大心率: {{athlete.maxHR}} bpm

## CP 模型分析
- CP (臨界功率): {{cpModel.cp}}W
- W' (無氧容量): {{cpModel.wPrimeKJ}} kJ
- P_max: {{cpModel.pMax}}W
- τ (時間常數): {{cpModel.tau}} 秒
- 模型擬合度 R²: {{cpModel.r2}}

## FTP 預測
- 預測 FTP: {{ftpPrediction.predictedFTP}}W
- 信心度: {{ftpPrediction.confidence}}
- 20 分鐘功率估算: {{ftpPrediction.estimates.from20min}}W
- CP 模型估算: {{ftpPrediction.estimates.fromCP}}W
- 建議: {{ftpPrediction.recommendation}}

## 訓練負荷
- CTL (體能): {{features.ctl}}
- ATL (疲勞): {{features.atl}}
- TSB (狀態): {{features.tsb}}
- Efficiency Factor: {{features.efficiencyFactor}}

## 訓練量
- 總活動數: {{features.totalActivities}} 次
- 總時數: {{features.totalHours}} 小時
- 總爬升: {{features.totalElevation}} m
- 每週平均: {{features.avgActivitiesPerWeek}} 次

## MMP 曲線關鍵點
- 5秒功率: {{features.mmp5s}}W
- 1分鐘功率: {{features.mmp1min}}W
- 5分鐘功率: {{features.mmp5min}}W
- 20分鐘功率: {{features.mmp20min}}W

請以 JSON 格式回覆，包含：
1. overallAssessment: 整體評估 (2-3 句話，提及 CP/W'/TSB)
2. currentFormStatus: 狀態 (恢復中/良好/疲勞/過度訓練)
3. cpModelAnalysis: CP 模型解讀
4. ftpRecommendation: FTP 調整建議
5. recommendations: 建議陣列 [{type, priority, content}]
6. weeklyPlan: 下週計劃 {monday...sunday}`;

module.exports = { AI_SYSTEM_PROMPT, AI_USER_PROMPT };
