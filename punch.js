import { chromium } from 'playwright';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

const PUNCH_URL = process.env.PUNCH_URL || 'http://tw-compbase.supermicro.com:6699/';
const HEADLESS = process.env.HEADLESS === 'true';
const MAX_RETRY = parseInt(process.env.MAX_RETRY || '10');

// OCR 識別驗證碼
async function recognizeCaptcha(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(`OCR: ${m.status} ${m.progress ? (m.progress * 100).toFixed(0) + '%' : ''}`),
      tessedit_char_whitelist: '0123456789', // 只識別數字
    });
    
    // 清理識別結果：移除空白、只保留數字（OCR 有時會誤辨成 § 等符號）
    const cleaned = text.replace(/\s+/g, '').replace(/\D/g, '').trim();
    console.log(`✓ 驗證碼識別結果: ${cleaned || '(無)'}`);
    return cleaned;
  } catch (error) {
    console.error('✗ OCR 識別失敗:', error.message);
    return null;
  }
}

// 從頁面解析下班時間
function parseOffTime(timeString) {
  // 例如: "8:41:59 AM - 5:41:00 PM"
  const match = timeString.match(/-\s*(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  
  let [, hour, minute, second, period] = match;
  hour = parseInt(hour);
  minute = parseInt(minute);
  second = parseInt(second);
  
  // 轉換 12 小時制到 24 小時制
  if (period.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return { hour, minute, second };
}

// 主要打卡流程
async function autoPunch(testMode = false, dryRun = false) {
  const browser = await chromium.launch({ 
    headless: HEADLESS, // 從環境變數讀取
    slowMo: 500 // 減慢操作速度，更像人類
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('→ 開啟打卡頁面...');
    await page.goto(PUNCH_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 檢查是否已登入
    const userName = await page.locator('#UserName').textContent().catch(() => null);
    if (!userName) {
      console.error('✗ 未登入或頁面載入失敗');
      return false;
    }
    console.log(`✓ 已登入: ${userName}`);

    // 檢查是否已完成今日打卡
    const pageContent = await page.content();
    if (pageContent.includes('本日已完成刷進退')) {
      console.log('✓ 本日已完成刷進退，無需再打卡');
      return true;
    }
    
    // 取得下班時間
    const workTimeText = await page.locator('#expOut').textContent();
    console.log(`✓ 下班時間: ${workTimeText}`);
    
    if (!testMode) {
      // 解析並等待到下班時間
      const offTime = parseOffTime(`- ${workTimeText}`);
      if (offTime) {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(offTime.hour, offTime.minute, offTime.second, 0);
        
        const waitMs = targetTime - now;
        if (waitMs > 0) {
          console.log(`⏰ 等待到 ${targetTime.toLocaleTimeString('zh-TW')} 才打卡...`);
          await page.waitForTimeout(Math.min(waitMs, 3600000)); // 最多等 1 小時
        }
      }
    }
    
    // 不依賴 page 的延遲，避免頁面被關閉時 crash
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // 最多嘗試 MAX_RETRY 次
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        console.log(`\n--- 第 ${attempt} 次嘗試 ---`);

        // 截圖驗證碼
        const captchaImg = page.locator('#ImgCaptcha');
        await captchaImg.screenshot({ path: 'captcha.png' });
        console.log('✓ 驗證碼截圖完成');

        // OCR 識別
        const captchaCode = await recognizeCaptcha('captcha.png');
        if (!captchaCode || captchaCode.length < 3) {
          console.log(`✗ 驗證碼識別失敗或太短 (${captchaCode})，重新整理...`);
          await page.reload({ waitUntil: 'networkidle' });
          await delay(2000);
          continue;
        }

        // 輸入驗證碼
        const captchaInput = page.locator('#captchacode');
        await captchaInput.clear();
        await captchaInput.fill(captchaCode);
        console.log(`✓ 已輸入驗證碼: ${captchaCode}`);

        if (dryRun) {
          console.log('\n🔍 [Dry-Run] 已完成驗證碼識別與填入，但不送出打卡');
          console.log('如要實際打卡，請移除 --dry-run 參數');
          await page.screenshot({ path: 'dry-run-preview.png', fullPage: true });
          console.log('✓ 已截圖儲存為 dry-run-preview.png');
          return true;
        }

        // 送出 (按 Enter)
        await captchaInput.press('Enter');
        await delay(3000);

        // 檢查是否成功（若頁面已關閉會拋錯，由 catch 處理）
        const msgElement = page.locator('#Msg');
        const msg = await msgElement.textContent().catch(() => '');

        // 檢查刷卡記錄表格
        const lastRow = await page.locator('#log tr').last().locator('td').allTextContents().catch(() => []);

        console.log(`刷卡訊息: ${msg}`);
        console.log(`最後刷卡記錄: ${lastRow.join(' | ')}`);

        // 判斷是否成功（刷退欄位有時間）
        if (lastRow.length >= 2 && lastRow[1].trim() !== '') {
          console.log('\n✓✓✓ 打卡成功！✓✓✓');
          await page.screenshot({ path: 'punch-success.png', fullPage: true });
          return true;
        } else {
          // 失敗（驗證碼錯誤或狀態不明）就重新載入頁面、取得新驗證碼再辨識
          const reason = msg.includes('驗證碼錯誤') || msg.includes('確認碼') ? '驗證碼錯誤' : '狀態不明';
          console.log(`✗ ${reason}，重新載入並辨識...`);
          await page.reload({ waitUntil: 'networkidle' });
          await delay(2000);
        }
      } catch (err) {
        const closed = /closed|detached/i.test(err.message);
        if (closed) {
          console.error('✗ 頁面或瀏覽器已關閉，結束流程');
          break;
        }
        throw err;
      }
    }
    
    console.error(`\n✗✗✗ ${MAX_RETRY} 次嘗試後仍失敗 ✗✗✗`);
    await page.screenshot({ path: 'punch-failed.png', fullPage: true });
    return false;
    
  } catch (error) {
    console.error('✗ 發生錯誤:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// 執行
const testMode = process.argv.includes('--test');
const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  console.log('=== Dry-Run 模式（測試流程但不送出打卡）===');
} else if (testMode) {
  console.log('=== 測試模式（立即執行）===');
} else {
  console.log('=== 正式模式（等待下班時間）===');
}

autoPunch(testMode, dryRun).then(success => {
  process.exit(success ? 0 : 1);
});
