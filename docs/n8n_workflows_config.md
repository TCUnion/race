# n8n 工作流 JSON 配置指引

請將以下 JSON 程式碼分別複製，並在 n8n 畫布中直接貼上即可自動建立節點。

---

## 工作流 A：新註冊通知與發送驗證信
**功能**：接收 Supabase INSERT 通知 -> 產生 Token -> 寫入資料庫 -> 寄出帶連結的郵件。

```json
{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "supabase-registration",
        "options": {}
      },
      "id": "webhook-node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "jsCode": "const crypto = require('crypto');\nconst token = crypto.randomBytes(32).toString('hex');\nreturn {\n  token: token,\n  email: $json.body.email\n};"
      },
      "id": "token-gen",
      "name": "產生 Token",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300]
    },
    {
      "parameters": {
        "operation": "insert",
        "schema": "public",
        "table": "manager_verifications",
        "columns": [
          "email",
          "token"
        ],
        "options": {}
      },
      "id": "db-save",
      "name": "寫入驗證表",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [650, 300]
    },
    {
      "parameters": {
        "fromEmail": "service@tsu.com.tw",
        "toEmail": "={{ $node[\"產生 Token\"].json[\"email\"] }}",
        "subject": "請啟用您的 TCU 管理者帳號",
        "text": "={{ '您好，請點擊以下連結以啟用您的帳號：\\n\\n https://' + $env.N8N_HOST + '/webhook/activate-manager?email=' + $node[\"產生 Token\"].json[\"email\"] + '&token=' + $node[\"產生 Token\"].json[\"token\"] }}"
      },
      "id": "email-node",
      "name": "寄送驗證信",
      "type": "n8n-nodes-base.emailSend",
      "typeVersion": 1,
      "position": [850, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "產生 Token",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "產生 Token": {
      "main": [
        [
          {
            "node": "寫入驗證表",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "寫入驗證表": {
      "main": [
        [
          {
            "node": "寄送驗證信",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## 工作流 B：處理驗證連結點擊
**功能**：驗證 Token -> 啟用 `manager_roles` -> 回傳成功訊息。

```json
{
  "nodes": [
    {
      "parameters": {
        "path": "activate-manager",
        "options": {}
      },
      "id": "verify-hook",
      "name": "驗證 Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 500]
    },
    {
      "parameters": {
        "operation": "get",
        "schema": "public",
        "table": "manager_verifications",
        "filters": [
          {
            "column": "token",
            "value": "={{ $json.query.token }}"
          },
          {
            "column": "is_used",
            "value": "false"
          }
        ]
      },
      "id": "db-check",
      "name": "檢查 Token",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [450, 500]
    },
    {
      "parameters": {
        "operation": "update",
        "schema": "public",
        "table": "manager_roles",
        "filters": [
          {
            "column": "email",
            "value": "={{ $json.email }}"
          }
        ],
        "updateColumns": [
          "is_active"
        ],
        "columns": {
          "is_active": true
        }
      },
      "id": "activate-manager",
      "name": "啟用帳號",
      "type": "n8n-nodes-base.supabase",
      "typeVersion": 1,
      "position": [650, 500]
    },
    {
      "parameters": {
        "options": {
          "responseCode": 200,
          "responseBody": "<h1>啟用成功！</h1><p>您的帳號已啟動，現在可以返回應用程式登入了。</p>"
        }
      },
      "id": "response-node",
      "name": "成功畫面",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [850, 500]
    }
  ],
  "connections": {
    "驗證 Webhook": {
      "main": [
        [
          {
            "node": "檢查 Token",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "檢查 Token": {
      "main": [
        [
          {
            "node": "啟用帳號",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "啟用帳號": {
      "main": [
        [
          {
            "node": "成功畫面",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

### **使用說明**
1.  **環境變數**：工作流中的連結使用了 `$env.N8N_HOST`，請確保您的 n8n 有設定環境變數，或手動改成您的固定網址。
2.  **Supabase 憑證**：匯入後請在 Supabase 節點中選擇您正確的 Credentials。
3.  **安全提醒**：這只是基礎原型，實際部署建議增加 Token 過期檢查。
