# 変更内容: Base64画像とBlobビデオのOpenAI処理対応

## 概要

Twitterの投稿チェック機能において、Base64エンコードされた画像データとBlobビデオURLを適切に処理し、Flaskバックエンドを通じてOpenAIに送信できるように変更しました。

## 変更詳細

### 1. 画像処理の改善

- Base64エンコードされた画像データを、Flaskバックエンドが期待する`multipart/form-data`形式のファイルオブジェクトに変換
- 画像のContent-Typeを保持し、適切なファイル拡張子を判定
- 複数画像がある場合は、最初の1枚のみを処理（APIの仕様に合わせて）

### 2. ビデオ処理の実装

- BlobビデオURLからファイルデータを取得
- 取得したビデオデータをFileオブジェクトに変換
- Content-Typeに基づいて適切なファイル拡張子を設定
- `multipart/form-data`形式でFlaskバックエンドに送信
- エラー処理を追加し、ビデオの取得に失敗した場合はURLのみをJSONで送信

### 3. APIリクエスト形式の最適化

- コンテンツタイプに応じて適切なAPIエンドポイントとリクエスト形式を使用:
    - テキストのみ: `/api/analyze/text` (JSON形式)
    - 画像付き: `/api/analyze/image-text` (multipart/form-data形式)
    - ビデオ付き: `/api/analyze/video` (multipart/form-data形式)

## 技術的詳細

### Base64画像の処理

```typescript
// Base64文字列からファイルオブジェクトを作成
const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
if (matches && matches.length === 3) {
    const contentType = matches[1];
    const base64Data = matches[2];
    const byteCharacters = atob(base64Data);
    // バイナリデータに変換
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
    // Blobを作成してFileオブジェクトに変換
    const blob = new Blob(byteArrays, { type: contentType });
    const file = new File([blob], `image.${extension}`, { type: contentType });
    // FormDataにファイルを追加
    formData.append('image', file);
}
```

### BlobビデオURLの処理

```typescript
// 動画のblobURLからファイルを取得
const videoResponse = await fetch(tweetData.video);
const videoBlob = await videoResponse.blob();
// ファイル拡張子を判定
let extension = 'mp4';
const contentType = videoResponse.headers.get('Content-Type') || 'video/mp4';
if (contentType.includes('webm')) {
    extension = 'webm';
} else if (contentType.includes('ogg')) {
    extension = 'ogg';
}
// Fileオブジェクトを作成
const videoFile = new File([videoBlob], `video.${extension}`, { type: contentType });
// FormDataに追加
formData.append('video', videoFile);
```

## 今後の課題

1. 複数画像の処理: 現在は最初の1枚のみを処理していますが、将来的には複数画像の処理も検討
2. 大きなファイルの処理: 大きな画像やビデオファイルの場合のパフォーマンス最適化
3. エラーハンドリングの強化: より詳細なエラーメッセージとリカバリー処理の実装