/**
 * コンテンツスクリプト
 *
 * X.com（旧Twitter）のウェブページに挿入されるスクリプトです。
 * ツールバーにチェックボタンを追加します。
 */

console.log('X.com用コンテンツスクリプトが読み込まれました');

// 即時実行関数でスクリプトを実行
(function () {
    console.log('コンテンツスクリプトの初期化を開始します');

    // DOMContentLoadedイベントが既に発生しているか確認
    if (document.readyState === 'loading') {
        console.log('ドキュメントはまだ読み込み中です。DOMContentLoadedイベントを待機します');
        // ページが完全に読み込まれた後に実行
        document.addEventListener('DOMContentLoaded', initializeObserver);
    } else {
        console.log('ドキュメントは既に読み込まれています。すぐに初期化します');
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
    console.log('MutationObserverを初期化します');

    // 初回実行
    tryAddCheckButton();

    // MutationObserverを使用してDOMの変更を監視
    const observer = new MutationObserver((mutations) => {
        console.log(`DOM変更を検出: ${mutations.length}件の変更`);
        tryAddCheckButton();
    });

    // ページ全体の変更を監視
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('MutationObserverの監視を開始しました');
}

/**
 * ツールバーにチェックボタンを追加する処理
 * 必要な要素が見つからない場合は早期リターンで処理を終了
 * 各ステップで詳細なログを出力して問題の診断を容易にする
 */
function tryAddCheckButton(): void {
    try {
        console.log('チェックボタン追加処理を開始します');

        // インラインツールバーのチェックボタンを追加
        addCheckButtonToToolbar();

        // 通常ツールバーのチェックボタンを追加
        addCheckButtonToRegularToolbar();

        // サイドバーの新規ポストボタンのイベントを監視
        monitorSidebarPostButton();

    } catch (error) {
        console.error('チェックボタン追加中にエラーが発生しました:', error);
    }
}

/**
 * インラインツールバー（ホームタイムライン上部）にチェックボタンを追加
 */
function addCheckButtonToToolbar(): void {
    // ツールバーを探す
    console.log('インラインツールバー要素を検索中...');
    const toolBar = document.querySelector('[data-testid="toolBar"]');
    if (!toolBar) {
        console.log('インラインツールバー要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }
    console.log('インラインツールバー要素が見つかりました:', toolBar);

    // すでにチェックボタンが追加されているか確認
    console.log('既存のチェックボタンを確認中...');
    const existingCheckButton = document.querySelector('[data-testid="checkButtonInline"]');
    if (existingCheckButton) {
        console.log('インラインチェックボタンは既に追加されています');
        return;
    }
    console.log('既存のインラインチェックボタンは見つかりませんでした。新しく追加します');

    // ポストボタンを探す
    console.log('インラインポストボタンを検索中...');
    const postButton = document.querySelector('[data-testid="tweetButtonInline"]') as HTMLElement;
    if (!postButton) {
        console.log('インラインポストボタンが見つかりませんでした');
        // ツールバー内の要素をログに出力
        console.log('ツールバー内の要素:', toolBar.innerHTML);
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }
    console.log('インラインポストボタンが見つかりました:', postButton);

    // ポストボタンの親要素を取得
    console.log('インラインポストボタンの親要素を取得中...');
    const buttonContainer = postButton.parentElement;
    if (!buttonContainer) {
        console.log('インラインポストボタンの親要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }
    console.log('インラインポストボタンの親要素が見つかりました:', buttonContainer);

    // チェックボタンを作成
    console.log('インラインチェックボタンを作成中...');
    const checkButton = createCheckButton(postButton);
    console.log('インラインチェックボタンが作成されました:', checkButton);

    // ポストボタンの前に挿入
    console.log('インラインチェックボタンを挿入中...');
    buttonContainer.insertBefore(checkButton, postButton);
    console.log('インラインチェックボタンが正常に追加されました');
}

/**
 * 通常ツールバー（ポップアップ投稿画面）にチェックボタンを追加
 */
function addCheckButtonToRegularToolbar(): void {
    // ツールバーを探す
    console.log('通常ツールバー要素を検索中...');
    const toolBar = document.querySelector('[data-testid="toolBar"]');
    if (!toolBar) {
        console.log('通常ツールバー要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    // すでにチェックボタンが追加されているか確認
    console.log('既存の通常チェックボタンを確認中...');
    const existingCheckButton = document.querySelector('[data-testid="checkButton"]');
    if (existingCheckButton) {
        console.log('通常チェックボタンは既に追加されています');
        return;
    }
    console.log('既存の通常チェックボタンは見つかりませんでした。新しく追加します');

    // ポストボタンを探す
    console.log('通常ポストボタンを検索中...');
    const postButton = document.querySelector('[data-testid="tweetButton"]') as HTMLElement;
    if (!postButton) {
        console.log('通常ポストボタンが見つかりませんでした');
        // ツールバー内の要素をログに出力
        console.log('ツールバー内の要素:', toolBar.innerHTML);
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }
    console.log('通常ポストボタンが見つかりました:', postButton);

    // ポストボタンの親要素を取得
    console.log('通常ポストボタンの親要素を取得中...');
    const buttonContainer = postButton.parentElement;
    if (!buttonContainer) {
        console.log('通常ポストボタンの親要素が見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }
    console.log('通常ポストボタンの親要素が見つかりました:', buttonContainer);

    // チェックボタンを作成
    console.log('通常チェックボタンを作成中...');
    const checkButton = createCheckButton(postButton);
    // 通常ボタン用にdata-testid属性を変更
    checkButton.setAttribute('data-testid', 'checkButton');
    console.log('通常チェックボタンが作成されました:', checkButton);

    // ポストボタンの前に挿入
    console.log('通常チェックボタンを挿入中...');
    buttonContainer.insertBefore(checkButton, postButton);
    console.log('通常チェックボタンが正常に追加されました');
}

/**
 * サイドバーの新規ポストボタンのイベントを監視
 */
function monitorSidebarPostButton(): void {
    console.log('サイドバーの新規ポストボタンを検索中...');
    const sidebarPostButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]') as HTMLElement;

    if (!sidebarPostButton) {
        console.log('サイドバーの新規ポストボタンが見つかりませんでした');
        // 現在のDOMの状態をログに出力
        logCurrentDOMState();
        return;
    }

    console.log('サイドバーの新規ポストボタンが見つかりました:', sidebarPostButton);

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
    console.log('現在のDOMの状態:');

    // data-testid属性を持つ要素を検索
    const testIdElements = document.querySelectorAll('[data-testid]');
    console.log(`data-testid属性を持つ要素数: ${testIdElements.length}`);

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
        console.log('ポストボタンのクローンを作成中...');
        // ポストボタンの構造をログに出力
        console.log('ポストボタンの構造:', postButton.outerHTML);

        // ポストボタンをクローン
        const checkButton = postButton.cloneNode(true) as HTMLElement;
        console.log('ポストボタンのクローンが作成されました');

        // data-testid属性を変更
        checkButton.setAttribute('data-testid', 'checkButtonInline');
        console.log('data-testid属性を設定しました: "checkButtonInline"');

        // ボタンを有効化する
        console.log('ボタンを有効化します...');
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

        // ボタンのクラスリストをログに出力
        console.log('ボタンのクラスリスト:', checkButton.className);
        console.log('ボタンを有効化しました');

        // テキスト内容を「チェック」に変更
        console.log('テキスト内容を変更中...');
        const textSpan = checkButton.querySelector('.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-1tl8opc') as HTMLElement;
        if (textSpan) {
            console.log('テキスト要素が見つかりました:', textSpan);
            textSpan.textContent = 'チェック';
            console.log('テキスト内容を"チェック"に変更しました');
        } else {
            console.warn('テキスト要素が見つかりませんでした。代替方法を試みます...');

            // 代替方法: すべてのspanを検索
            const allSpans = checkButton.querySelectorAll('span');
            console.log(`ボタン内のspan要素数: ${allSpans.length}`);

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
                console.log('最も深いspan要素を見つけました:', deepestSpan);
                // 明示的に型チェックを行い、HTMLElementであることを確認
                if (deepestSpan instanceof HTMLElement) {
                    deepestSpan.textContent = 'チェック';
                    console.log('テキスト内容を"チェック"に変更しました（代替方法）');
                } else {
                    console.error('deepestSpanはHTMLElementではありません');
                }
            } else {
                console.error('テキストを変更するためのspan要素が見つかりませんでした');
            }
        }

        // クリックイベントを設定
        console.log('クリックイベントを設定中...');
        checkButton.addEventListener('click', () => {
            console.log('チェックボタンがクリックされました');
            // ここに実際の処理を追加
        });
        console.log('クリックイベントが設定されました');

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
