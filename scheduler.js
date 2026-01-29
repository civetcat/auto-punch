import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 每天下午 5:00 開始檢查並自動打卡
// punch.js 會自動讀取當天的下班時間並等待到正確時間才打卡
// 格式: '分 時 * * *' (分 時 日 月 週)
const SCHEDULE = '0 17 * * 1-5'; // 週一到週五 17:00

console.log('========================================');
console.log('自動打卡排程已啟動');
console.log('========================================');
console.log(`觸發時間: 週一至週五 17:00`);
console.log('系統會自動讀取當天下班時間並等待');
console.log('按 Ctrl+C 可停止');
console.log('========================================\n');

cron.schedule(SCHEDULE, async () => {
  const now = new Date().toLocaleString('zh-TW');
  console.log(`\n[${now}] 觸發自動打卡流程...`);
  console.log('→ 將讀取頁面上的下班時間並自動等待\n');
  
  try {
    const { stdout, stderr } = await execAsync('node punch.js', {
      cwd: process.cwd()
    });
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
  } catch (error) {
    console.error('✗ 執行失敗:', error.message);
  }
}, {
  timezone: "Asia/Taipei"
});

// 保持程序運行
process.stdin.resume();
