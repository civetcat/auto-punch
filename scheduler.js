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
    const { stdout } = await execAsync('node punch.js --get-offtime', { cwd: process.cwd(), timeout: 60000 });
    const line = stdout.trim().split('\n').pop();
    if (!line) return null;
    const off = JSON.parse(line);
    return off; // { hour, minute, second }
  } catch (e) {
    console.log('Get off-time failed:', e.message);
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
  const now = new Date();

  if (!offTime) {
    // Fallback: open browser now, punch.js will wait inside until off-time
    console.log('\nCould not get off-time (e.g. not logged in headless), opening browser now and let punch.js wait until off-time.\n');
    lastPunchDate = todayKey;
    runPunchNow();
    return;
  }

  // Taipei today at offTime (e.g. 17:52): 17:52 Taipei = 09:52 UTC
  const taipeiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const ty = taipeiNow.getUTCFullYear(), tm = taipeiNow.getUTCMonth(), td = taipeiNow.getUTCDate();
  let utcH = offTime.hour - 8;
  let utcD = td;
  if (utcH < 0) {
    utcH += 24;
    utcD -= 1;
  }
  const targetTaipeiMs = Date.UTC(ty, tm, utcD, utcH, offTime.minute, offTime.second);
  const runAtMs = targetTaipeiMs - MINUTES_BEFORE_OFF * 60 * 1000;
  let waitMs = runAtMs - now.getTime();
  if (waitMs > 24 * 60 * 60 * 1000) waitMs = 0; // sanity: if > 24h, run now
  if (waitMs < 0) waitMs = 0;

  if (waitMs === 0) {
    lastPunchDate = todayKey;
    runPunchNow();
    return;
  }

  lastPunchDate = todayKey;
  scheduledTimeout = setTimeout(() => {
    scheduledTimeout = null;
    runPunchNow();
  }, waitMs);

  const runAtDate = new Date(runAtMs);
  console.log(`\nOff-time ${offTime.hour}:${String(offTime.minute).padStart(2, '0')}, will open browser once at ~${runAtDate.toLocaleTimeString('zh-TW')}\n`);
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
