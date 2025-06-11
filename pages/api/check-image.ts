/**
 * @fileoverview 画像投稿チェックAPI
 * 
 * このAPIは、画像投稿（テキスト付きの場合もあり）の内容を分析し、リスク評価を行います。
 * ユーザーの過去のツイートを取得して文脈を考慮した分析を提供します。
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { deepCheckImage, RiskLevel, RiskAssessment } from '../../lib/geminiClient';
import { extractContext } from '../../lib/twitterContext';

/**
 * 画像投稿チェックAPIのレスポンス型
 */
interface CheckImageResponse {
  riskLevel: RiskLevel;
  issues: string[];
  suggestions: string[];
  contextUsed?: boolean;
}

/**
 * 画像投稿チェックAPIのリクエストハンドラ
 * @param {NextApiRequest} req - リクエストオブジェクト
 * @param {NextApiResponse} res - レスポンスオブジェクト
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckImageResponse | { error: string }>
) {
  // POSTリクエスト以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, imageBase64, caption } = req.body;

    // 必須パラメータのバリデーション
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: '画像データが指定されていないか、無効な形式です' });
    }

    // Base64形式の検証（簡易的なチェック）
    if (!imageBase64.startsWith('data:image/') && !imageBase64.includes('base64,')) {
      return res.status(400).json({ error: '無効な画像形式です。Base64エンコードされた画像を指定してください' });
    }

    // ユーザーIDが提供されている場合は文脈を取得
    let context = '';
    let contextUsed = false;
    
    if (userId) {
      try {
        context = await extractContext(userId);
        contextUsed = true;
      } catch (contextError) {
        console.error('文脈の取得に失敗しました:', contextError);
        // 文脈の取得に失敗しても処理は続行
      }
    }

    // キャプションの準備（未指定の場合は空文字列）
    const imageCaption = caption || '';

    // 画像のリスク評価を実行
    const assessment: RiskAssessment = await deepCheckImage(imageBase64, imageCaption, context);

    // レスポンスを返す
    return res.status(200).json({
      riskLevel: assessment.riskLevel,
      issues: assessment.issues,
      suggestions: assessment.suggestions,
      contextUsed
    });
  } catch (error) {
    console.error('画像分析中にエラーが発生しました:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
}