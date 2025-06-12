/**
 * コンテンツスクリプト
 *
 * Twitterページで実行され、ツイートデータを抽出するスクリプトです。
 * ページ内のツイート情報を取得し、拡張機能の他の部分に提供します。
 * また、ツールバーにチェックボタンを追加します。
 */

// Chrome APIの型定義をインポート
/// <reference types="chrome" />

/**
 * YouTube動画データの型定義
 */
interface TweetData {
    title: string | null; // 動画タイトル
    text: string | null; // 説明
    url: string | null; // 動画のURL
}

// ツイートデータを受け取るリスナー
chrome.runtime.onMessage.addListener((msg: { type: string }, sender, sendResponse) => {
    if (msg.type === "GET_TWEETS") {
        (async () => {
            try {
                const tweets = Array.from(
                    document.querySelectorAll('article[data-testid="tweet"]')
                );

                if (tweets.length === 0) {
                    console.log("No tweets found on the page");
                    sendResponse({tweets: {tweet: [], retweet: [], quote_tweet: []}});
                    return;
                }

                const extracted = await Promise.all(
                    tweets.map(async (article) => {
                        try {
                            // 種類（通常・リツイート・引用）
                            const svgPaths = article.querySelectorAll("svg path");
                            const isRetweet = Array.from(svgPaths).some((path) =>
                                path.getAttribute("d")?.startsWith("M4.75 3.79l4.603 4.3")
                            );
                            const isQuoteTweet =
                                article.querySelector('div[role="link"]') !== null;

                            let type: TweetType = "tweet";
                            if (isRetweet) {
                                type = "retweet";
                            } else if (isQuoteTweet) {
                                type = "quote_tweet";
                            }

                            const timeTag = article.querySelector("time");
                            const textTag = article.querySelector(
                                '[data-testid="tweetText"]'
                            );
                            const datetime = timeTag?.getAttribute("datetime") || null;
                            const tweetUrl = timeTag?.closest("a")?.getAttribute("href") || null;
                            const displayName =
                                article.querySelector('[data-testid="User-Name"] span')
                                    ?.textContent || null;

                            const imgTags = article.querySelectorAll("img");
                            const imageUrls = Array.from(imgTags)
                                .map((img) => img.getAttribute("src"))
                                .filter((src): src is string => src?.includes("pbs.twimg.com/media") || false);

                            let videoUrl: string | null = null;
                            if (tweetUrl) {
                                const hasVideo =
                                    article.querySelector('[data-testid="videoComponent"]') !==
                                    null;

                                if (hasVideo) {
                                    try {
                                        videoUrl = await getVideoUrlFromOEmbed(tweetUrl);
                                    } catch (e) {
                                        console.error("background fetch error", e);
                                    }
                                }
                            }

                            return {
                                type,
                                user: displayName || null,
                                text: textTag?.textContent || null,
                                datetime,
                                url: tweetUrl,
                                images: imageUrls,
                                video: videoUrl,
                            };
                        } catch (err) {
                            console.error("Error processing tweet:", err);
                            return null;
                        }
                    })
                );

                const validTweets = extracted
                    .filter((item): item is TweetData => item !== null)
                    .filter((item) => item.datetime && item.text);

                // 分類してレスポンス
                const grouped: GroupedTweets = {
                    tweet: [],
                    retweet: [],
                    quote_tweet: [],
                };

                for (const tweet of validTweets) {
                    if (tweet && grouped[tweet.type]) {
                        grouped[tweet.type].push(tweet);
                    }
                }

                sendResponse({tweets: grouped});
            } catch (err) {
                console.error("Error in content script:", err);
                sendResponse({tweets: {tweet: [], retweet: [], quote_tweet: []}});
            }
        })();

        return true; // 非同期レスポンスを示すためにtrueを返す
    }
});

// 以下、チェックボタン追加のための実装

