/**
 * @fileoverview Next.js設定ファイル
 *
 * このファイルは、Next.jsのビルド設定をカスタマイズし、
 * Chrome拡張機能として動作するように構成します。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
    // 静的HTMLファイルを生成するための設定
    output: 'export',

    // Chrome拡張機能のコンテキストで動作するための設定
    basePath: '',
    trailingSlash: true,

    // 画像最適化を無効化（拡張機能では不要）
    images: {
        unoptimized: true,
    },

    // ビルド時にマニフェストファイルとアイコンを含める
    webpack: (config, {isServer}) => {
        // サーバーサイドのビルドでは何もしない
        if (isServer) {
            return config;
        }

        return config;
    },

    // 拡張機能として動作するために必要なアセットを含める
    experimental: {
        // 静的ページの生成を有効化
        staticPageGenerationTimeout: 120,
    },
};

module.exports = nextConfig;