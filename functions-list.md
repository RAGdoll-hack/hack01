# PreFilter.AI 関数リスト

このドキュメントは、PreFilter.AIプロジェクトの主要なモジュールと関数の一覧です。

## geminiClient.ts

### 型定義

#### RiskLevel (enum)
リスク評価のレベルを定義します。
- `LOW = "小"` - 低リスク
- `MEDIUM = "中"` - 中リスク
- `HIGH = "重"` - 高リスク

#### RiskAssessment (interface)
リスク評価結果の構造を定義します。
- `riskLevel: RiskLevel` - リスクレベル
- `issues: string[]` - 検出された問題点のリスト
- `suggestions: string[]` - 改善提案のリスト

### 関数

#### deepCheckText
```typescript
async function deepCheckText(text: string, context: string = ""): Promise<RiskAssessment>
```
テキスト内容を分析し、リスク評価を行います。
- **パラメータ**:
  - `text` - 分析するテキスト
  - `context` - 追加のコンテキスト情報（過去のツイートなど）
- **戻り値**: リスク評価結果

#### deepCheckImage
```typescript
async function deepCheckImage(imageBase64: string, caption: string = "", context: string = ""): Promise<RiskAssessment>
```
画像内容を分析し、リスク評価を行います。
- **パラメータ**:
  - `imageBase64` - Base64エンコードされた画像データ
  - `caption` - 画像に添えられたキャプション
  - `context` - 追加のコンテキスト情報
- **戻り値**: リスク評価結果

#### deepCheckVideo
```typescript
async function deepCheckVideo(
  transcription: string, 
  segments: Array<{ start: number, end: number, text: string }> = [], 
  context: string = ""
): Promise<RiskAssessment & { timeRanges: Array<{ start: number, end: number, issue: string }> }>
```
動画の文字起こしを分析し、リスク評価を行います。
- **パラメータ**:
  - `transcription` - 動画の文字起こしテキスト
  - `segments` - タイムスタンプ付きのセグメント
  - `context` - 追加のコンテキスト情報
- **戻り値**: リスク評価結果とリスクのある時間範囲

#### generateSuggestions (内部関数)
```typescript
function generateSuggestions(issues: string[], riskLevel: RiskLevel): string[]
```
検出された問題に基づいて改善提案を生成します。
- **パラメータ**:
  - `issues` - 検出された問題のリスト
  - `riskLevel` - リスクレベル
- **戻り値**: 改善提案のリスト

## twitterContext.ts

### 関数

#### getRecentTweets
```typescript
async function getRecentTweets(userId, count = 3)
```
ユーザーの最近のツイートを取得します。
- **パラメータ**:
  - `userId` - ツイートを取得するユーザーのID
  - `count` - 取得するツイートの数（デフォルト: 3）
- **戻り値**: 最近のツイートの配列

#### getRecentRetweets
```typescript
async function getRecentRetweets(userId, count = 2)
```
ユーザーのリツイートを取得します。
- **パラメータ**:
  - `userId` - リツイートを取得するユーザーのID
  - `count` - 取得するリツイートの数（デフォルト: 2）
- **戻り値**: 最近のリツイートの配列

#### extractContext
```typescript
async function extractContext(userId)
```
ユーザーのツイート履歴から文脈を抽出します。
- **パラメータ**:
  - `userId` - 文脈を抽出するユーザーのID
- **戻り値**: 抽出された文脈

## whisperClient.ts

### 関数

#### transcribeVideo
```typescript
async function transcribeVideo(videoData, options = { language: 'ja', withTimestamps: true })
```
動画ファイルから音声を抽出し、文字起こしを行います。
- **パラメータ**:
  - `videoData` - 動画データまたはファイルパス
  - `options` - 文字起こしオプション
    - `language` - 言語コード（デフォルト: 'ja'）
    - `withTimestamps` - タイムスタンプを含めるかどうか（デフォルト: true）
- **戻り値**: 文字起こし結果

#### formatTranscriptionWithTimestamps
```typescript
function formatTranscriptionWithTimestamps(transcription)
```
文字起こし結果からタイムスタンプ付きテキストを生成します。
- **パラメータ**:
  - `transcription` - 文字起こし結果
- **戻り値**: タイムスタンプ付きテキスト

#### formatTimestamp (内部関数)
```typescript
function formatTimestamp(seconds)
```
秒数をHH:MM:SS形式に変換します。
- **パラメータ**:
  - `seconds` - 秒数
- **戻り値**: HH:MM:SS形式の時間

#### extractTextByTimeRange
```typescript
function extractTextByTimeRange(transcription, startTime, endTime)
```
文字起こし結果から特定の時間範囲のテキストを抽出します。
- **パラメータ**:
  - `transcription` - 文字起こし結果
  - `startTime` - 開始時間（秒）
  - `endTime` - 終了時間（秒）
- **戻り値**: 抽出されたテキスト

## check-image.ts

### 型定義

#### CheckImageResponse (interface)
画像投稿チェックAPIのレスポンス型を定義します。
- `riskLevel: RiskLevel` - リスクレベル
- `issues: string[]` - 検出された問題点のリスト
- `suggestions: string[]` - 改善提案のリスト
- `contextUsed?: boolean` - 文脈が使用されたかどうか

### 関数

#### handler (default export)
```typescript
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckImageResponse | { error: string }>
)
```
画像投稿チェックAPIのリクエストハンドラです。
- **パラメータ**:
  - `req` - リクエストオブジェクト
  - `res` - レスポンスオブジェクト
- **戻り値**: なし（レスポンスを送信）

## check-text.ts

### 型定義

#### CheckTextResponse (interface)
テキスト投稿チェックAPIのレスポンス型を定義します。
- `riskLevel: RiskLevel` - リスクレベル
- `issues: string[]` - 検出された問題点のリスト
- `suggestions: string[]` - 改善提案のリスト
- `contextUsed?: boolean` - 文脈が使用されたかどうか

### 関数

#### handler (default export)
```typescript
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckTextResponse | { error: string }>
)
```
テキスト投稿チェックAPIのリクエストハンドラです。
- **パラメータ**:
  - `req` - リクエストオブジェクト
  - `res` - レスポンスオブジェクト
- **戻り値**: なし（レスポンスを送信）

## check-video.ts

### 型定義

#### CheckVideoResponse (interface)
動画投稿チェックAPIのレスポンス型を定義します。
- `riskLevel: RiskLevel` - リスクレベル
- `issues: string[]` - 検出された問題点のリスト
- `suggestions: string[]` - 改善提案のリスト
- `timeRanges: Array<{ start: number, end: number, issue: string }>` - リスクのある時間範囲
- `transcription: string` - 文字起こしテキスト
- `formattedTranscription: string` - タイムスタンプ付き文字起こしテキスト
- `contextUsed?: boolean` - 文脈が使用されたかどうか

### 関数

#### handler (default export)
```typescript
async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckVideoResponse | { error: string }>
)
```
動画投稿チェックAPIのリクエストハンドラです。
- **パラメータ**:
  - `req` - リクエストオブジェクト
  - `res` - レスポンスオブジェクト
- **戻り値**: なし（レスポンスを送信）

## index.tsx

### コンポーネント

#### Home (default export)
```typescript
const Home: NextPage = () => { ... }
```
PreFilter.AIのメインページコンポーネントです。
- **パラメータ**: なし
- **戻り値**: Reactコンポーネント