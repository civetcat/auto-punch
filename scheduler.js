import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CHECK_INTERVAL_MS = 30 * 1000; // 每 30 秒檢查一次
const PUNCH_AFTER_HOUR = 17; // 週一～五 17:00 後才觸發

// 取得台北時間的今日 key 與是否為上班日、是否已過觸發時段
function getTaipeiCheck() {
  const d = new Date();
  const t = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const hour = t.getUTCHours();
  const day = t.getUTCDay(); // 0=日, 1=一, ..., 5=五, 6=六
  const todayKey = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  const isWeekday = day >= 1 && day <= 5;
  const isAfterPunchTime = hour >= PUNCH_AFTER_HOUR;
  return { todayKey, isWeekday, isAfterPunchTime };
}

let lastPunchDate = null; // 當天已觸發過就不再打

async function runPunchIfNeeded() {
  const { todayKey, isWeekday, isAfterPunchTime } = getTaipeiCheck();
  if (!isWeekday || !isAfterPunchTime || lastPunchDate === todayKey) return;

  lastPunchDate = todayKey;
  const now = new Date().toLocaleString('zh-TW');
  console.log(`\n[${now}] 觸發自動打卡流程...`);
  console.log('→ 將讀取頁面上的下班時間並自動等待\n');

  try {
    const { stdout, stderr } = await execAsync('node punch.js', { cwd: process.cwd() });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    // 子程式 exit code !== 0 時也會拋錯，印出它的輸出方便除錯
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    console.error('✗ 執行失敗:', error.message);
  }
}

console.log('========================================');
console.log('自動打卡排程已啟動');
console.log('========================================');
console.log(`每 ${CHECK_INTERVAL_MS / 1000} 秒檢查一次，週一至週五 17:00 後觸發`);
console.log('按 Ctrl+C 可停止');
console.log('========================================\n');

// 每 N 秒檢查是否該打卡
setInterval(runPunchIfNeeded, CHECK_INTERVAL_MS);
runPunchIfNeeded(); // 啟動時先檢查一次

process.stdin.resume();
