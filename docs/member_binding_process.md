# TCU 會員與 Strava 帳號綁定流程文件

本文件詳細說明 TCU (Taiwan Criterium Union) 會員系統與 Strava 帳號的綁定機制。此文件旨在協助開發者與 AI 代理理解目前的實作邏輯、資料結構與 API 互動流程。

## 1. 系統架構概觀

綁定流程涉及以下組件：
*   **Frontend (React)**: `MemberBindingCard.tsx` 提供使用者介面，處理輸入與狀態顯示。
*   **Backend (FastAPI)**: `backend/routers/auth.py` 提供 API 端點，處理邏輯驗證與資料庫操作。
*   **Database (Supabase/PostgreSQL)**: 
    *   `tcu_members`: 儲存 TCU 會員資料 (Email, TCU-ID, Account 等)。
    *   `strava_member_bindings`: 儲存綁定關係 (Email <-> Strava ID)。
    *   `strava_tokens`: 儲存 Strava OAuth Tokens。
*   **External Service (n8n)**: 發送 email OTP 驗證碼 (由 Backend 代理請求)。

## 2. 資料庫 Schema

### 2.1 綁定關聯表 (`strava_member_bindings`)
這是紀錄綁定關係的核心表格。

| 欄位名稱 | 型別 | 說明 |
| :--- | :--- | :--- |
| `id` | SERIAL (PK) | 自動遞增主鍵 |
| `tcu_member_email` | VARCHAR | **Unique Key**。對應 `tcu_members.email`。 |
| `strava_id` | VARCHAR | Strava Athlete ID (例如 "12345678")。 |
| `tcu_account` | VARCHAR | TCU 會員帳號 (身分證號) 或 ID。 |
| `member_name` | VARCHAR | 會員真實姓名。 |
| `user_id` | UUID | Supabase Auth User ID (若有的話)。 |
| `bound_at` | TIMESTAMP | 綁定時間。 |
| `updated_at` | TIMESTAMP | 更新時間。 |

### 2.2 會員表 (`tcu_members`)
用於驗證會員身分。

*   關鍵欄位：`email`, `account` (TCU ID/身分證), `real_name`, `otp_code` (暫存驗證碼)。

## 3. 綁定流程詳解

### 步驟 1: Strava 登入 (OAuth)
1.  前端呼叫 `/api/auth/strava-login`。
2.  導向 Strava 授權頁面。
3.  Strava callback 回 `/api/auth/strava-callback`。
4.  Backend 取得 Access/Refresh Tokens 並存入 `strava_tokens` 表格。
5.  透過 `window.opener.postMessage` 將 Strava Athlete ID 回傳給前端。

### 步驟 2: 查詢與驗證 (前端 `handleSync`)
1.  使用者在前端輸入 **TCU-ID** 或 **身分證字號**。
2.  前端查詢 `tcu_members` 確認會員存在。
3.  呼叫 Backend API `/api/auth/member-binding` 請求發送 OTP。

### 步驟 3: Backend 處理綁定請求 (`/api/auth/member-binding`)
Backend 接收 `{ email, stravaId, input_id, action: 'generate_otp' }`：

1.  **檢查 `tcu_members`**: 確認 Email 對應的會員存在。
2.  **檢查 `strava_member_bindings`**:
    *   若**無綁定記錄**: 進入 OTP 流程。
    *   若**已綁定且 Strava ID 相同**: 回傳成功 (Already bound)。
    *   若**已綁定但 Strava ID 不同**: 回傳錯誤，提示帳號已被綁定。
3.  **代理至 n8n**:
    *   若需驗證，將請求轉發至 n8n Webhook (`N8N_MEMBER_BINDING_URL`)。
    *   n8n 負責生成 6 位數 OTP 並寄送 Email 給會員。
    *   (註: OTP Code 寫入 `tcu_members.otp_code` 由 n8n 處理)。

### 步驟 4: 輸入 OTP 與確認 (`/api/auth/confirm-binding`)
1.  使用者輸入 Email 收到的 6 位數 OTP。
2.  前端呼叫 Backend API `/api/auth/confirm-binding`。
3.  **Backend 邏輯**:
    *   接收 `{ email, stravaId, tcu_account, member_name, user_id }`。
    *   (前端需先驗證 OTP 正確性，或由 Backend 再次驗證 - *目前實作是前端先查 DB 驗證 OTP，再呼叫此 API*)。
    *   執行 **Upsert** 到 `strava_member_bindings` 表格。
    *   回傳完整的會員資料 (`member_data`)。

## 4. API 端點列表

| HTTP Method | Endpoint | 描述 |
| :--- | :--- | :--- |
| `GET` | `/api/auth/strava-login` | 啟動 Strava OAuth 流程。 |
| `POST` | `/api/auth/member-binding` | 檢查綁定狀態或請求發送 OTP。 |
| `POST` | `/api/auth/confirm-binding` | 確認綁定，寫入資料庫。 |
| `POST` | `/api/auth/unbind` | 解除綁定 (需 Admin 或本人權限)。 |
| `GET` | `/api/auth/binding-status/{strava_id}` | 查詢特定 Strava ID 的綁定狀態。 |

## 5. 解除綁定流程

1.  呼叫 `/api/auth/unbind`。
2.  帶入 `{ email, admin_id }`。
3.  Backend 驗證 `admin_id` 是否為管理員 (查詢 `manager_roles` 或環境變數) 或該綁定的擁有者。
4.  刪除 `strava_member_bindings` 中的記錄。
5.  清除 `tcu_members` 中的 `strava_id` (Legacy 相容)。

## 6. 注意事項開發者

*   **權威資料源**: 綁定狀態以 `strava_member_bindings` 為準。前端 `useAuth` Hook 會優先參考此表格。
*   **Legacy 相容**: 雖然 `tcu_members` 也有 `strava_id` 欄位，但目前主要邏輯已遷移至 `strava_member_bindings` 以支援更靈活的關聯 (如一對多或歷史記錄，雖然目前主要是一對一)。
*   **安全性**: OTP 驗證依賴 `tcu_members` 中的 `otp_code` 欄位。
