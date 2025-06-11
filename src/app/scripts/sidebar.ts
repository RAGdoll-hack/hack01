/**
 * サイドバースクリプト
 *
 * Chrome拡張機能のサイドバーUIを制御するスクリプトです。
 * ユーザーの設定を管理し、バックグラウンドスクリプトと通信します。
 * 設定画面と空の画面を切り替える機能を提供します。
 */

// スタイルシートのインポート
import '../styles/sidebar.css';

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
    const toggleViewButton = document.getElementById('toggleViewBtn') as HTMLButtonElement;
    const settingsView = document.getElementById('settingsView') as HTMLElement;
    const emptyView = document.getElementById('emptyView') as HTMLElement;

    // 初期設定を読み込む
    loadSettings();

    // 保存ボタンのクリックイベント
    saveButton.addEventListener('click', saveSettings);

    // 表示切替ボタンのクリックイベント
    toggleViewButton.addEventListener('click', toggleView);

    /**
     * 設定を読み込む関数
     */
    function loadSettings(): void {
        const message: GetSettingsMessage = {type: 'GET_SETTINGS'};
        chrome.runtime.sendMessage(message, (response: SettingsResponse) => {
            if (response && response.settings) {
                enabledCheckbox.checked = response.settings.enabled;

                // アクティブなビューを設定
                if (response.settings.activeView) {
                    setActiveView(response.settings.activeView);
                }
            }
        });
    }

    /**
     * 設定を保存する関数
     */
    function saveSettings(): void {
        // 現在のアクティブなビューを取得
        const activeView = settingsView.classList.contains('active') ? 'settings' : 'empty';

        const settings: Settings = {
            enabled: enabledCheckbox.checked,
            activeView: activeView
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
     * ビューを切り替える関数
     */
    function toggleView(): void {
        if (settingsView.classList.contains('active')) {
            setActiveView('empty');
        } else {
            setActiveView('settings');
        }

        // 設定を保存して状態を維持
        saveSettings();
    }

    /**
     * アクティブなビューを設定する関数
     * @param {string} viewName - アクティブにするビュー名 ('settings' または 'empty')
     */
    function setActiveView(viewName: 'settings' | 'empty'): void {
        if (viewName === 'settings') {
            settingsView.classList.add('active');
            emptyView.classList.remove('active');
            toggleViewButton.textContent = '空の画面に切替';
        } else {
            settingsView.classList.remove('active');
            emptyView.classList.add('active');
            toggleViewButton.textContent = '設定画面に切替';
        }
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
