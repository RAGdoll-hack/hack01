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

interface GetOEmbedMessage {
    type: 'GET_OEMBED';
    url: string;
}

type Message = GetSettingsMessage | UpdateSettingsMessage | GetOEmbedMessage;

// レスポンスの型定義
interface SettingsResponse {
    settings: Settings;
}

interface UpdateResponse {
    success: boolean;
}

interface OEmbedResponse {
    videoUrl: string | null;
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
            activeView: 'settings', // デフォルトでは設定画面を表示
            // 禁止事項の設定（デフォルトではすべてオン）
            disallowDiscrimination: true,
            disallowDefamation: true,
            disallowMisinformation: true,
            disallowInappropriate: true,
            disallowExtremism: true,
            disallowCopyright: true,
            disallowCondescending: true,
            disallowUnethical: true,
            disallowExcessiveComplaints: true,
            disallowStealthMarketing: true
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
                activeView: 'settings',
                // 禁止事項の設定（デフォルトではすべてオン）
                disallowDiscrimination: true,
                disallowDefamation: true,
                disallowMisinformation: true,
                disallowInappropriate: true,
                disallowExtremism: true,
                disallowCopyright: true,
                disallowCondescending: true,
                disallowUnethical: true,
                disallowExcessiveComplaints: true,
                disallowStealthMarketing: true
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

    if (message.type === 'GET_OEMBED') {
        // oEmbedデータを取得して動画URLを抽出
        (async () => {
            let response: OEmbedResponse = {videoUrl: null};
            try {
                const res = await fetch(
                    `https://publish.twitter.com/oembed?url=${encodeURIComponent(
                        message.url
                    )}`
                );
                const json = await res.json();
                const match = json.html.match(
                    /https:\/\/pic\.twitter\.com\/([a-zA-Z0-9]+)/
                );
                if (match) {
                    response.videoUrl = `https://pic.twitter.com/${match[1]}`;
                } else if (message.url) {
                    // Twitter/XのURLかチェック
                    const twitterMatch = message.url.match(/https?:\/\/(twitter|x)\.com\/([^\/]+)\/status\/(\d+)/);
                    if (twitterMatch) {
                        const username = twitterMatch[2];
                        const statusId = twitterMatch[3];
                        response.videoUrl = `https://fxtwitter.com/${username}/status/${statusId}.mp4`;
                    }
                }
            } catch (err) {
                console.error("oEmbed取得に失敗しました:", err);
            } finally {
                sendResponse(response);
            }
        })();
        return true; // 非同期レスポンスを示すためにtrueを返す
    }

    if (message.type === "ADD_WARNING") {
        chrome.sidePanel.open({ windowId: sender?.tab?.windowId })
            .then(() => {
                // 少し待ってから sidebar にメッセージを送信
                setTimeout(() => {
                    chrome.runtime.sendMessage({ type: 'ADD_WARNING' }, (res) => {
                        sendResponse(res);
                    });
                }, 200); // 200ms 程度の遅延で十分なことが多い
            })
            .catch((err) => {
                console.error("サイドパネルのオープンに失敗:", err);
                sendResponse({ success: false, error: "サイドパネルのオープンに失敗しました" });
            });
        return true;
    }

});
