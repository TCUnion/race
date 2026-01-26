
// ============================================================
// n8n Code Node: 準備啟用信 HTML
// 用途：取代容易出錯的 HTML 節點或直接貼上，使用 JS 產生完整的 Email 內容
// ============================================================

// 1. 取得前一個節點傳入的資料 (假設是 Supabase Insert Node 的輸出)
// 確保您的輸入資料中有 email 和 token 欄位
const email = $json.email;
const token = $json.token;

// 2. 設定您的 n8n Webhook 基礎網址
const baseUrl = 'https://service.criterium.tw'; // 您的 n8n 網址

// 3. 組合驗證連結
const activationLink = `${baseUrl}/webhook/activate-manager?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

// 4. 定義 HTML 模板 (使用樣板字串，方便且不易出錯)
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px 0; text-align: center; }
    .logo-text { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
    .logo-sub { color: #94a3b8; font-size: 14px; letter-spacing: 1px; margin-top: 5px; font-weight: 500; }
    .content { padding: 40px 40px; text-align: center; }
    .title { color: #1e293b; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
    .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
    .btn-container { margin: 35px 0; }
    .btn { background: linear-gradient(to right, #3b82f6, #2563eb); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); }
    .link-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; word-break: break-all; font-size: 13px; color: #64748b; margin-top: 30px; text-align: left; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer-text { color: #94a3b8; font-size: 12px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo-text">TCU MANAGER</h1>
      <p class="logo-sub">Taiwan Cycling Union</p>
    </div>
    <div class="content">
      <h2 class="title">歡迎加入 TCU 管理團隊</h2>
      <p class="text">
        您好，我們收到了您的管理者帳號申請。<br>
        為了確保您的帳號安全，請點擊下方按鈕以驗證您的電子信箱並啟用帳號。
      </p>
      <div class="btn-container">
        <a href="${activationLink}" class="btn" target="_blank">
          立即啟用帳號
        </a>
      </div>
      <p class="text" style="font-size: 14px; color: #64748b;">
        此連結將在 24 小時後失效。
      </p>
      <div class="link-box">
        <span style="font-weight: bold; display: block; margin-bottom: 5px;">或是複製以下連結：</span>
        ${activationLink}
      </div>
    </div>
    <div class="footer">
      <p class="footer-text">© 2026 Taiwan Cycling Union.</p>
    </div>
  </div>
</body>
</html>
`;

// 5. 回傳資料，新增 email_html 欄位供下一個節點使用
return {
  email: email,
  token: token,
  email_html: htmlContent
};