// 即時実行関数でスクリプトを実行
(function () {

    // DOMContentLoadedイベントが既に発生しているか確認
    if (document.readyState === 'loading') {
        // ページが完全に読み込まれた後に実行
        document.addEventListener('DOMContentLoaded', initializeObserver);
    } else {
        // すでにDOMが読み込まれている場合は直接実行
        initializeObserver();
    }

    // 5秒後に一度だけ強制的に実行を試みる
    setTimeout(() => {
        console.log('タイムアウト: 5秒経過したため強制的に実行を試みます');
        tryAddCheckButton();
    }, 5000);
})();

/**
 * MutationObserverを初期化する関数
 */
function initializeObserver(): void {

    // 初回実行
    tryAddCheckButton();

    // MutationObserverを使用してDOMの変更を監視
    const observer = new MutationObserver((mutations) => {
        tryAddCheckButton();
    });

    // ページ全体の変更を監視
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * ツールバーにチェックボタンを追加する処理
 * 必要な要素が見つからない場合は早期リターンで処理を終了
 * 各ステップで詳細なログを出力して問題の診断を容易にする
 */
function tryAddCheckButton(): void {
    try {
        addCheckButtonToYouTubeUploadChecks();
    } catch (error) {
        console.error('YouTubeチェックボタン追加中にエラーが発生しました:', error);
    }
}

/**
 * YouTubeの動画アップロード画面にチェックボタンを追加
 */
function addCheckButtonToYouTubeUploadChecks(): void {
    const maxRetries = 30;
    let attempts = 0;

    const interval = setInterval(() => {
        const checks = document.querySelector('ytcp-uploads-checks');
        if (!checks) return;

        const feedbackButton = findElementInShadowRecursively(checks, 'ytcp-send-feedback-button');
        if (!feedbackButton || !feedbackButton.parentElement) {
            attempts++;
            if (attempts >= maxRetries) {
                console.warn('❌ 最大リトライ回数に達しました。ボタンの挿入を中止します');
                clearInterval(interval);
            }
            return;
        }

        if (feedbackButton.parentElement.querySelector('.my-custom-check-button')) {
            console.log('⚠️ すでにボタンが存在します');
            clearInterval(interval);
            return;
        }

        const button = document.createElement('button');
        button.textContent = 'AIチェック';
        button.className = 'my-custom-check-button';
        button.style.cssText = `
            margin-left: 12px;
            background-color: #0f9d58;
            color: white;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
        `;

        button.onclick = () => alert('AIチェック実行！');

        feedbackButton.parentElement.insertBefore(button, feedbackButton.nextSibling);
        console.log('✅ 自動挿入に成功しました: AIチェックボタン');

        clearInterval(interval);
    }, 500);
}


function findElementInShadowRecursively(root: HTMLElement | ShadowRoot, selector: string): HTMLElement | null {
    if (!root) return null;

    const el = root.querySelector(selector);
    if (el) return el as HTMLElement;

    const children = root.querySelectorAll('*');
    for (const child of children) {
        const shadow = (child as HTMLElement).shadowRoot;
        if (shadow) {
            const found = findElementInShadowRecursively(shadow, selector);
            if (found) return found;
        }
    }
    return null;
}

/**
 * インラインツールバー（ホームタイムライン上部）にチェックボタンを追加
 */
function addCheckButtonToToolbar(): void {
    // ツールバーを探す
    const toolBar = document.querySelector('[data-testid="toolBar"]');
    if (!toolBar) {
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // すでにチェックボタンが追加されているか確認
    const existingCheckButton = document.querySelector('[data-testid="checkButtonInline"]');
    if (existingCheckButton) {
        console.log('インラインチェックボタンは既に追加されています');
        return;
    }

    // ポストボタンを探す
    const postButton = document.querySelector('[data-testid="tweetButtonInline"]') as HTMLElement;
    if (!postButton) {
        console.log('インラインポストボタンが見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // ポストボタンの親要素を取得
    const buttonContainer = postButton.parentElement;
    if (!buttonContainer) {
        console.log('インラインポストボタンの親要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // チェックボタンを作成
    const checkButton = createCheckButton(postButton);

    // ポストボタンの前に挿入
    buttonContainer.insertBefore(checkButton, postButton);
}

/**
 * 通常ツールバー（ポップアップ投稿画面）にチェックボタンを追加
 */
function addCheckButtonToRegularToolbar(): void {
    // ツールバーを探す
    const toolBar = document.querySelector('[data-testid="toolBar"]');
    if (!toolBar) {
        console.log('通常ツールバー要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // すでにチェックボタンが追加されているか確認
    const existingCheckButton = document.querySelector('[data-testid="checkButton"]');
    if (existingCheckButton) {
        console.log('通常チェックボタンは既に追加されています');
        return;
    }

    // ポストボタンを探す
    const postButton = document.querySelector('[data-testid="tweetButton"]') as HTMLElement;
    if (!postButton) {
        // ツールバー内の要素をログに出力
        // console.log('ツールバー内の要素:', toolBar.innerHTML);
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // ポストボタンの親要素を取得
    const buttonContainer = postButton.parentElement;
    if (!buttonContainer) {
        console.log('通常ポストボタンの親要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // チェックボタンを作成
    const checkButton = createCheckButton(postButton);
    // 通常ボタン用にdata-testid属性を変更
    checkButton.setAttribute('data-testid', 'checkButton');

    // ポストボタンの前に挿入
    buttonContainer.insertBefore(checkButton, postButton);
}

/**
 * サイドバーの新規ポストボタンのイベントを監視
 */
function monitorSidebarPostButton(): void {
    const sidebarPostButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') as HTMLElement;

    if (!sidebarPostButton) {
        console.log('サイドバーの新規ポストボタンが見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // すでにイベントリスナーが設定されているか確認するためのフラグ
    if (sidebarPostButton.hasAttribute('data-check-listener')) {
        console.log('サイドバーの新規ポストボタンには既にイベントリスナーが設定されています');
        return;
    }

    // クリックイベントを設定
    sidebarPostButton.addEventListener('click', () => {
        console.log('サイドバーの新規ポストボタンがクリックされました');

        // 少し遅延を入れてポップアップが表示された後にチェックボタンを追加
        setTimeout(() => {
            addCheckButtonToRegularToolbar();
        }, 500);
    });

    // イベントリスナーが設定されたことを示すフラグを設定
    sidebarPostButton.setAttribute('data-check-listener', 'true');
    console.log('サイドバーの新規ポストボタンにイベントリスナーを設定しました');
}

/**
 * 現在のDOMの状態をログに出力する
 */
function logCurrentDOMState(): void {
    // data-testid属性を持つ要素を検索
    const testIdElements = document.querySelectorAll('[data-testid]');

    // 最初の10個の要素をログに出力
    const elementsToLog = Array.from(testIdElements).slice(0, 10);
    elementsToLog.forEach(el => {
        console.log(`- data-testid="${el.getAttribute('data-testid')}"`);
    });

    // bodyの子要素数
    console.log(`body直下の子要素数: ${document.body.children.length}`);
}

/**
 * ポストボタンと同じスタイルのチェックボタンを作成する
 * @param {HTMLElement} postButton - 参照するポストボタン要素
 * @returns {HTMLElement} - 作成されたチェックボタン
 */
function createCheckButton(postButton: HTMLElement): HTMLElement {
    try {
        // ポストボタンをクローン
        const checkButton = postButton.cloneNode(true) as HTMLElement;

        // data-testid属性を変更
        checkButton.setAttribute('data-testid', 'checkButtonInline');

        // ボタンを有効化する
        checkButton.removeAttribute('disabled');
        checkButton.removeAttribute('aria-disabled');
        checkButton.setAttribute('aria-disabled', 'false');
        checkButton.setAttribute('tabindex', '0');

        // disabled関連のクラスを削除
        if (checkButton.classList.contains('r-icoktb')) {
            checkButton.classList.remove('r-icoktb');
        }

        // スタイルを有効状態に更新
        checkButton.style.opacity = '1';
        checkButton.style.cursor = 'pointer';
        checkButton.style.backgroundColor = '#1d9bf0'; // Twitterブルー
        checkButton.style.color = 'white';

        // テキスト内容を「チェック」に変更
        const textSpan = checkButton.querySelector('.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-1tl8opc') as HTMLElement;
        if (textSpan) {
            console.log('テキスト要素が見つかりました:', textSpan);
            textSpan.textContent = 'チェック';
            console.log('テキスト内容を"チェック"に変更しました');
        } else {
            console.warn('テキスト要素が見つかりませんでした。代替方法を試みます...');

            // 代替方法: すべてのspanを検索
            const allSpans = checkButton.querySelectorAll('span');

            // 最も深いレベルのspanを探す
            let deepestSpan: HTMLElement | null = null;
            let maxDepth = -1;

            allSpans.forEach((span: Element) => {
                // 要素の深さを計算
                let depth = 0;
                let parent = span.parentElement;
                while (parent && parent !== checkButton) {
                    depth++;
                    parent = parent.parentElement;
                }

                if (depth > maxDepth) {
                    maxDepth = depth;
                    deepestSpan = span as HTMLElement;
                }
            });

            if (deepestSpan) {
                // 明示的に型チェックを行い、HTMLElementであることを確認
                if (deepestSpan instanceof HTMLElement) {
                    deepestSpan.textContent = 'チェック';
                } else {
                    console.error('deepestSpanはHTMLElementではありません');
                }
            } else {
                console.error('テキストを変更するためのspan要素が見つかりませんでした');
            }
        }

        // クリックイベントを設定
        checkButton.addEventListener('click', async () => {
            const composingTweet = await getComposingTweetData();
            console.log("取得した投稿中データ:", composingTweet);

            // TODO: バックグラウンドにデータを送信しAIに解析
            chrome.runtime.sendMessage({ type: "ADD_WARNING", data: composingTweet });
        });

        return checkButton;
    } catch (error) {
        console.error('チェックボタン作成中にエラーが発生しました:', error);

        // エラーが発生した場合でもボタンを返すために、シンプルなボタンを作成
        const fallbackButton = document.createElement('button');
        fallbackButton.setAttribute('data-testid', 'checkButtonInline');
        fallbackButton.textContent = 'チェック';
        fallbackButton.setAttribute('aria-disabled', 'false');
        fallbackButton.setAttribute('tabindex', '0');
        fallbackButton.style.cssText = 'background-color: #1d9bf0; color: white; border: none; border-radius: 9999px; padding: 0 16px; height: 36px; font-weight: bold; margin-right: 12px; cursor: pointer; opacity: 1;';

        // クリックイベントを追加
        fallbackButton.addEventListener('click', () => {
            console.log('フォールバックチェックボタンがクリックされました');
            // ここに実際の処理を追加
        });

        console.log('フォールバックボタンを作成しました');
        return fallbackButton;
    }
}

// 投稿中のツイートデータを取得する関数
async function getComposingTweetData(): Promise<TweetData | null> {
    try {
        const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]') as HTMLElement;
        if (!tweetBox) {
            console.warn("ツイート入力欄が見つかりませんでした");
            return null;
        }

        const text = tweetBox.innerText.trim();

        // 添付画像（blob:）を取得し、Base64化
        const imageTags = document.querySelectorAll('img');
        const images: string[] = await Promise.all(
            Array.from(imageTags)
                .map(img => img.getAttribute("src"))
                .filter((src): src is string => !!src && src.startsWith("blob:"))
                .map(async (blobUrl) => {
                    try {
                        const res = await fetch(blobUrl);
                        const blob = await res.blob();
                        return await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string); // data:image/png;base64,...
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.error("blob画像の取得に失敗:", e);
                        return '';
                    }
                })
        );

        // 添付動画の取得
        let videoUrl: string | null = null;
        const videoTag = document.querySelector("video");
        if (videoTag?.src?.startsWith("blob:")) {
            videoUrl = videoTag.src;
        }

        const tweetData: TweetData = {
            type: "tweet",
            user: null,
            text: text || null,
            datetime: new Date().toISOString(),
            url: null,
            images: images.filter(b64 => !!b64),  // 空文字を除去
            video: videoUrl
        };

        return tweetData;
    } catch (e) {
        console.error("投稿中データの取得に失敗:", e);
        return null;
    }
}