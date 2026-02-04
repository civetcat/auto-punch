#!/usr/bin/env node
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SKIP_FILE = join(__dirname, '..', 'skip-punch.txt');
const ROOT = join(__dirname, '..');

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

// When enabling from Extension: run check in a detached process (host must exit after reply)
function runCheckAndPunchIfNeeded() {
  const child = spawn('node', ['check-and-punch-if-needed.js'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

// Simulate 5 PM flow (get off-time once + run punch) for testing; spawns detached
function runSimulate5pm() {
  const child = spawn('node', ['simulate-5pm.js'], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function runPunch() {
  try {
    // In test mode, temporarily remove skip-punch.txt if present
    const skipFile = join(__dirname, '..', 'skip-punch.txt');
    const skipFileExisted = fs.existsSync(skipFile);
    if (skipFileExisted) {
      fs.renameSync(skipFile, skipFile + '.bak');
    }
    
    let stdout, stderr;
    try {
      const result = await execAsync('node punch.js --dry-run', { 
        cwd: join(__dirname, '..'),
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } finally {
      // Restore skip-punch.txt if it existed
      if (skipFileExisted && fs.existsSync(skipFile + '.bak')) {
        fs.renameSync(skipFile + '.bak', skipFile);
      }
    }
    
    // Full output for debug
    const fullOutput = stdout + (stderr ? '\n[stderr]\n' + stderr : '');
    
    // Parse JSON result ([\s\S] = any char including newline)
    const resultMatch = stdout.match(/\[RESULT\]([\s\S]*?)\[\/RESULT\]/);
    if (resultMatch) {
      try {
        const result = JSON.parse(resultMatch[1].trim());
        return result;
      } catch (e) {
        // JSON parse failed, try other extraction
      }
    }
    
    // Try to extract captcha (multiple patterns)
    let captcha = null;
    
    // Pattern 1: "已輸入驗證碼: 1234"
    let match = stdout.match(/已輸入驗證碼[：:]\s*(\d+)/);
    if (match) {
      captcha = match[1];
    }
    
    // Pattern 2: "驗證碼識別結果: 1234"
    if (!captcha) {
      match = stdout.match(/驗證碼識別結果[：:]\s*(\d+)/);
      if (match) {
        captcha = match[1];
      }
    }
    
    // Pattern 3: "✓ 已輸入驗證碼: 1234" etc.
    if (!captcha) {
      match = stdout.match(/[✓✔]\s*.*?[：:]\s*(\d{3,6})/);
      if (match) {
        captcha = match[1];
      }
    }
    
    // Pattern 4: 4–6 digit number near captcha keyword
    if (!captcha) {
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('驗證碼') || line.includes('captcha')) {
          match = line.match(/(\d{4,6})/);
          if (match) {
            captcha = match[1];
            break;
          }
        }
      }
    }
    
    // Success/fail
    const isSuccess = stdout.includes('Dry-Run') || stdout.includes('已完成') || captcha !== null;
    
    // If still no captcha, include output preview for debug
    const debugInfo = captcha ? '' : `\n輸出預覽: ${fullOutput.substring(0, 200).replace(/\n/g, ' ')}`;
    
    return { 
      success: isSuccess, 
      captcha: captcha || '未知',
      message: captcha ? '測試完成，驗證碼辨識成功' : (stdout.includes('失敗') ? '驗證碼辨識失敗' : '測試完成，但無法提取驗證碼'),
      debug: `輸出長度: ${stdout.length} 字符${debugInfo}`
    };
  } catch (e) {
    return { 
      success: false, 
      captcha: '無',
      message: `執行失敗: ${e.message}` 
    };
  }
}

// Read stdin message (Chrome Native Messaging format)
function readMessage() {
  return new Promise((resolve, reject) => {
    let lengthBuffer = Buffer.alloc(4);
    let bytesRead = 0;
    
    process.stdin.on('readable', () => {
      let chunk;
      
      // Read 4-byte length first
      if (bytesRead < 4) {
        chunk = process.stdin.read(4 - bytesRead);
        if (chunk) {
          chunk.copy(lengthBuffer, bytesRead);
          bytesRead += chunk.length;
        }
      }
      
      if (bytesRead === 4) {
        const messageLength = lengthBuffer.readUInt32LE(0);
        const message = process.stdin.read(messageLength);
        if (message) {
          try {
            resolve(JSON.parse(message.toString()));
          } catch (e) {
            reject(e);
          }
        }
      }
    });
    
    process.stdin.on('end', () => {
      reject(new Error('stdin ended'));
    });
  });
}

// Write stdout message (Chrome Native Messaging format)
function writeMessage(message) {
  const json = JSON.stringify(message);
  const buffer = Buffer.from(json);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}

async function main() {
  try {
    const request = await readMessage();
    
    switch (request.action) {
      case 'status':
        writeMessage({ enabled: isEnabled() });
        break;
        
      case 'toggle':
        const nowEnabled = toggle();
        writeMessage({ enabled: nowEnabled });
        if (nowEnabled) runCheckAndPunchIfNeeded(); // 開啟時背景跑一次檢查，若要打下班卡就立刻打
        break;
        
      case 'punch':
        const result = await runPunch();
        writeMessage(result);
        break;

      case 'simulate-five-pm':
        runSimulate5pm();
        writeMessage({ ok: true, message: '已觸發模擬五點流程，請觀察瀏覽器（應只開 2 次：取下班時間 + 打卡）' });
        break;
        
      default:
        writeMessage({ error: 'Unknown action' });
    }
  } catch (e) {
    writeMessage({ error: e.message });
  }
  
  process.exit(0);
}

main();
