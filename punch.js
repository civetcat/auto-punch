import { chromium } from 'playwright';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env
dotenv.config();

const PUNCH_URL = process.env.PUNCH_URL || 'http://tw-compbase.supermicro.com:6699/';
const HEADLESS = process.env.HEADLESS === 'true';
const MAX_RETRY = parseInt(process.env.MAX_RETRY || '10');

// OCR recognize captcha
async function recognizeCaptcha(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(`OCR: ${m.status} ${m.progress ? (m.progress * 100).toFixed(0) + '%' : ''}`),
      tessedit_char_whitelist: '0123456789', // digits only
    });
    
    // Clean result: strip whitespace, keep digits only (OCR may misread as § etc.)
    const cleaned = text.replace(/\s+/g, '').replace(/\D/g, '').trim();
    console.log(`✓ 驗證碼識別結果: ${cleaned || '(無)'}`);
    return cleaned;
  } catch (error) {
    console.error('✗ OCR 識別失敗:', error.message);
    return null;
  }
}

// Parse off-duty time from page text (use part after last " - " e.g. "5:41:00 PM")
function parseOffTime(timeString) {
  const part = timeString.includes(' - ') ? timeString.split(' - ').pop() : timeString;
  const match = part.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  
  let [, hour, minute, second, period] = match;
  hour = parseInt(hour);
  minute = parseInt(minute);
  second = parseInt(second);
  
  // 12h -> 24h
  if (period.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return { hour, minute, second };
}

// Only fetch off-duty time from page then exit (used by scheduler to know when to open browser)
async function getOffTimeOnly() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(PUNCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const userName = await page.locator('#UserName').textContent().catch(() => null);
    if (!userName) {
      console.error('Not logged in');
      return null;
    }
    let workTimeText = await page.locator('#expOut').textContent({ timeout: 5000 }).catch(() => '');
    if (!workTimeText) {
      workTimeText = await page.locator('[id*="xpOut"]').first().textContent().catch(() => '') || '';
    }
    const offTime = parseOffTime(`- ${workTimeText}`);
    return offTime;
  } finally {
    await browser.close();
  }
}

