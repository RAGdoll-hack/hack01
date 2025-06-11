/**
 * @fileoverview 動画投稿チェックAPI
 * 
 * このAPIは、動画投稿の内容を分析し、リスク評価を行います。
 * Whisperを使用して音声を文字起こしし、ユーザーの過去のツイートを取得して
 * 文脈を考慮した分析を提供します。
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { deepCheckVideo, RiskLevel, RiskAssessment } from '../../lib/geminiClient';
import { extractContext } from '../../lib/twitterContext';
import { transcribeVideo, formatTranscriptionWithTimestamps } from '../../lib/whisperClient';

/**
 * 動画投稿チェックAPIのレスポンス型
 */
interface CheckVideoResponse {
  riskLevel: RiskLevel;
  issues: string[];
  suggestions: string[];
  timeRanges: Array<{ start: number, end: number, issue: string }>;
  transcription: string;
  formattedTranscription: string;
  contextUsed?: boolean;
}

/**
 * 動画投稿チェックAPIのリクエストハンドラ
 * @param {NextApiRequest} req - リクエストオブジェクト
 * @param {NextApiResponse} res - レスポンスオブジェクト
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckVideoResponse | { error: string }>
) {
  // POSTリクエスト以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userId, videoData } = req.body;

    // 必須パラメータのバリデーション
    if (!videoData || typeof videoData !== 'string') {
      return res.status(400).json({ error: '動画データが指定されていないか、無効な形式です' });
    }

    // 動画データの簡易検証
    if (!videoData.startsWith('data:video/') && !videoData.includes('base64,')) {
      return res.status(400).json({ error: '無効な動画形式です。Base64エンコードされた動画を指定してください' });
    }

    // 1. 動画の音声を文字起こし
    const transcription = await transcribeVideo(videoData, { language: 'ja', withTimestamps: true });
    
    // タイムスタンプ付きの文字起こしをフォーマット
    const formattedTranscription = formatTranscriptionWithTimestamps(transcription);

    // 2. ユーザーIDが提供されている場合は文脈を取得
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

    // 3. 文字起こしのリスク評価を実行
    const assessment = await deepCheckVideo(
      transcription.text,
      transcription.segments,
      context
    );

    // レスポンスを返す
    return res.status(200).json({
      riskLevel: assessment.riskLevel,
      issues: assessment.issues,
      suggestions: assessment.suggestions,
      timeRanges: assessment.timeRanges,
      transcription: transcription.text,
      formattedTranscription,
      contextUsed
    });
  } catch (error) {
    console.error('動画分析中にエラーが発生しました:', error);
    return res.status(500).json({ error: '内部サーバーエラー' });
  }
}