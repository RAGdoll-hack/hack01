/**
 * @fileoverview メインページコンポーネント
 * 
 * このファイルは、PreFilter.AIのメインページを定義します。
 * 実際の実装では、テキスト・画像・動画のアップロードフォームと
 * 結果表示コンポーネントが含まれます。
 */

import React from 'react';
import { NextPage } from 'next';

/**
 * PreFilter.AIのメインページコンポーネント
 */
const Home: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">PreFilter.AI</h1>
        <p className="text-gray-600">
          芸能人・インフルエンサーのSNS投稿を投稿前にAIでチェックし、リスクを未然に防ぐサービス
        </p>
      </header>

      <main>
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">投稿チェックサービス</h2>
          <p className="mb-4">
            このサービスでは、以下の3種類の投稿内容をチェックできます：
          </p>
          <ul className="list-disc pl-6 mb-6">
            <li className="mb-2">テキスト投稿のチェック</li>
            <li className="mb-2">画像投稿（テキスト付き）のチェック</li>
            <li className="mb-2">動画投稿のチェック（音声文字起こし機能付き）</li>
          </ul>
          <p>
            各APIエンドポイントは以下の通りです：
          </p>
          <ul className="list-disc pl-6">
            <li className="mb-2"><code>/api/check-text</code> - テキスト投稿チェック</li>
            <li className="mb-2"><code>/api/check-image</code> - 画像投稿チェック</li>
            <li className="mb-2"><code>/api/check-video</code> - 動画投稿チェック</li>
          </ul>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">実装状況</h2>
          <p className="mb-4">
            現在、このアプリケーションはモック実装の状態です。実際のAPIリクエストは
            シミュレートされたレスポンスを返します。
          </p>
          <p>
            実際の実装では、Google Gemini APIとWhisperを使用して、より高度な
            コンテンツ分析と音声文字起こしを行います。
          </p>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>© 2023 PreFilter.AI - All rights reserved</p>
      </footer>
    </div>
  );
};

export default Home;