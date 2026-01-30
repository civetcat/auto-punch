import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s
const PUNCH_AFTER_HOUR = 17; // trigger after 17:00 Mon–Fri

// Taipei time: today key, is weekday, is after punch time
function getTaipeiCheck() {
  const d = new Date();
  const t = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const hour = t.getUTCHours();
  const day = t.getUTCDay(); // 0=Sun .. 5=Fri, 6=Sat
  const todayKey = `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  const isWeekday = day >= 1 && day <= 5;
  const isAfterPunchTime = hour >= PUNCH_AFTER_HOUR;
  return { todayKey, isWeekday, isAfterPunchTime };
}

let lastPunchDate = null; // only punch once per day

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
    // child exit code !== 0 also throws; log its output for debug
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

// Check every N seconds
setInterval(runPunchIfNeeded, CHECK_INTERVAL_MS);
runPunchIfNeeded(); // run once on start

process.stdin.resume();
