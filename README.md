
# PreFilter.AI

芸能人・インフルエンサーのSNS投稿（テキスト・画像・動画）を投稿前にAIでチェックし、不用意な発言や肖像権・著作権侵害などのリスクを未然に防ぐサービスです。

## プロジェクト概要

PreFilter.AIは、SNS投稿前にコンテンツをチェックし、潜在的なリスクを特定するAIサービスです。テキスト、画像、動画の各種コンテンツに対応し、過去の投稿との文脈も考慮した分析を提供します。

### 主な機能

- テキスト投稿のリスク分析
- 画像（+テキスト）のリスク分析
- 動画の音声文字起こしとリスク分析
- 過去のツイートを考慮した文脈分析
- リスクレベル（重・中・小）の分類と改善提案

## プロジェクト構成

```
prefilter-ai/
├── lib/                      # 共通ライブラリ
│   ├── twitterContext.ts     # Twitter文脈取得モジュール
│   ├── whisperClient.ts      # 音声文字起こしモジュール
│   └── geminiClient.ts       # AI分析モジュール
├── pages/                    # Next.jsページ
│   ├── index.tsx             # メインページ
│   └── api/                  # APIエンドポイント
│       ├── check-text.ts     # テキスト分析API
│       ├── check-image.ts    # 画像分析API
│       └── check-video.ts    # 動画分析API
└── package.json              # 依存関係定義
```

## APIエンドポイント

### 1. テキスト分析 API

```
POST /api/check-text
```

**リクエスト例:**
```json
{
  "userId": "12345",
  "text": "あいつは本当に勘違い野郎だ！"
}
```

**レスポンス例:**
```json
{
  "riskLevel": "中",
  "issues": ["『勘違い』という表現が含まれています"],
  "suggestions": ["ネガティブな感情表現は、より客観的な表現に変更することをお勧めします"],
  "contextUsed": true
}
```

### 2. 画像分析 API

```
POST /api/check-image
```

**リクエスト例:**
```json
{
  "userId": "12345",
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "caption": "今日の撮影風景です！"
}
```

**レスポンス例:**
```json
{
  "riskLevel": "中",
  "issues": ["画像に著作権で保護されたコンテンツが含まれている可能性があります"],
  "suggestions": ["著作権で保護されたコンテンツを使用する場合は、適切な許可を得るか、フリー素材を使用してください"],
  "contextUsed": true
}
```

### 3. 動画分析 API

```
POST /api/check-video
```

**リクエスト例:**
```json
{
  "userId": "12345",
  "videoData": "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28..."
}
```

**レスポンス例:**
```json
{
  "riskLevel": "小",
  "issues": ["特に問題は見つかりませんでした"],
  "suggestions": ["このまま投稿しても問題ないでしょう"],
  "timeRanges": [],
  "transcription": "こんにちは、今日は新製品の発表会についてお話しします...",
  "formattedTranscription": "[00:00:00.000 --> 00:00:03.800] こんにちは、今日は新製品の発表会についてお話しします。\n[00:00:04.200 --> 00:00:09.600] この製品は多くの人々の生活を変える可能性を秘めています。",
  "contextUsed": true
}
```

## 開発環境のセットアップ

### 前提条件

- Node.js 16.x以上
- npm 7.x以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/prefilter-ai.git
cd prefilter-ai

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

## 注意事項

現在の実装はモックデータを使用しています。実際の運用では、以下の外部APIとの連携が必要です：

1. Twitter API - ユーザーの過去のツイート取得
2. Whisper API - 動画の音声文字起こし
3. Google Gemini API - コンテンツの深層分析

## ライセンス

このプロジェクトは非公開です。無断での使用、複製、配布は禁止されています。#
