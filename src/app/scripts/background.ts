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
        const tweetData = message.data;

        // Flaskバックエンドにデータを送信
        (async () => {
            try {
                console.log("Flaskバックエンドにデータを送信:", tweetData);

                // APIエンドポイントを選択（テキストのみ、画像付き、動画付きで分岐）
                let endpoint = '/api/analyze/text';
                let response;

                if (tweetData.video) {
                    endpoint = '/api/analyze/video';

                    // FormDataオブジェクトを作成
                    const formData = new FormData();

                    // 動画のblobURLからファイルを取得
                    try {
                        const videoResponse = await fetch(tweetData.video);
                        const videoBlob = await videoResponse.blob();

                        // ファイル拡張子を判定（Content-Typeから）
                        let extension = 'mp4';
                        const contentType = videoResponse.headers.get('Content-Type') || 'video/mp4';

                        if (contentType.includes('webm')) {
                            extension = 'webm';
                        } else if (contentType.includes('ogg')) {
                            extension = 'ogg';
                        }

                        // Fileオブジェクトを作成
                        const videoFile = new File([videoBlob], `video.${extension}`, {type: contentType});

                        // FormDataに追加
                        formData.append('video', videoFile);

                        console.log(`動画をFile形式に変換しました: ${videoFile.name} (${videoFile.size} bytes)`);
                    } catch (error) {
                        console.error("動画の取得に失敗しました:", error);
                        // 失敗した場合はJSONで送信
                        response = await fetch(`http://localhost:5000${endpoint}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                text: tweetData.text,
                                video_url: tweetData.video
                            })
                        });
                        // 以降の処理をスキップ
                        return;
                    }

                    // 発言者の背景情報があれば追加
                    if (tweetData.user) {
                        const speakerBackground = {
                            name: tweetData.user,
                            past_incidents: [],
                            character_type: "一般ユーザー",
                            usual_style: "通常の発言スタイル"
                        };
                        formData.append('speaker_background', JSON.stringify(speakerBackground));
                    }

                    // multipart/form-dataでリクエスト送信
                    response = await fetch(`http://localhost:5000${endpoint}`, {
                        method: 'POST',
                        body: formData
                    });
                } else if (tweetData.images && tweetData.images.length > 0) {
                    endpoint = '/api/analyze/image-text';

                    // FormDataオブジェクトを作成
                    const formData = new FormData();

                    // テキストを追加
                    if (tweetData.text) {
                        formData.append('text', tweetData.text);
                    }

                    // 最初の画像のみを処理（複数画像の場合は最初の1枚のみ）
                    if (tweetData.images.length > 0) {
                        const base64Image = tweetData.images[0];

                        // Base64文字列からファイルオブジェクトを作成
                        try {
                            // Base64のヘッダー部分を削除してバイナリデータを取得
                            const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

                            if (matches && matches.length === 3) {
                                const contentType = matches[1];
                                const base64Data = matches[2];
                                const byteCharacters = atob(base64Data);
                                const byteArrays = [];

                                for (let i = 0; i < byteCharacters.length; i += 512) {
                                    const slice = byteCharacters.slice(i, i + 512);
                                    const byteNumbers = new Array(slice.length);

                                    for (let j = 0; j < slice.length; j++) {
                                        byteNumbers[j] = slice.charCodeAt(j);
                                    }

                                    const byteArray = new Uint8Array(byteNumbers);
                                    byteArrays.push(byteArray);
                                }

                                // ファイル拡張子を判定
                                let extension = 'png';
                                if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                                    extension = 'jpg';
                                } else if (contentType.includes('gif')) {
                                    extension = 'gif';
                                } else if (contentType.includes('webp')) {
                                    extension = 'webp';
                                }

                                const blob = new Blob(byteArrays, {type: contentType});
                                const file = new File([blob], `image.${extension}`, {type: contentType});

                                // FormDataにファイルを追加
                                formData.append('image', file);

                                console.log(`画像をFile形式に変換しました: ${file.name} (${file.size} bytes)`);
                            } else {
                                console.error("Base64形式が不正です:", base64Image.substring(0, 50) + "...");
                            }
                        } catch (error) {
                            console.error("Base64からFileへの変換に失敗しました:", error);
                        }
                    }

                    // 発言者の背景情報があれば追加
                    if (tweetData.user) {
                        const speakerBackground = {
                            name: tweetData.user,
                            past_incidents: [],
                            character_type: "一般ユーザー",
                            usual_style: "通常の発言スタイル"
                        };
                        formData.append('speaker_background', JSON.stringify(speakerBackground));
                    }

                    // multipart/form-dataでリクエスト送信
                    response = await fetch(`http://localhost:5000${endpoint}`, {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    // テキストのみの場合はJSON形式で送信
                    response = await fetch(`http://localhost:5000${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text: tweetData.text,
                            speaker_background: tweetData.user ? {
                                name: tweetData.user,
                                past_incidents: [],
                                character_type: "一般ユーザー",
                                usual_style: "通常の発言スタイル"
                            } : undefined
                        })
                    });
                }

                // レスポンスを取得
                const responseData = await response.json();
                console.log("バックエンドからのレスポンス:", responseData);

                // サイドパネルにメッセージを送信
                chrome.runtime.sendMessage({
                    type: "ANALYSIS_RESULT",
                    data: tweetData,
                    result: responseData
                });

                sendResponse({ success: true });
            } catch (err) {
                console.error("バックエンドリクエストに失敗:", err);

                // エラーメッセージをサイドパネルに送信
                chrome.runtime.sendMessage({
                    type: "ANALYSIS_ERROR",
                    data: tweetData,
                    error: err.message || "バックエンドリクエストに失敗しました"
                });

                sendResponse({
                    success: false,
                    error: "バックエンドリクエストに失敗しました"
                });
            }
        })();

        return true;
    }

});
