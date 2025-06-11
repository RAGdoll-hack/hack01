/**
 * ポップアップスクリプト
 * 
 * Chrome拡張機能のポップアップUIを制御するスクリプトです。
 * ユーザーの設定を管理し、バックグラウンドスクリプトと通信します。
 */

// スタイルシートのインポート
import '../styles/popup.css';

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', () => {
  const enabledCheckbox = document.getElementById('enabled');
  const saveButton = document.getElementById('saveBtn');
  const statusElement = document.getElementById('status');

  // 初期設定を読み込む
  loadSettings();

  // 保存ボタンのクリックイベント
  saveButton.addEventListener('click', saveSettings);

  /**
   * 設定を読み込む関数
   */
  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response && response.settings) {
        enabledCheckbox.checked = response.settings.enabled;
      }
    });
  }

  /**
   * 設定を保存する関数
   */
  function saveSettings() {
    const settings = {
      enabled: enabledCheckbox.checked
    };

    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS', 
      settings: settings 
    }, (response) => {
      if (response && response.success) {
        showStatus('設定が保存されました', 'success');
      } else {
        showStatus('設定の保存に失敗しました', 'error');
      }
    });
  }

  /**
   * ステータスメッセージを表示する関数
   * @param {string} message - 表示するメッセージ
   * @param {string} type - メッセージの種類 ('success' または 'error')
   */
  function showStatus(message, type) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';

    // 3秒後にメッセージを非表示にする
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
});
