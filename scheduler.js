import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s
const PUNCH_AFTER_HOUR = 17; // trigger after 17:00 Mon–Fri
const MINUTES_BEFORE_OFF = 2; // open browser only N minutes before off-duty time

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
let scheduledTimeout = null; // when we've scheduled a single run for "just before off-time"

async function getOffTimeFromPage() {
  try {
    const { stdout } = await execAsync('node punch.js --get-offtime', { cwd: process.cwd() });
    const line = stdout.trim().split('\n').pop();
    const off = JSON.parse(line);
    return off; // { hour, minute, second }
  } catch (e) {
    return null;
  }
}

function runPunchNow() {
  const now = new Date().toLocaleString('zh-TW');
  console.log(`\n[${now}] 觸發自動打卡（接近下班時間，開瀏覽器一次）...\n`);
  execAsync('node punch.js', { cwd: process.cwd() })
    .then(({ stdout, stderr }) => {
      console.log(stdout);
      if (stderr) console.error(stderr);
    })
    .catch(error => {
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
      console.error('✗ 執行失敗:', error.message);
    });
}

async function runPunchIfNeeded() {
  const { todayKey, isWeekday, isAfterPunchTime } = getTaipeiCheck();
  if (!isWeekday || !isAfterPunchTime) return;
  if (lastPunchDate === todayKey) return; // already punched today
  if (scheduledTimeout !== null) return; // already scheduled a single run for today

  // Get off-duty time from page (quick headless open, then close)
  const offTime = await getOffTimeFromPage();
  if (!offTime) {
    console.log('無法取得下班時間，稍後再試');
    return;
  }

  // Taipei today at offTime (17:52) as UTC timestamp
  const now = new Date();
  const taipeiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const ty = taipeiNow.getUTCFullYear(), tm = taipeiNow.getUTCMonth(), td = taipeiNow.getUTCDate();
  const targetTaipeiMs = Date.UTC(ty, tm, td, offTime.hour, offTime.minute, offTime.second) - 8 * 60 * 60 * 1000;
  const runAtMs = targetTaipeiMs - MINUTES_BEFORE_OFF * 60 * 1000;
  let waitMs = runAtMs - now.getTime();
  if (waitMs > 24 * 60 * 60 * 1000) waitMs = 0; // sanity: if > 24h, run now
  if (waitMs < 0) waitMs = 0;

  if (waitMs === 0) {
    // already past (runAt), punch now
    lastPunchDate = todayKey;
    runPunchNow();
    return;
  }

  // Schedule single run at (off-time - 2 min)
  lastPunchDate = todayKey; // claim today so we don't run get-offtime again
  scheduledTimeout = setTimeout(() => {
    scheduledTimeout = null;
    runPunchNow();
  }, waitMs);

  const runAtDate = new Date(runAtMs);
  console.log(`\n已取得下班時間 ${offTime.hour}:${String(offTime.minute).padStart(2, '0')}，將在 ${runAtDate.toLocaleTimeString('zh-TW')} 左右開瀏覽器打卡一次\n`);
}

console.log('========================================');
console.log('自動打卡排程已啟動');
console.log('========================================');
console.log(`每 ${CHECK_INTERVAL_MS / 1000} 秒檢查，17:00 後取得下班時間，接近下班前才開瀏覽器一次`);
console.log('按 Ctrl+C 可停止');
console.log('========================================\n');

setInterval(runPunchIfNeeded, CHECK_INTERVAL_MS);
runPunchIfNeeded();

process.stdin.resume();
