import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 每天下午 5:30 檢查是否需要打卡
// 可以調整時間，格式: '分 時 * * *' (分 時 日 月 週)
const SCHEDULE = '30 17 * * 1-5'; // 週一到週五 17:30

console.log('自動打卡排程已啟動');
console.log(`排程時間: 週一至週五 17:30`);
console.log('按 Ctrl+C 可停止\n');

cron.schedule(SCHEDULE, async () => {
  console.log(`\n[${new Date().toLocaleString('zh-TW')}] 觸發自動打卡...`);
  
  try {
    const { stdout, stderr } = await execAsync('node punch.js', {
      cwd: process.cwd()
    });
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
  } catch (error) {
    console.error('執行失敗:', error.message);
  }
}, {
  timezone: "Asia/Taipei"
});

// 保持程序運行
process.stdin.resume();
