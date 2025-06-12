import '../styles/sidebar.css';

/// <reference types="chrome" />

interface TweetData {
    type: string;
    user: string | null;
    text: string | null;
    datetime: string | null;
    url: string | null;
    images: string[];
    video: string | null;
}

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

interface SettingsResponse {
    settings: Settings;
}

interface UpdateResponse {
    success: boolean;
}

function formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
}

function createWarningElement(dangerLevel: string, issues: string[], specificText: string, timestamp: Date): HTMLElement {
    const warningDiv = document.createElement('div');
    warningDiv.classList.add('post-warning');

    // 危険度に応じてCSSクラスを追加
    switch (dangerLevel) {
        case '高':
            warningDiv.classList.add('danger-high');
            break;
        case '中':
            warningDiv.classList.add('danger-medium');
            break;
        case '低':
            warningDiv.classList.add('danger-low');
            break;
        default:
            warningDiv.classList.add('danger-unknown');
    }

    // 危険度に応じて警告メッセージを変更
    let warningMessage = '';
    switch (dangerLevel) {
        case '高':
            warningMessage = '⚠️この投稿は高い確率で炎上する可能性があります⚠️';
            break;
        case '中':
            warningMessage = '⚠️この投稿は炎上する可能性があります⚠️';
            break;
        case '低':
            warningMessage = '⚠️この投稿は少し注意が必要です⚠️';
            break;
        default:
            warningMessage = '⚠️この投稿は少し注意が必要です⚠️';
    }

    const issuesHtml = issues.map(i => `<p>・${i}</p>`).join('');
    warningDiv.innerHTML = `
        <p class="warning-title-line">
            <span class="warning-title">（警告）</span>
            <span class="warning-timestamp">${formatTime(timestamp)}</span>
        </p>
        <p class="center-text"><span class="warning-emphasis">${warningMessage}</span></p>
        <p><span class="warning-danger-level">危険度：</span><span class="warning-danger-value">${dangerLevel}</span></p>
        <p>この投稿は以下の内容を含む可能性があります。</p>
        ${issuesHtml}
        <p>該当範囲</p>
        <p class="specific-text">${specificText}</p>
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

// グローバルフラグでリスナーの重複を防ぐ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 従来の警告追加メッセージ
    if (message.type === "ADD_WARNING") {
        const tweetData = message.data;

        /*const warning = createWarningElement(
            "高",
            ["不適切な内容"],
            tweetData?.text ?? "",
            new Date()
        );*/

        const container = document.getElementById('warningsContainer');
        const settingsView = document.getElementById('settingsView');

        if (container) {
            container.prepend(warning);
            requestAnimationFrame(() => {
                warning.classList.add('show');
                const isSettings = settingsView?.classList.contains('active');
                setActiveView(isSettings ? 'settings' : 'empty');
                sendResponse({success: true});
            });
        } else {
            console.warn('warningsContainer が見つかりませんでした');
            sendResponse({success: false});
        }

        return true;
    }

    // バックエンドからの分析結果を処理は別のリスナーで行うため削除

    // エラー処理
    if (message.type === "ANALYSIS_ERROR") {
        const tweetData = message.data;
        const errorMsg = message.error;

        console.error("分析エラーを受信:", errorMsg);

        // エラー警告を作成
        const warning = createWarningElement(
            "不明",
            [`エラー: ${errorMsg}`, "バックエンドサーバーに接続できないか、処理中にエラーが発生しました"],
            tweetData?.text ?? "テキストなし",
            new Date()
        );

        const container = document.getElementById('warningsContainer');
        const settingsView = document.getElementById('settingsView');

        if (container) {
            container.prepend(warning);
            requestAnimationFrame(() => {
                warning.classList.add('show');
                const isSettings = settingsView?.classList.contains('active');
                setActiveView(isSettings ? 'settings' : 'empty');
                sendResponse({ success: true });
            });
        } else {
            console.warn('warningsContainer が見つかりませんでした');
            sendResponse({ success: false });
        }

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
        addWarningButton.addEventListener('click', async () => {
            await openSidePanel();
            chrome.runtime.sendMessage({ type: 'ADD_WARNING' }, (res) => {
                if (!res?.success) {
                    console.warn('警告の追加に失敗:', res?.error);
                }
            });
        });
    }

    loadSettings();
});

// サイドパネルを開く関数
const openSidePanel = async () => {
    try {
        await chrome.sidePanel.open({windowId: chrome.windows.WINDOW_ID_CURRENT});
    } catch (error) {
        console.error('サイドパネルを開けませんでした:', error);
    }
};

// 分析結果を処理する関数
const handleAnalysisResult = (result: any) => {
    const dangerLevel = result.analysis_result?.risk_level || "低";
    const issues: string[] = [];
    let specificText = "";

    if (result.status === "success" && result.analysis_result) {
        if (result.analysis_result.violations?.length > 0) {
            issues.push(...result.analysis_result.violations.map((v: any) => {
                let issueText = `${v.type}: ${v.description}`;
                if (v.severity) {
                    issueText += ` (重要度: ${v.severity})`;
                }
                if (v.context_analysis) {
                    issueText += `\n文脈分析: ${v.context_analysis}`;
                }
                return issueText;
            }));

            if (result.analysis_result.violations[0].detected_text) {
                specificText = result.analysis_result.violations[0].detected_text;
            }
        }

        if (result.analysis_result.recommendations?.length > 0) {
            issues.push(...result.analysis_result.recommendations.map((r: string) => `推奨: ${r}`));
        }

        if (result.analysis_result.summary) {
            issues.unshift(`要約: ${result.analysis_result.summary}`);
        }
    }

    if (issues.length === 0) {
        issues.push("問題は検出されませんでした");
    }

    const warning = createWarningElement(
        dangerLevel,
        issues,
        specificText,
        new Date()
    );

    if (warningsContainer) {
        warningsContainer.prepend(warning);
        requestAnimationFrame(() => {
            warning.classList.add('show');
            setActiveView('empty');
        });
    }
};

// メッセージリスナーを更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYSIS_RESULT") {
        handleAnalysisResult(message.result);
        sendResponse({success: true});
        return true;
    }
});
