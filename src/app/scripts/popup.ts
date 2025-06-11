/**
 * ポップアップスクリプト
 *
 * Chrome拡張機能のポップアップUIを制御するスクリプトです。
 * ユーザーの設定を管理し、バックグラウンドスクリプトと通信します。
 */

// スタイルシートのインポート
import '../styles/popup.css';

// Chrome APIの型定義をインポート
/// <reference types="chrome" />

// 設定の型定義
interface Settings {
    enabled: boolean;
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

// メッセージレスポンスの型定義
interface SettingsResponse {
    settings: Settings;
}

interface UpdateResponse {
    success: boolean;
}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', () => {
    const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
    const saveButton = document.getElementById('saveBtn') as HTMLButtonElement;
    const statusElement = document.getElementById('status') as HTMLElement;

    // 初期設定を読み込む
    loadSettings();

    // 保存ボタンのクリックイベント
    saveButton.addEventListener('click', saveSettings);

    /**
     * 設定を読み込む関数
     */
    function loadSettings(): void {
        const message: GetSettingsMessage = {type: 'GET_SETTINGS'};
        chrome.runtime.sendMessage(message, (response: SettingsResponse) => {
            if (response && response.settings) {
                enabledCheckbox.checked = response.settings.enabled;
            }
        });
    }

    /**
     * 設定を保存する関数
     */
    function saveSettings(): void {
        const settings: Settings = {
            enabled: enabledCheckbox.checked
        };

        const message: UpdateSettingsMessage = {
            type: 'UPDATE_SETTINGS',
            settings: settings
        };

        chrome.runtime.sendMessage(message, (response: UpdateResponse) => {
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
    function showStatus(message: string, type: 'success' | 'error'): void {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';

        // 3秒後にメッセージを非表示にする
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
});
