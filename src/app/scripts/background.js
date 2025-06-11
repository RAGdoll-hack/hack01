/**
 * バックグラウンドスクリプト
 * 
 * Chrome拡張機能のバックグラウンドで動作するスクリプトです。
 * 拡張機能のライフサイクル全体を通じて実行されます。
 */

// 拡張機能がインストールされたときのイベントリスナー
chrome.runtime.onInstalled.addListener(() => {
  console.log('拡張機能がインストールされました');
  
  // ストレージの初期化
  chrome.storage.local.set({ settings: { enabled: true } }, () => {
    console.log('初期設定が保存されました');
  });
});

// メッセージリスナーの設定
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('メッセージを受信しました:', message);
  
  if (message.type === 'GET_SETTINGS') {
    // 設定を取得してレスポンスを返す
    chrome.storage.local.get('settings', (data) => {
      sendResponse({ settings: data.settings || { enabled: true } });
    });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }
  
  if (message.type === 'UPDATE_SETTINGS') {
    // 設定を更新
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true; // 非同期レスポンスを示すためにtrueを返す
  }
});