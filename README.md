# 自動打卡系統

基於 Playwright 和 Tesseract OCR 的自動打卡解決方案，支援自動識別驗證碼。

## 安裝步驟

### 1. 安裝 Node.js
如果還沒裝，去 https://nodejs.org/ 下載安裝（建議 LTS 版本）

### 2. 設定環境變數
複製 `.env.example` 為 `.env`，並修改設定：
```bash
cp .env.example .env
```

編輯 `.env` 填入你的打卡系統網址：
```
PUNCH_URL=http://your-company-punch-system.com/
HEADLESS=false
MAX_RETRY=5
```

### 3. 安裝相依套件
在此資料夾開啟 PowerShell/Terminal，執行：
```bash
npm run install-deps
```

## 使用方式

### 方式 1：測試模式（立即執行）
```powershell
npm run test
```
會立即嘗試打卡，不會等到下班時間

### 方式 2：單次執行（等待下班時間）
```powershell
npm run punch
```
會自動讀取頁面上的下班時間，並等待到時間後才打卡

### 方式 3：排程自動執行（建議）
```powershell
node scheduler.js
```
每天 17:30 自動執行，讓此視窗保持開啟即可
（或用 Windows 工作排程器在開機時執行）

## Windows 工作排程器設定（開機自動執行）

1. 開啟「工作排程器」
2. 建立基本工作
3. 名稱：自動打卡
4. 觸發程序：電腦啟動時
5. 動作：啟動程式
   - 程式：`C:\Program Files\nodejs\node.exe`
   - 引數：`scheduler.js`
   - 開始於：`C:\Users\danielcheng\Desktop\auto-punch`
6. 完成

## 運作原理

1. 自動開啟打卡頁面
2. 截取驗證碼圖片
3. 使用 OCR (Tesseract) 識別驗證碼
4. 自動輸入並送出
5. 驗證是否打卡成功，失敗自動重試（最多 5 次）

## 檔案說明

- `punch.js` - 主要打卡邏輯
- `scheduler.js` - 排程器（每天 17:30 執行）
- `captcha.png` - 驗證碼截圖（執行時自動產生）
- `punch-success.png` - 成功截圖
- `punch-failed.png` - 失敗截圖

## 環境變數說明

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `PUNCH_URL` | 打卡系統網址 | - |
| `HEADLESS` | 是否背景執行（不顯示瀏覽器） | `false` |
| `MAX_RETRY` | OCR 識別失敗最大重試次數 | `5` |

## 注意事項

- 需保持電腦開機且網路連線正常
- 如果 OCR 識別率不佳，可調整 `MAX_RETRY` 增加重試次數
- 測試時建議用 `npm run test` 確認流程正常
- **請勿將 `.env` 檔案上傳到公開儲存庫**

## 免責聲明

本專案僅供學習和研究用途。使用者需自行確保使用方式符合所屬組織的規範與政策。開發者不對任何不當使用行為負責。

## License

MIT
