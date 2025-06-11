/**

* @fileoverview ライブラリディレクトリのREADME
*
* このディレクトリには、アプリケーション全体で共有される共通ライブラリが含まれています。
  */

# ライブラリディレクトリ

このディレクトリには、PreFilter.AIアプリケーション全体で共有される共通ライブラリが含まれています。

## ファイル一覧

### geminiClient.ts

Google Gemini APIクライアントモジュール。テキスト、画像、動画の内容を分析し、リスク評価を行う機能を提供します。

主な機能:

- `deepCheckText`: テキスト内容を分析し、リスク評価を行います
- `deepCheckImage`: 画像内容を分析し、リスク評価を行います
- `deepCheckVideo`: 動画の文字起こしを分析し、リスク評価を行います

### twitterContext.ts

Twitterコンテキスト取得モジュール。ユーザーの直前のツイートを取得するための機能を提供します。

主な機能:

- `getRecentTweets`: ユーザーの最近のツイートを取得します
- `getRecentRetweets`: ユーザーのリツイートを取得します
- `extractContext`: ユーザーのツイート履歴から文脈を抽出します

### whisperClient.ts

Whisper音声文字起こしモジュール。動画から音声を抽出し、Whisper APIを使用して文字起こしを行う機能を提供します。

主な機能:

- `transcribeVideo`: 動画ファイルから音声を抽出し、文字起こしを行います
- `formatTranscriptionWithTimestamps`: 文字起こし結果からタイムスタンプ付きテキストを生成します
- `extractTextByTimeRange`: 文字起こし結果から特定の時間範囲のテキストを抽出します