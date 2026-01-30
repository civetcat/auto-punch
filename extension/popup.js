const HOST_NAME = 'com.autopunch.host';

let isEnabled = false;

function updateUI(enabled, message = null) {
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  
  isEnabled = enabled;
  
  if (enabled) {
    statusIcon.textContent = '✅';
    statusText.textContent = '自動打卡：已開啟';
    toggleBtn.textContent = '關閉自動打卡';
  } else {
    statusIcon.textContent = '⏸️';
    statusText.textContent = '自動打卡：已關閉';
    toggleBtn.textContent = '開啟自動打卡';
  }
  
  if (message) {
    statusText.textContent = message;
  }
}

function showError(msg) {
  const errorDiv = document.getElementById('errorMsg');
  errorDiv.textContent = msg;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 3000);
}

function sendMessage(action) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendNativeMessage(HOST_NAME, { action }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function getStatus() {
  try {
    const response = await sendMessage('status');
    updateUI(response.enabled);
  } catch (e) {
    showError('無法連接 Native Host，請確認已安裝');
    console.error(e);
  }
}

async function toggle() {
  const toggleBtn = document.getElementById('toggleBtn');
  toggleBtn.classList.add('loading');
  
  try {
    const response = await sendMessage('toggle');
    updateUI(response.enabled);
  } catch (e) {
    showError('操作失敗: ' + e.message);
  } finally {
    toggleBtn.classList.remove('loading');
  }
}

async function punchNow() {
  const punchBtn = document.getElementById('punchBtn');
  const statusText = document.getElementById('statusText');
  const testResult = document.getElementById('testResult');
  const testMessage = document.getElementById('testMessage');
  const captchaCode = document.getElementById('captchaCode');
  
  punchBtn.classList.add('loading');
  punchBtn.textContent = '執行中...';
  statusText.textContent = '測試約需 30-60 秒，請勿關閉';
  testResult.style.display = 'none';
  
  try {
    const response = await sendMessage('punch');
    
    // 顯示測試結果
    testResult.style.display = 'block';
    testMessage.textContent = response.message || '已執行';
    captchaCode.textContent = response.captcha || '未知';
    
    // 如果有 debug 資訊，也顯示
    if (response.debug) {
      testMessage.textContent += ` (${response.debug})`;
    }
    
    // 根據成功/失敗設定樣式
    if (response.success) {
      testMessage.style.color = '#4ade80';
      captchaCode.style.color = '#4ade80';
      statusText.textContent = '✓ 測試成功';
    } else {
      testMessage.style.color = '#f87171';
      captchaCode.style.color = '#f87171';
      statusText.textContent = '✗ 測試失敗';
    }
  } catch (e) {
    showError('測試失敗: ' + e.message);
    testResult.style.display = 'block';
    testMessage.textContent = '連接失敗';
    testMessage.style.color = '#f87171';
    captchaCode.textContent = '無';
    captchaCode.style.color = '#f87171';
    statusText.textContent = '✗ 連接失敗';
  } finally {
    punchBtn.classList.remove('loading');
    punchBtn.textContent = '測試流程（不打卡）';
  }
}

document.getElementById('toggleBtn').addEventListener('click', toggle);
document.getElementById('punchBtn').addEventListener('click', punchNow);

// 顯示 Extension ID
chrome.runtime.sendMessage({action: 'getExtId'}, (response) => {
  const extId = chrome.runtime.id;
  document.getElementById('extId').textContent = extId;
});

// 初始化
getStatus();
