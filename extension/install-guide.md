# Chrome Extension 安裝指南

## 步驟 1：載入 Extension

1. 開啟 Chrome → `chrome://extensions/`
2. 開啟右上角「開發人員模式」
3. 點擊「載入未封裝項目」
4. 選擇資料夾：`c:\Users\danielcheng\Desktop\auto-punch\extension`
5. **複製 Extension ID**（在 Extension 卡片上可以看到，類似 `abcdefghijklmnopqrstuvwxyz123456`）

## 步驟 2：註冊 Native Host

執行 `install-native-host.bat`，並在提示時貼上 Extension ID。

或者手動執行：

```batch
install-native-host.bat
```

然後貼上 Extension ID。

## 步驟 3：測試

重新載入 Extension（點擊 Extension 卡片上的重新載入圖示），然後點擊 Extension 圖示測試。
