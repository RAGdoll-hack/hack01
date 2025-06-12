const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

/**
 * フォルダー名が条件を満たしているか検証する関数
 * @param {string} folderPath - 検証するフォルダーのパス
 * @param {Array<string>} exceptions - 例外として許可するフォルダー名の配列
 * @returns {boolean} - 検証結果
 */
function validateFolderName(folderPath, exceptions = []) {
    const folderName = path.basename(folderPath);

    // 例外リストに含まれる場合は検証をスキップ
    if (exceptions.includes(folderName)) {
        return true;
    }

    // フォルダー名が_で始まる場合はエラー
    if (folderName.startsWith('_')) {
        console.error(`エラー: フォルダー名を_で開始することは禁止されています: ${folderName}`);
        return false;
    }

    return true;
}

/**
 * フォルダー名検証プラグイン
 * プロジェクト内のすべてのフォルダーを検証する
 */
class FolderNameValidationPlugin {
    constructor(options = {}) {
        this.options = {
            rootDir: options.rootDir || path.join(__dirname, 'src'),
            exceptions: options.exceptions || ['_locales', 'node_modules'],
        };
    }

    apply(compiler) {
        const pluginName = 'FolderNameValidationPlugin';

        compiler.hooks.beforeCompile.tapAsync(pluginName, (params, callback) => {
            console.log('フォルダー名の検証を開始します...');

            try {
                this.validateFolders(this.options.rootDir);
                console.log('フォルダー名の検証が完了しました。');
                callback();
            } catch (error) {
                callback(error);
            }
        });
    }

    validateFolders(dir) {
        const items = fs.readdirSync(dir, {withFileTypes: true});

        for (const item of items) {
            if (item.isDirectory()) {
                const fullPath = path.join(dir, item.name);

                // フォルダー名を検証
                if (!validateFolderName(fullPath, this.options.exceptions)) {
                    throw new Error(`無効なフォルダー名: ${item.name}`);
                }

                // サブフォルダーも再帰的に検証
                this.validateFolders(fullPath);
            }
        }
    }
}

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    entry: {
        popup: path.join(__dirname, 'src', 'app', 'scripts', 'popup.ts'),
        background: path.join(__dirname, 'src', 'app', 'scripts', 'background.ts'),
        sidebar: path.join(__dirname, 'src', 'app', 'scripts', 'sidebar.ts'),
        content: path.join(__dirname, 'src', 'app', 'scripts', 'content.ts'),
        'content_youtube': path.join(__dirname, 'src', 'app', 'scripts', 'content_youtube.ts'),
    },
    // ビルド前の検証
    infrastructureLogging: {
        level: 'info',
        debug: true
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-typescript'],
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        // フォルダー名検証プラグイン
        new FolderNameValidationPlugin({
            rootDir: path.join(__dirname, 'src'),
            exceptions: ['_locales', 'node_modules']
        }),
        new CleanWebpackPlugin({
            cleanStaleWebpackAssets: false,
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'src', 'app', 'manifest.json'),
                    to: path.join(__dirname, 'dist'),
                    force: true,
                },
                {
                    from: path.join(__dirname, 'src', 'app', 'images'),
                    to: path.join(__dirname, 'dist', 'images'),
                    force: true,
                    filter: (resourcePath) => {
                        // ディレクトリの場合は検証
                        if (fs.statSync(resourcePath).isDirectory()) {
                            return validateFolderName(resourcePath, ['_locales', 'node_modules']);
                        }
                        return true;
                    },
                },
                // _localesフォルダーは例外として許可（既存のプロジェクト互換性のため）
                {
                    from: path.join(__dirname, 'src', 'app', '_locales'),
                    to: path.join(__dirname, 'dist', '_locales'),
                    force: true,
                },
            ],
        }),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src', 'app', 'pages', 'popup.html'),
            filename: 'popup.html',
            chunks: ['popup'],
        }),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src', 'app', 'pages', 'sidebar.html'),
            filename: 'pages/sidebar.html',
            chunks: ['sidebar'],
        }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
    },
};
