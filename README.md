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

### 方式 0：Dry-Run 模式（測試用，不會真的打卡）⭐
```powershell
npm run dry-run
```
或直接執行 `dry-run.bat`

會執行完整流程（包括 OCR 識別驗證碼），但**不會送出打卡**。適合用來測試是否運作正常。

### 方式 1：測試模式（立即執行）
```powershell
npm run test
```
會立即嘗試打卡，不會等到下班時間（⚠️ 會實際送出打卡）

### 方式 2：單次執行（等待下班時間）
```powershell
npm run punch
```
會自動讀取頁面上的下班時間，並等待到時間後才打卡

### 方式 3：排程自動執行（建議）
```powershell
node scheduler.js
```
每天 17:00 自動觸發，會自動讀取當天的下班時間並等待到正確時間才打卡
（或用 Windows 工作排程器在開機時執行）

## 開機自動啟動設定（背景執行）⭐

### 方法 1：一般使用者（推薦，不需管理員權限）
直接雙擊執行 `setup-startup-user.bat`

這會：
- 在啟動資料夾建立捷徑
- 開機時自動啟動
- 背景靜默執行（不顯示任何視窗）
- 每天 17:00 自動讀取當天下班時間並打卡

**移除自動啟動**：執行 `remove-startup-user.bat`

### 方法 2：系統管理員（需要管理員權限）
執行 `setup-startup.bat`（以系統管理員身分執行）

**移除自動啟動**：執行 `remove-startup.bat`

### 手動設定（進階）
1. 開啟「工作排程器」
2. 建立基本工作
3. 名稱：自動打卡
4. 觸發程序：電腦啟動時
5. 動作：啟動程式
   - 程式：`wscript.exe`
   - 引數：`"C:\Users\danielcheng\Desktop\auto-punch\start-hidden.vbs"`
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
| `HEADLESS` | 是否背景執行（不顯示瀏覽器）<br>背景執行設為 `true`，測試時設為 `false` | `true` |
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
