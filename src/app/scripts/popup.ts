/**
 * ポップアップスクリプト
 *
 * Chrome拡張機能のポップアップUIを制御するスクリプトです。
 * ユーザーの設定を管理し、バックグラウンドスクリプトと通信します。
 * 初期表示は空画面で、設定ボタンをクリックすると設定画面に切り替わります。
 */

// スタイルシートのインポート
import '../styles/popup.css';

// Chrome APIの型定義をインポート
/// <reference types="chrome" />

// 設定の型定義
interface Settings {
    enabled: boolean;
    // 禁止事項の設定
    disallowDiscrimination: boolean; // 差別・偏見につながる発言
    disallowDefamation: boolean; // 誹謗中傷・人格攻撃
    disallowMisinformation: boolean; // デマや誤情報の拡散
    disallowInappropriate: boolean; // 不謹慎な投稿
    disallowExtremism: boolean; // 過激な思想の表明（政治・宗教など）
    disallowCopyright: boolean; // 著作権・肖像権の侵害
    disallowCondescending: boolean; // 上から目線・マウンティング
    disallowUnethical: boolean; // 倫理観や常識を疑われる言動
    disallowExcessiveComplaints: boolean; // 企業や店舗への過度なクレーム
    disallowStealthMarketing: boolean; // ステルスマーケティング（ステマ）
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
    // 画面要素の取得
    const blankScreen = document.getElementById('blankScreen') as HTMLElement;
    const settingsScreen = document.getElementById('settingsScreen') as HTMLElement;
    const settingsButton = document.getElementById('settingsBtn') as HTMLButtonElement;
    const backButton = document.getElementById('backBtn') as HTMLButtonElement;
    const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
    const saveButton = document.getElementById('saveBtn') as HTMLButtonElement;
    const statusElement = document.getElementById('status') as HTMLElement;

    // 禁止事項設定のチェックボックス要素
    const disallowDiscriminationCheckbox = document.getElementById('disallowDiscrimination') as HTMLInputElement;
    const disallowDefamationCheckbox = document.getElementById('disallowDefamation') as HTMLInputElement;
    const disallowMisinformationCheckbox = document.getElementById('disallowMisinformation') as HTMLInputElement;
    const disallowInappropriateCheckbox = document.getElementById('disallowInappropriate') as HTMLInputElement;
    const disallowExtremismCheckbox = document.getElementById('disallowExtremism') as HTMLInputElement;
    const disallowCopyrightCheckbox = document.getElementById('disallowCopyright') as HTMLInputElement;
    const disallowCondescendingCheckbox = document.getElementById('disallowCondescending') as HTMLInputElement;
    const disallowUnethicalCheckbox = document.getElementById('disallowUnethical') as HTMLInputElement;
    const disallowExcessiveComplaintsCheckbox = document.getElementById('disallowExcessiveComplaints') as HTMLInputElement;
    const disallowStealthMarketingCheckbox = document.getElementById('disallowStealthMarketing') as HTMLInputElement;

    // 初期設定を読み込む
    loadSettings();

    // 設定ボタンのクリックイベント - 設定画面を表示
    settingsButton.addEventListener('click', showSettingsScreen);

    // 戻るボタンのクリックイベント - 空画面に戻る
    backButton.addEventListener('click', showBlankScreen);

    // 保存ボタンのクリックイベント
    saveButton.addEventListener('click', saveSettings);

    /**
     * 空画面を表示する関数
     */
    function showBlankScreen(): void {
        blankScreen.style.display = 'flex';
        settingsScreen.style.display = 'none';
    }

    /**
     * 設定画面を表示する関数
     */
    function showSettingsScreen(): void {
        blankScreen.style.display = 'none';
        settingsScreen.style.display = 'block';
    }

    /**
     * 設定を読み込む関数
     */
    function loadSettings(): void {
        const message: GetSettingsMessage = {type: 'GET_SETTINGS'};
        chrome.runtime.sendMessage(message, (response: SettingsResponse) => {
            if (response && response.settings) {
                // 基本設定
                enabledCheckbox.checked = response.settings.enabled;

                // 禁止事項設定
                disallowDiscriminationCheckbox.checked = response.settings.disallowDiscrimination || false;
                disallowDefamationCheckbox.checked = response.settings.disallowDefamation || false;
                disallowMisinformationCheckbox.checked = response.settings.disallowMisinformation || false;
                disallowInappropriateCheckbox.checked = response.settings.disallowInappropriate || false;
                disallowExtremismCheckbox.checked = response.settings.disallowExtremism || false;
                disallowCopyrightCheckbox.checked = response.settings.disallowCopyright || false;
                disallowCondescendingCheckbox.checked = response.settings.disallowCondescending || false;
                disallowUnethicalCheckbox.checked = response.settings.disallowUnethical || false;
                disallowExcessiveComplaintsCheckbox.checked = response.settings.disallowExcessiveComplaints || false;
                disallowStealthMarketingCheckbox.checked = response.settings.disallowStealthMarketing || false;
            }
        });
    }

    /**
     * 設定を保存する関数
     */
    function saveSettings(): void {
        const settings: Settings = {
            // 基本設定
            enabled: enabledCheckbox.checked,

            // 禁止事項設定
            disallowDiscrimination: disallowDiscriminationCheckbox.checked,
            disallowDefamation: disallowDefamationCheckbox.checked,
            disallowMisinformation: disallowMisinformationCheckbox.checked,
            disallowInappropriate: disallowInappropriateCheckbox.checked,
            disallowExtremism: disallowExtremismCheckbox.checked,
            disallowCopyright: disallowCopyrightCheckbox.checked,
            disallowCondescending: disallowCondescendingCheckbox.checked,
            disallowUnethical: disallowUnethicalCheckbox.checked,
            disallowExcessiveComplaints: disallowExcessiveComplaintsCheckbox.checked,
            disallowStealthMarketing: disallowStealthMarketingCheckbox.checked
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
