/**
 * @fileoverview Twitterコンテキスト取得モジュール
 * 
 * このモジュールは、ユーザーの直前のツイートを取得するための機能を提供します。
 * 実際のTwitter APIの代わりにモックデータを返します。
 */

/**
 * 定数定義
 */
const DEFAULT_COUNT = {
    TWEETS: 3,
    RETWEETS: 2
};

const TIME_INTERVALS = {
    ONE_HOUR: 3600000,    // 1時間（ミリ秒）
    TWO_HOURS: 7200000,   // 2時間（ミリ秒）
    THREE_HOURS: 10800000, // 3時間（ミリ秒）
    FOUR_HOURS: 14400000,  // 4時間（ミリ秒）
    ONE_HALF_HOURS: 5400000, // 1.5時間（ミリ秒）
    TWO_HALF_HOURS: 9000000  // 2.5時間（ミリ秒）
};

/**
 * ユーザーの最近のツイートを取得します
 * @param {string} userId - ツイートを取得するユーザーのID
 * @param {number} count - 取得するツイートの数（デフォルト: 3）
 * @returns {Promise<Array<Object>>} 最近のツイートの配列
 */
export async function getRecentTweets(userId: string, count: number = DEFAULT_COUNT.TWEETS): Promise<Array<{
    id: string;
    text: string;
    createdAt: string;
    isRetweet: boolean;
}>> {
  // モックデータ: 実際の実装ではTwitter APIを呼び出します
  const mockTweets = [
    {
      id: "1",
      text: "新しい映画を見てきました！とても面白かったです。",
        createdAt: new Date(Date.now() - TIME_INTERVALS.ONE_HOUR).toISOString(), // 1時間前
      isRetweet: false
    },
    {
      id: "2",
      text: "今日の天気は最高ですね！公園でピクニックするのにぴったりです。",
        createdAt: new Date(Date.now() - TIME_INTERVALS.TWO_HOURS).toISOString(), // 2時間前
      isRetweet: false
    },
    {
      id: "3",
      text: "RT @friend: 新商品が発売されました！皆さんもぜひチェックしてください！",
        createdAt: new Date(Date.now() - TIME_INTERVALS.THREE_HOURS).toISOString(), // 3時間前
      isRetweet: true
    },
    {
      id: "4",
      text: "明日の予定について考えています。何かおすすめがあれば教えてください！",
        createdAt: new Date(Date.now() - TIME_INTERVALS.FOUR_HOURS).toISOString(), // 4時間前
      isRetweet: false
    }
  ];

  // 指定された数のツイートを返す
  return Promise.resolve(mockTweets.slice(0, count));
}

/**
 * ユーザーのリツイートを取得します
 * @param {string} userId - リツイートを取得するユーザーのID
 * @param {number} count - 取得するリツイートの数（デフォルト: 2）
 * @returns {Promise<Array<Object>>} 最近のリツイートの配列
 */
export async function getRecentRetweets(userId: string, count: number = DEFAULT_COUNT.RETWEETS): Promise<Array<{
    id: string;
    originalTweetId: string;
    originalUserId: string;
    text: string;
    createdAt: string;
}>> {
  // モックデータ: 実際の実装ではTwitter APIを呼び出します
  const mockRetweets = [
    {
      id: "5",
      originalTweetId: "101",
      originalUserId: "user123",
      text: "RT @user123: 素晴らしいニュースです！新しいプロジェクトが始まります。",
        createdAt: new Date(Date.now() - TIME_INTERVALS.ONE_HALF_HOURS).toISOString(), // 1.5時間前
    },
    {
      id: "6",
      originalTweetId: "102",
      originalUserId: "user456",
      text: "RT @user456: 今日のイベントは大成功でした！参加してくれた皆さんありがとうございます。",
        createdAt: new Date(Date.now() - TIME_INTERVALS.TWO_HALF_HOURS).toISOString(), // 2.5時間前
    }
  ];

  // 指定された数のリツイートを返す
  return Promise.resolve(mockRetweets.slice(0, count));
}

/**
 * ユーザーのツイート履歴から文脈を抽出します
 * @param {string} userId - 文脈を抽出するユーザーのID
 * @returns {Promise<string>} 抽出された文脈
 */
export async function extractContext(userId: string): Promise<string> {
  // 最近のツイートとリツイートを取得
  const tweets = await getRecentTweets(userId);
  const retweets = await getRecentRetweets(userId);

    // ツイートとリツイートを時系列順に結合
  const allTweets = [...tweets, ...retweets].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

    // 文脈を構築
  const context = allTweets.map(tweet => tweet.text).join("\n\n");

    return context;
}
