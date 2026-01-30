import SysTray from 'systray2';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKIP_FILE = join(__dirname, 'skip-punch.txt');

// Simple 16x16 ico (base64)
// Green check
const ICON_ON = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wBBsUYAQbFGYEGxRpD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AEGxRgBBsUZgQbFG4EGxRuBBsUaQ////AP///wD///8A////AP///wD///8A////AP///wD///8AQbFGAEGxRmBBsUbgQbFG/0GxRv9BsUbgQbFGkP///wD///8A////AP///wD///8A////AP///wBBsUYAQbFGYEGxRuBBsUb/QbFG/0GxRv9BsUb/QbFG4EGxRpD///8A////AP///wD///8A////AEGxRgBBsUZgQbFG4EGxRv9BsUb/QbFG4EGxRuBBsUb/QbFG/0GxRuBBsUaQ////AP///wD///8AQbFGAEGxRmBBsUbgQbFG/0GxRuBBsUaQ////AEGxRpBBsUbgQbFG/0GxRv9BsUbgQbFGkP///wBBsUYAQbFGYEGxRuBBsUbgQbFGkP///wD///8A////AP///wBBsUaQQbFG4EGxRv9BsUb/QbFG4EGxRpBBsUZgQbFGkEGxRpD///8A////AP///wD///8A////AP///wD///8AQbFGkEGxRuBBsUb/QbFG/0GxRuD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AEGxRpBBsUbgQbFG/0GxRuD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wBBsUaQQbFG4EGxRuD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8AQbFGkEGxRpD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AAD8PwAA+B8AAPAPAADgBwAAwAMAAIABAACAAQAAgAEAAMADAADAAwAA4AcAAPAPAAD4HwAA//8AAA==';

// 紅色 X 圖示
const ICON_OFF = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A4DYr/+A2K3D///8A////AP///wD///8A////AP///wD///8A////AOA2K3DgNiv/////AP///wD///8A4DYr/+A2K//gNiuQ////AP///wD///8A////AP///wD///8AkDYr/+A2K//gNiv/4DYrkP///wD///8A4DYrkOA2K//gNiv/4DYr/+A2K5D///8A////AP///wCQNiv/4DYr/+A2K//gNiv/4DYrkP///wD///8A4DYrkOA2K//gNiv/4DYr/+A2K//gNiv/4DYrkP///wCQNiv/4DYr/+A2K//gNiv/////AP///wD///8A////AOA2K//gNiv/4DYr/+A2K5D///8A////AOA2K//gNiv/4DYr/////wD///8A////AP///wD///8A////AOA2K//gNiv/4DYr/////wD///8A4DYr/+A2K//gNiv/////AP///wD///8A////AP///wD///8A4DYr/+A2K//gNiv/4DYr/+A2K//gNiv/////AP///wD///8A////AP///wD///8A////AP///wCQNiv/4DYr/+A2K//gNiv/4DYr/+A2K//gNiv/4DYrkP///wD///8A////AP///wD///8AkDYr/+A2K//gNiv/4DYrkP///wD///8A4DYrkOA2K//gNiv/4DYr/+A2K5D///8A////AOA2K//gNiv/4DYrkP///wD///8A////AP///wD///8A4DYrkOA2K//gNiv/4DYr/////wDgNiuQ4DYrkP///wD///8A////AP///wD///8A////AP///wD///8A4DYrkOA2K5D///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A////AP///wD///8A//8AAP//AADAPwAAgB8AAIAPAACABwAAAAMAAAADAAAAAQAAAAEAAAADAACAAwAAgAcAAMAHAADgDwAA//8AAA==';

function isEnabled() {
  return !fs.existsSync(SKIP_FILE);
}

function toggle() {
  if (isEnabled()) {
    fs.writeFileSync(SKIP_FILE, 'skip');
    return false;
  } else {
    fs.unlinkSync(SKIP_FILE);
    return true;
  }
}

function getStatusText() {
  return isEnabled() ? '狀態：已開啟 ✓' : '狀態：已關閉 ✗';
}

async function runPunchNow() {
  console.log('執行測試（dry-run，不會真的打卡）...');
  try {
    const { stdout, stderr } = await execAsync('node punch.js --dry-run', { cwd: __dirname });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('測試失敗:', error.message);
  }
}

const systray = new SysTray({
  menu: {
    icon: isEnabled() ? ICON_ON : ICON_OFF,
    title: '',
    tooltip: '自動打卡系統',
    items: [
      {
        title: getStatusText(),
        enabled: false,
      },
      SysTray.separator,
      {
        title: '切換開關',
        tooltip: '開啟/關閉自動打卡',
        enabled: true,
      },
      {
        title: '測試流程（不打卡）',
        tooltip: '測試 OCR 辨識，不會真的送出打卡',
        enabled: true,
      },
      SysTray.separator,
      {
        title: '退出',
        tooltip: '關閉托盤程式',
        enabled: true,
      },
    ],
  },
  debug: false,
  copyDir: true,
});

systray.onClick(async (action) => {
  switch (action.seq_id) {
    case 2: // toggle
      const nowEnabled = toggle();
      // update icon and status
      systray.sendAction({
        type: 'update-item',
        item: {
          ...action.item,
        },
        seq_id: 0,
      });
      systray.sendAction({
        type: 'update-menu',
        menu: {
          icon: nowEnabled ? ICON_ON : ICON_OFF,
          title: '',
          tooltip: '自動打卡系統',
          items: [
            {
              title: nowEnabled ? '狀態：已開啟 ✓' : '狀態：已關閉 ✗',
              enabled: false,
            },
            SysTray.separator,
            {
              title: '切換開關',
              tooltip: '開啟/關閉自動打卡',
              enabled: true,
            },
            {
              title: '測試流程（不打卡）',
              tooltip: '測試 OCR 辨識，不會真的送出打卡',
              enabled: true,
            },
            SysTray.separator,
            {
              title: '退出',
              tooltip: '關閉托盤程式',
              enabled: true,
            },
          ],
        },
      });
      console.log(`自動打卡: ${nowEnabled ? '已開啟' : '已關閉'}`);
      break;

    case 3: // 立即打卡
      await runPunchNow();
      break;

    case 5: // exit
      systray.kill(false);
      break;
  }
});

console.log('========================================');
console.log('自動打卡托盤程式已啟動');
console.log('========================================');
console.log(`目前狀態: ${isEnabled() ? '已開啟' : '已關閉'}`);
console.log('右鍵點擊托盤圖示可操作');
console.log('========================================');
