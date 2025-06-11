/**
 * @fileoverview テキスト投稿チェックAPI
 * 
 * このAPIは、テキスト投稿の内容を分析し、リスク評価を行います。
 * ユーザーの過去のツイートを取得して文脈を考慮した分析を提供します。
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { deepCheckText, RiskLevel, RiskAssessment } from '../../lib/geminiClient';
import { extractContext } from '../../lib/twitterContext';

/**
 * テキスト投稿チェックAPIのレスポンス型
 */
interface CheckTextResponse {
  riskLevel: RiskLevel;
  issues: string[];
  suggestions: string[];
  contextUsed?: boolean;
}

/**
 * テキスト投稿チェックAPIのリクエストハンドラ
 * @param {NextApiRequest} req - リクエストオブジェクト
 * @param {NextApiResponse} res - レスポンスオブジェクト
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckTextResponse | { error: string }>
) {
  // POSTリクエスト以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, text } = req.body;

    // 必須パラメータのバリデーション
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'テキストが指定されていないか、無効な形式です' });
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

    // テキストのリスク評価を実行
    const assessment: RiskAssessment = await deepCheckText(text, context);

    // レスポンスを返す
    return res.status(200).json({
      riskLevel: assessment.riskLevel,
      issues: assessment.issues,
      suggestions: assessment.suggestions,
      contextUsed
    });
  } catch (error) {
    console.error('テキスト分析中にエラーが発生しました:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
}