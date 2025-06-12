// スタイルシートのインポート
import '../styles/sidebar.css';

/// <reference types="chrome" />

interface Settings {
    enabled: boolean;
    activeView?: 'settings' | 'empty';
    disallowDiscrimination?: boolean;
    disallowDefamation?: boolean;
    disallowMisinformation?: boolean;
    disallowInappropriate?: boolean;
    disallowExtremism?: boolean;
    disallowCopyright?: boolean;
    disallowCondescending?: boolean;
    disallowUnethical?: boolean;
    disallowExcessiveComplaints?: boolean;
    disallowStealthMarketing?: boolean;
}

interface GetSettingsMessage { type: 'GET_SETTINGS'; }
interface UpdateSettingsMessage { type: 'UPDATE_SETTINGS'; settings: Settings; }
type Message = GetSettingsMessage | UpdateSettingsMessage;

interface SettingsResponse { settings: Settings; }
interface UpdateResponse { success: boolean; }

function formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
}

function createWarningElement(dangerLevel: string, issues: string[], specificText: string, timestamp: Date): HTMLElement {
    const warningDiv = document.createElement('div');
    warningDiv.classList.add('post-warning');

    const issuesHtml = issues.map(i => `<p>・${i}</p>`).join('');
    warningDiv.innerHTML = `
        <p class="warning-title-line">
            <span class="warning-title">（警告）</span>
            <span class="warning-timestamp">${formatTime(timestamp)}</span>
        </p>
        <p class="center-text"><span class="warning-emphasis">⚠️この投稿は炎上する可能性があります⚠️</span></p>
        <p><span class="warning-danger-level">危険度：</span><span class="warning-danger-value">"${dangerLevel}"</span></p>
        <p>この投稿は以下の内容を含む可能性があります。</p>
        ${issuesHtml}
        <p>該当範囲</p>
        <p>${specificText}</p>
        <p>今一度投稿内容はチェックしてください。</p>
    `;
    return warningDiv;
}

function setActiveView(viewName: 'settings' | 'empty'): void {
    const settingsView = document.getElementById('settingsView');
    const emptyView = document.getElementById('emptyView');
    const toggleViewButton = document.getElementById('toggleViewBtn');
    const warningsContainer = document.getElementById('warningsContainer');

    if (!settingsView || !emptyView || !toggleViewButton || !warningsContainer) return;

    if (viewName === 'settings') {
        settingsView.classList.add('active');
        emptyView.classList.remove('active');
        warningsContainer.style.display = 'none';
        toggleViewButton.textContent = '警告一覧へ';
    } else {
        settingsView.classList.remove('active');
        emptyView.classList.add('active');
        warningsContainer.style.display = '';
        toggleViewButton.textContent = '設定画面へ';
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ADD_WARNING") {
        const warningsContainer = document.getElementById('warningsContainer');
        const settingsView = document.getElementById('settingsView');
        const emptyView = document.getElementById('emptyView');
        const toggleViewButton = document.getElementById('toggleViewBtn');

        if (!warningsContainer || !settingsView || !emptyView || !toggleViewButton) {
            sendResponse({ success: false, error: "必要な要素が見つかりません" });
            return true;
        }

        const warning = createWarningElement(
            "高",
            ["不適切なコンテンツ", "攻撃的な表現"],
            "「これはテスト用の攻撃的な発言です。」",
            new Date()
        );
        warningsContainer.prepend(warning);

        requestAnimationFrame(() => {
            warning.classList.add('show');
            const isSettings = settingsView.classList.contains('active');
            setActiveView(isSettings ? 'settings' : 'empty');
            sendResponse({ success: true });
        });

        return true;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const enabledCheckbox = document.getElementById('enabled') as HTMLInputElement;
    const saveButton = document.getElementById('saveBtn') as HTMLButtonElement;
    const toggleViewButton = document.getElementById('toggleViewBtn') as HTMLButtonElement;
    const addWarningButton = document.getElementById('addWarningBtn') as HTMLButtonElement;
    const settingsView = document.getElementById('settingsView') as HTMLElement;
    const warningsContainer = document.getElementById('warningsContainer') as HTMLElement;

    const disallowMap = [
        'DisallowDiscrimination', 'DisallowDefamation', 'DisallowMisinformation',
        'DisallowInappropriate', 'DisallowExtremism', 'DisallowCopyright',
        'DisallowCondescending', 'DisallowUnethical', 'DisallowExcessiveComplaints', 'DisallowStealthMarketing'
    ] as const;

    const disallowCheckboxes: Record<string, HTMLInputElement> = {};
    for (const key of disallowMap) {
        disallowCheckboxes[key] = document.getElementById(`disallow${key}`) as HTMLInputElement;
    }

    const loadSettings = () => {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response: SettingsResponse) => {
            if (!response || !response.settings) return;

            enabledCheckbox.checked = response.settings.enabled ?? true;
            for (const key of disallowMap) {
                disallowCheckboxes[key].checked = response.settings[`disallow${key}`] ?? false;
            }
            setActiveView(response.settings.activeView ?? 'empty');
        });
    };

    const saveSettings = () => {
        const settings: Settings = {
            enabled: enabledCheckbox.checked,
            activeView: settingsView.classList.contains('active') ? 'settings' : 'empty'
        };
        for (const key of disallowMap) {
            settings[`disallow${key}`] = disallowCheckboxes[key].checked;
        }

        chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings }, (res: UpdateResponse) => {
            const status = document.getElementById('status');
            if (status) {
                status.textContent = res.success ? '設定が保存されました' : '設定の保存に失敗しました';
                status.className = `status ${res.success ? 'success' : 'error'}`;
                setTimeout(() => {
                    status.textContent = '';
                    status.className = 'status';
                }, 3000);
            }
        });
    };

    if (saveButton) saveButton.addEventListener('click', saveSettings);
    if (toggleViewButton) toggleViewButton.addEventListener('click', () => {
        const next = settingsView.classList.contains('active') ? 'empty' : 'settings';
        setActiveView(next);
        saveSettings();
    });

    if (addWarningButton && warningsContainer) {
        addWarningButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({ type: 'ADD_WARNING' }, (res) => {
                if (!res?.success) {
                    console.warn('警告の追加に失敗:', res?.error);
                }
            });
        });
    }

    loadSettings();
});