// Main punch flow
async function autoPunch(testMode = false, dryRun = false) {
  // Skip if switch file exists (skip-punch.txt); ignore switch in dry-run so test can run
  const skipFile = new URL('skip-punch.txt', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
  if (fs.existsSync(skipFile) && !dryRun) {
    console.log('⏸ 自動打卡已關閉（skip-punch.txt 存在），跳過本次執行');
    console.log('  執行 toggle-auto-punch.bat 可開啟');
    return true;
  }

  const browser = await chromium.launch({ 
    headless: HEADLESS, // from env
    slowMo: 500 // slower, more human-like
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('→ 開啟打卡頁面...');
    await page.goto(PUNCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check login
    const userName = await page.locator('#UserName').textContent().catch(() => null);
    if (!userName) {
      console.error('✗ 未登入或頁面載入失敗');
      return false;
    }
    console.log(`✓ 已登入: ${userName}`);

    // Already punched today?
    const pageContent = await page.content();
    if (pageContent.includes('本日已完成刷進退')) {
      console.log('✓ 本日已完成刷進退，無需再打卡');
      return true;
    }

    // Leave guard: need punch-in record (time like 8:52:47 AM); skip in dry-run so test reaches captcha
    // Table: row0 may be header (刷進, 刷退), row1 = data (8:52:47 AM, empty). Use last row for data.
    const rowCount = await page.locator('#log tr').count();
    let punchInRecord = '';
    if (rowCount >= 2) {
      punchInRecord = await page.locator('#log tr').last().locator('td').first().textContent().catch(() => '') || '';
    } else if (rowCount === 1) {
      punchInRecord = await page.locator('#log tr').first().locator('td').first().textContent().catch(() => '') || '';
    }
    const looksLikeTime = /^\s*\d{1,2}:\d{2}/.test(punchInRecord); // e.g. "8:52:47 AM"
    if (!dryRun && !looksLikeTime) {
      console.log('⚠ 今日無上班打卡記錄（可能請假），跳過自動打卡');
      return true; // success to avoid retry
    }
    if (looksLikeTime) {
      console.log(`✓ 上班打卡記錄: ${punchInRecord.trim()}`);
    }
    
    // Get off-duty time
    let workTimeText = await page.locator('#expOut').textContent({ timeout: 5000 }).catch(() => '');
    if (!workTimeText) {
      workTimeText = await page.locator('[id*="xpOut"], [id*="off"]').first().textContent().catch(() => '') || '';
    }
    console.log(`✓ 下班時間: ${workTimeText}`);
    
    // Wait until off-time only for real punch; test/dry-run go straight to captcha
    if (!testMode && !dryRun) {
      const offTime = parseOffTime(`- ${workTimeText}`);
      if (offTime) {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(offTime.hour, offTime.minute, offTime.second, 0);
        
        const waitMs = targetTime - now;
        if (waitMs > 0) {
          console.log(`⏰ 等待到 ${targetTime.toLocaleTimeString('zh-TW')} 才打卡...`);
          await page.waitForTimeout(Math.min(waitMs, 3600000)); // max 1h
        }
      }
    } else if (dryRun) {
      console.log('⏩ Dry-Run：跳過等待，直接測試驗證碼辨識');
    }
    
    // Delay without page (avoids crash when page closed)
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // Retry up to MAX_RETRY
    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        console.log(`\n--- 第 ${attempt} 次嘗試 ---`);

        // Screenshot captcha (supports #ImgCaptcha, ctl00_xxx_ImgCaptcha, or img with Captcha/確認)
        let captchaImg = page.locator('img[id*="ImgCaptcha"], img[id*="Captcha"], img[id*="aptcha"], img[alt*="確認"]').first();
        await captchaImg.waitFor({ state: 'visible', timeout: 10000 });
        await captchaImg.screenshot({ path: 'captcha.png', timeout: 5000 });
        console.log('✓ 驗證碼截圖完成');

        // OCR
        const captchaCode = await recognizeCaptcha('captcha.png');
        if (!captchaCode || captchaCode.length < 3) {
          console.log(`✗ 驗證碼識別失敗或太短 (${captchaCode})，重新整理...`);
          if (dryRun && attempt === MAX_RETRY) {
            console.log(`\n[RESULT]${JSON.stringify({ success: false, captcha: captchaCode || '(無)', message: '驗證碼辨識失敗或太短' })}[/RESULT]`);
          }
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
          await delay(2000);
          continue;
        }

        // Fill captcha input (supports #captchacode, ctl00_xxx_captchacode, or input with code/確認)
        const captchaInput = page.locator('input[id*="captchacode"], input[id*="aptcha"], input[name*="captcha"], input[placeholder*="確認"]').first();
        await captchaInput.waitFor({ state: 'visible', timeout: 5000 });
        await captchaInput.clear();
        await captchaInput.fill(captchaCode);
        console.log(`✓ 已輸入驗證碼: ${captchaCode}`);

        if (dryRun) {
          console.log('\n🔍 [Dry-Run] 已完成驗證碼識別與填入，但不送出打卡');
          console.log('如要實際打卡，請移除 --dry-run 參數');
          await page.screenshot({ path: 'dry-run-preview.png', fullPage: true });
          console.log('✓ 已截圖儲存為 dry-run-preview.png');
          // JSON result for Extension (must be last output)
          const result = { success: true, captcha: captchaCode, message: '測試完成，驗證碼辨識成功' };
          console.log(`\n[RESULT]${JSON.stringify(result)}[/RESULT]`);
          // stderr for debug
          console.error(`[DEBUG] Captcha: ${captchaCode}`);
          return true;
        }

        // Submit (Enter)
        await captchaInput.press('Enter');
        await delay(3000);

        // Check success (page closed will throw, handled by catch)
        const msgElement = page.locator('#Msg');
        const msg = await msgElement.textContent().catch(() => '');

        // Check punch log table
        const lastRow = await page.locator('#log tr').last().locator('td').allTextContents().catch(() => []);

        console.log(`刷卡訊息: ${msg}`);
        console.log(`最後刷卡記錄: ${lastRow.join(' | ')}`);

        // Success = punch-out column has time
        if (lastRow.length >= 2 && lastRow[1].trim() !== '') {
          console.log('\n✓✓✓ 打卡成功！✓✓✓');
          await page.screenshot({ path: 'punch-success.png', fullPage: true });
          return true;
        } else {
          // On failure: reload, get new captcha, retry
          const reason = msg.includes('驗證碼錯誤') || msg.includes('確認碼') ? '驗證碼錯誤' : '狀態不明';
          console.log(`✗ ${reason}，重新載入並辨識...`);
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
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

// Run
const testMode = process.argv.includes('--test');
const dryRun = process.argv.includes('--dry-run');
const getOffTime = process.argv.includes('--get-offtime');

if (getOffTime) {
  getOffTimeOnly().then(offTime => {
    if (offTime) {
      console.log(JSON.stringify(offTime));
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
} else if (dryRun) {
  console.log('=== Dry-Run 模式（測試流程但不送出打卡）===');
  autoPunch(testMode, dryRun).then(success => process.exit(success ? 0 : 1));
} else if (testMode) {
  console.log('=== 測試模式（立即執行）===');
  autoPunch(testMode, dryRun).then(success => process.exit(success ? 0 : 1));
} else {
  console.log('=== 正式模式（等待下班時間）===');
  autoPunch(testMode, dryRun).then(success => process.exit(success ? 0 : 1));
}
