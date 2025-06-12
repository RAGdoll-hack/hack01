/**
 * サイドバースクリプト
 *
 * Chrome拜張機能のサイドバーUIを制御するスクリプトです。
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
    // const emptyTextContainer = emptyView.querySelector('.empty-view') as HTMLElement | null; // 削除済みであることを確認
    const addWarningButton = document.getElementById('addWarningBtn') as HTMLButtonElement;
    const warningsContainer = document.getElementById('warningsContainer') as HTMLElement | null;

    // 初期設定を読み込む
    loadSettings();

    if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
    }
    if (toggleViewButton) {
        toggleViewButton.addEventListener('click', toggleView);
    }

    if (addWarningButton && warningsContainer) {
        addWarningButton.addEventListener('click', () => {
            const dangerLevel = "高";
            const issues = ["不適切なコンテンツ", "攻撃的な表現"];
            const specificText = "「これはテスト用の攻撃的な発言です。」";
            const timestamp = new Date();

            const newWarningElement = createWarningElement(dangerLevel, issues, specificText, timestamp);

            warningsContainer.prepend(newWarningElement);

            requestAnimationFrame(() => {
                newWarningElement.classList.add('show');
                // setActiveView の呼び出しを requestAnimationFrame のコールバック内に移動
                const currentViewIsSettings = settingsView.classList.contains('active');
                setActiveView(currentViewIsSettings ? 'settings' : 'empty');
            });
        });
    }

    /**
     * 時刻を HH:MM:SS 形式の文字列にフォーマットする
     * @param {Date} date - フォーマットするDateオブジェクト
     * @returns {string} フォーマットされた時刻文字列
     */
    function formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * 新しい警告要素を生成する関数
     * @param {string} dangerLevel - 危険度
     * @param {string[]} issues - 問題点のリスト
     * @param {string} specificText - 具体的な該当箇所
     * @param {Date} timestamp - 警告生成時刻
     * @returns {HTMLElement} 生成された警告のdiv要素
     */
    function createWarningElement(dangerLevel: string, issues: string[], specificText: string, timestamp: Date): HTMLElement {
        const warningDiv = document.createElement('div');
        warningDiv.classList.add('post-warning');

        let issuesHtml = issues.map(issue => `<p>・${issue}</p>`).join('');

        warningDiv.innerHTML = `
            <p class="warning-title-line">
                <span class="warning-title">【警告】</span>
                <span class="warning-timestamp">${formatTime(timestamp)}</span>
            </p>
            <p class="center-text"><span class="warning-emphasis">⚠️この投稿は炎上する可能性があります⚠️</span></p>
            <p><span class="warning-danger-level">危険度：</span><span class="warning-danger-value">"${dangerLevel}"</span></p>
            <p>この投稿は以下の内容を含む可能性があります。</p>
            ${issuesHtml}
            <p>該当箇所</p>
            <p>${specificText}</p>
            <p>今一度投稿内容はチェックしてください。</p>
        `;
        return warningDiv;
    }

    /**
     * 設定を読み込む関数
     */
    function loadSettings(): void {
        const message: GetSettingsMessage = {type: 'GET_SETTINGS'};
        chrome.runtime.sendMessage(message, (response: SettingsResponse) => {
            // 常に初期ビューを 'empty' (警告画面) に設定する
            const initialView: 'settings' | 'empty' = 'empty';

            if (response && response.settings) {
                // enabled の状態などは保存された設定を反映する
                if (enabledCheckbox) enabledCheckbox.checked = response.settings.enabled;
                // activeView に関しては、保存された値を無視して常に 'empty' で初期化する
            }
            setActiveView(initialView);
        });
    }

    /**
     * 設定を保存する関数
     */
    function saveSettings(): void {
        if (!enabledCheckbox) return;
        const activeView = settingsView.classList.contains('active') ? 'settings' : 'empty';
        const settings: Settings = { enabled: enabledCheckbox.checked, activeView: activeView };
        const message: UpdateSettingsMessage = { type: 'UPDATE_SETTINGS', settings: settings };
        chrome.runtime.sendMessage(message, (response: UpdateResponse) => {
            showStatus(response && response.success ? '設定が保存されました' : '設定の保存に失敗しました', response && response.success ? 'success' : 'error');
        });
    }

    /**
     * ビューを切り替える関数
     */
    function toggleView(): void {
        // 現在アクティブなビューに基づいて切り替え先を決定
        const targetView = settingsView.classList.contains('active') ? 'empty' : 'settings';
        setActiveView(targetView);
        saveSettings(); // ビュー切り替え後にも設定を保存
    }

    /**
     * アクティブなビューを設定し、警告の表示/非表示を制御する関数
     * @param {string} viewName - アクティブにするビュー名 ('settings' または 'empty')
     */
    function setActiveView(viewName: 'settings' | 'empty'): void {
        if (!warningsContainer || !settingsView || !emptyView) return;

        // const allWarningElements = warningsContainer.querySelectorAll('.post-warning') as NodeListOf<HTMLElement>; // emptyTextContainer 関連で不要になった場合は削除検討

        if (viewName === 'settings') {
            settingsView.classList.add('active');
            emptyView.classList.remove('active');
            warningsContainer.style.display = 'none';
            if (toggleViewButton) toggleViewButton.textContent = '警告一覧へ'; // ボタンテキスト変更
        } else { // viewName === 'empty'
            settingsView.classList.remove('active');
            emptyView.classList.add('active');
            warningsContainer.style.display = '';
            if (toggleViewButton) toggleViewButton.textContent = '設定画面へ'; // ボタンテキスト変更
        }
        // emptyTextContainer とそれに関連する anyWarningVisible のロジックは削除済みであること
    }

    /**
     * ステータスメッセージを表示する関数
     * @param {string} message - 表示するメッセージ
     * @param {string} type - メッセージの種類 ('success' または 'error')
     */
    function showStatus(message: string, type: 'success' | 'error'): void {
        if (!statusElement) return;
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }, 3000);
    }
});

