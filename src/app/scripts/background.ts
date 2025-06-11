/**
 * バックグラウンドスクリプト
 *
 * Chrome拡張機能のバックグラウンドで動作するスクリプトです。
 * 拡張機能のライフサイクル全体を通じて実行されます。
 */

// Chrome APIの型定義をインポート
/// <reference types="chrome" />

// 設定の型定義
interface Settings {
    enabled: boolean;
    activeView?: 'settings' | 'empty'; // 現在アクティブなビュー
}

// メッセージの型定義
interface GetSettingsMessage {
    type: 'GET_SETTINGS';
}

interface UpdateSettingsMessage {
    type: 'UPDATE_SETTINGS';
    settings: Settings;
}

type Message = GetSettingsMessage | UpdateSettingsMessage;

// レスポンスの型定義
interface SettingsResponse {
    settings: Settings;
}

interface UpdateResponse {
    success: boolean;
}

// サイドパネルの設定
chrome.sidePanel
    .setPanelBehavior({openPanelOnActionClick: true})
    .catch((error) => {
        console.error('サイドパネルの設定に失敗しました:', error);
    });

// 拡張機能がインストールされたときのイベントリスナー
chrome.runtime.onInstalled.addListener(() => {
    console.log('拡張機能がインストールされました');

    // ストレージの初期化
    chrome.storage.local.set({
        settings: {
            enabled: true,
            activeView: 'settings' // デフォルトでは設定画面を表示
        }
    }, () => {
        console.log('初期設定が保存されました');
    });
});

// メッセージリスナーの設定
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    console.log('メッセージを受信しました:', message);

    if (message.type === 'GET_SETTINGS') {
        // 設定を取得してレスポンスを返す
        chrome.storage.local.get('settings', (data: { settings?: Settings }) => {
            const defaultSettings: Settings = {
                enabled: true,
                activeView: 'settings'
            };
            sendResponse({settings: data.settings || defaultSettings});
        });
        return true; // 非同期レスポンスを示すためにtrueを返す
    }

    if (message.type === 'UPDATE_SETTINGS') {
        // 設定を更新
        chrome.storage.local.set({settings: message.settings}, () => {
            sendResponse({success: true});
        });
        return true; // 非同期レスポンスを示すためにtrueを返す
    }
});
