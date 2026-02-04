#!/usr/bin/env node
/**
 * Simulate "5 PM flow": get off-time once (headless, then close), then run punch (one visible browser).
 * Used by Extension "模擬實際情況" to test without waiting for 17:00. Should open browser only twice.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('[模擬五點] 步驟 1/2：取得下班時間（headless 開一次即關）…');
  let offTime = null;
  try {
    const { stdout } = await execAsync('node punch.js --get-offtime', { cwd: __dirname, timeout: 60000 });
    const line = stdout.trim().split('\n').pop();
    if (line) offTime = JSON.parse(line);
  } catch (e) {
    console.log('[模擬五點] 取得下班時間失敗，改直接執行打卡流程');
  }
  if (offTime) console.log(`[模擬五點] 下班時間 ${offTime.hour}:${String(offTime.minute).padStart(2, '0')}`);

  console.log('[模擬五點] 步驟 2/2：模擬打卡流程（不送出，只截圖與辨識驗證碼）…');
  await execAsync('node punch.js --dry-run', { cwd: __dirname }).catch(() => {});
  console.log('[模擬五點] 結束');
}

main();
