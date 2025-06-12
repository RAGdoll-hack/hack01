# バックエンドAPI仕様書

## 概要

このAPIは、テキスト、画像、動画のコンテンツを分析し、潜在的な問題（差別的発言、誹謗中傷など）を検出するためのものです。主にTwitter/X.comの投稿をチェックするために使用されますが、他のコンテンツにも適用可能です。

## ベースURL

```
http://localhost:5000
```

## 認証

現在、このAPIには認証機能は実装されていません。

## エラーハンドリング

すべてのAPIエンドポイントは、エラーが発生した場合に以下の形式でレスポンスを返します：

```json
{
  "error": "エラーメッセージ",
  "status": "error"
}
```

HTTPステータスコード：500

## APIエンドポイント

### 1. テキスト分析 API

テキストのみのコンテンツを分析し、潜在的な問題を検出します。

**エンドポイント**

```
POST /api/analyze/text
```

**リクエストパラメータ**

| パラメータ              | 型      | 必須  | 説明                             |
|--------------------|--------|-----|--------------------------------|
| text               | string | はい  | 分析するテキスト                       |
| speaker_background | JSON   | いいえ | 発言者の背景情報（名前、過去の問題、キャラクタータイプなど） |

**リクエスト例**

```json
{
  "text": "分析したいテキスト内容",
  "speaker_background": {
    "name": "発言者名",
    "past_incidents": [
      "過去の問題1",
      "過去の問題2"
    ],
    "character_type": "キャラクタータイプ",
    "usual_style": "通常の発言スタイル"
  }
}
```

**レスポンス**

```json
{
  "status": "success",
  "logs": [
    "処理ログ1",
    "処理ログ2",
    ...
  ],
  "analysis_result": {
    "risk_level": "高/中/低",
    "summary": "分析の要約",
    "violations": [
      {
        "type": "違反タイプ",
        "description": "違反の説明",
        "severity": "重要度",
        "location": "違反の場所",
        "detected_text": "検出されたテキスト",
        "context_analysis": "文脈分析"
      }
    ],
    "recommendations": [
      "推奨される対応策1",
      "推奨される対応策2",
      ...
    ]
  }
}
```

### 2. 画像とテキスト分析 API

画像とテキストの組み合わせを分析し、潜在的な問題を検出します。

**エンドポイント**

```
POST /api/analyze/image-text
```

**リクエストパラメータ**

| パラメータ              | 型      | 必須  | 説明                             |
|--------------------|--------|-----|--------------------------------|
| image              | file   | はい  | 分析する画像ファイル                     |
| text               | string | いいえ | 画像に関連するテキスト                    |
| speaker_background | JSON   | いいえ | 発言者の背景情報（名前、過去の問題、キャラクタータイプなど） |

**リクエスト例**

```
Content-Type: multipart/form-data

image: [画像ファイル]
text: "画像に関連するテキスト"
speaker_background: {"name": "発言者名", "past_incidents": ["過去の問題1"], "character_type": "キャラクタータイプ", "usual_style": "通常の発言スタイル"}
```

**レスポンス**

```json
{
  "status": "success",
  "logs": [
    "処理ログ1",
    "処理ログ2",
    ...
  ],
  "analysis_result": {
    "risk_level": "高/中/低",
    "summary": "分析の要約",
    "violations": [
      {
        "type": "違反タイプ",
        "description": "違反の説明",
        "severity": "重要度",
        "location": "違反の場所",
        "detected_text": "検出されたテキスト",
        "image_content": "画像の内容説明",
        "context_analysis": "文脈分析"
      }
    ],
    "recommendations": [
      "推奨される対応策1",
      "推奨される対応策2",
      ...
    ]
  }
}
```

### 3. 動画分析 API

動画コンテンツを分析し、音声の文字起こしと潜在的な問題を検出します。

**エンドポイント**

```
POST /api/analyze/video
```

**リクエストパラメータ**

| パラメータ              | 型    | 必須  | 説明                             |
|--------------------|------|-----|--------------------------------|
| video              | file | はい  | 分析する動画ファイル                     |
| speaker_background | JSON | いいえ | 発言者の背景情報（名前、過去の問題、キャラクタータイプなど） |

**リクエスト例**

```
Content-Type: multipart/form-data

video: [動画ファイル]
speaker_background: {"name": "発言者名", "past_incidents": ["過去の問題1"], "character_type": "キャラクタータイプ", "usual_style": "通常の発言スタイル"}
```

**レスポンス**

```json
{
  "status": "success",
  "logs": [
    "処理ログ1",
    "処理ログ2",
    ...
  ],
  "transcript": {
    "segments": [
      {
        "start": 0.0,
        "end": 5.2,
        "text": "文字起こしテキスト",
        "words": [
          {
            "word": "単語",
            "start": 0.0,
            "end": 0.5
          }
        ]
      }
    ],
    "full_text": "文字起こし全体のテキスト"
  },
  "compliance_analysis": {
    "summary": "分析の要約",
    "violations": [
      {
        "type": "違反タイプ",
        "description": "違反の説明",
        "start_time": 10.5,
        "end_time": 15.2,
        "severity": "重要度",
        "related_text": "関連するテキスト",
        "context_judgement": "文脈判断の結果"
      }
    ]
  }
}
```

## データモデル

### 発言者背景情報（Speaker Background）

```json
{
  "name": "発言者の名前",
  "past_incidents": [
    "過去の問題1",
    "過去の問題2",
    ...
  ],
  "character_type": "発言者のキャラクタータイプ",
  "usual_style": "発言者の通常の発言スタイル"
}
```

### 違反情報（Violation）

テキストと画像の違反：

```json
{
  "type": "違反のタイプ（差別、誹謗中傷など）",
  "description": "違反の詳細説明",
  "severity": "違反の重要度（高/中/低）",
  "location": "違反が検出された場所",
  "detected_text": "違反を含むテキスト",
  "image_content": "画像の内容説明（画像分析の場合）",
  "context_analysis": "文脈を考慮した分析結果"
}
```

動画の違反：

```json
{
  "type": "違反のタイプ",
  "description": "違反の詳細説明",
  "start_time": 10.5,
  "end_time": 15.2,
  "severity": "違反の重要度",
  "related_text": "違反に関連するテキスト",
  "context_judgement": "文脈判断の結果"
}
```

## 使用例

### cURLを使用したテキスト分析

```bash
curl -X POST http://localhost:5000/api/analyze/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "分析したいテキスト",
    "speaker_background": {
      "name": "発言者名",
      "past_incidents": [],
      "character_type": "一般人",
      "usual_style": "フォーマル"
    }
  }'
```

### cURLを使用した画像とテキスト分析

```bash
curl -X POST http://localhost:5000/api/analyze/image-text \
  -F "image=@/path/to/image.jpg" \
  -F "text=画像に関連するテキスト" \
  -F 'speaker_background={"name": "発言者名", "past_incidents": [], "character_type": "一般人", "usual_style": "フォーマル"}'
```

### cURLを使用した動画分析

```bash
curl -X POST http://localhost:5000/api/analyze/video \
  -F "video=@/path/to/video.mp4" \
  -F 'speaker_background={"name": "発言者名", "past_incidents": [], "character_type": "一般人", "usual_style": "フォーマル"}'
```