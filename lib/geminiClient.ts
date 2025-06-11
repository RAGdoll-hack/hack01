/**
 * @fileoverview Google Gemini APIクライアントモジュール
 * 
 * このモジュールは、Google Gemini APIを使用してテキスト、画像、動画の内容を分析し、
 * リスク評価を行う機能を提供します。実際のGemini APIの代わりにモックデータを返します。
 */

/**
 * 定数定義
 */
const PROCESSING_DELAY = {
  TEXT: 800,   // テキスト処理の遅延時間（ミリ秒）
  IMAGE: 1200, // 画像処理の遅延時間（ミリ秒）
  VIDEO: 1500  // 動画処理の遅延時間（ミリ秒）
};

const DEFAULT_MESSAGE = {
  NO_ISSUES: "特に問題は見つかりませんでした",
  SAFE_TO_POST: "このまま投稿しても問題ないでしょう",
  HIGH_RISK: "このコンテンツは高リスクと判断されました。投稿前に内容を見直すことを強く推奨します",
  MEDIUM_RISK: "このコンテンツには中程度のリスクがあります。指摘された問題点を修正することをお勧めします",
  DEFAULT_SUGGESTION: "より丁寧な表現を心がけることで、コミュニケーションの質が向上します"
};

/**
 * リスクレベルの定義
 */
export enum RiskLevel {
  LOW = "小",
  MEDIUM = "中",
  HIGH = "重"
}

/**
 * リスク評価結果の型定義
 */
export interface RiskAssessment {
  riskLevel: RiskLevel;
  issues: string[];
  suggestions: string[];
}

/**
 * テキスト内容を分析し、リスク評価を行います
 * @param {string} text - 分析するテキスト
 * @param {string} context - 追加のコンテキスト情報（過去のツイートなど）
 * @returns {Promise<RiskAssessment>} リスク評価結果
 */
export async function deepCheckText(text: string, context: string = ""): Promise<RiskAssessment> {
  // 実際の実装では、Gemini APIにテキストとコンテキストを送信します
  // ここではモックデータを返します

  // 処理時間をシミュレート
  await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY.TEXT));

  // テキスト内の特定のキーワードに基づいてリスクを評価
  const sensitiveWords = [
    { word: "バカ", level: RiskLevel.MEDIUM },
    { word: "アホ", level: RiskLevel.MEDIUM },
    { word: "クソ", level: RiskLevel.HIGH },
    { word: "死ね", level: RiskLevel.HIGH },
    { word: "馬鹿", level: RiskLevel.MEDIUM },
    { word: "うざい", level: RiskLevel.MEDIUM },
    { word: "最悪", level: RiskLevel.LOW },
    { word: "嫌い", level: RiskLevel.LOW },
    { word: "勘違い", level: RiskLevel.LOW }
  ];

  const foundIssues: string[] = [];
  let highestRiskLevel = RiskLevel.LOW;

  // テキスト内の問題を検出
  sensitiveWords.forEach(({ word, level }) => {
    if (text.includes(word)) {
      foundIssues.push(`「${word}」という表現が含まれています`);

      // 最も高いリスクレベルを記録
      if (level === RiskLevel.HIGH || 
         (level === RiskLevel.MEDIUM && highestRiskLevel === RiskLevel.LOW)) {
        highestRiskLevel = level;
      }
    }
  });

  // コンテキストも考慮した追加チェック
  if (context && context.includes("批判") && text.includes("思う")) {
    foundIssues.push("過去の批判的な投稿に続く意見表明は、炎上リスクがあります");
    if (highestRiskLevel === RiskLevel.LOW) {
      highestRiskLevel = RiskLevel.MEDIUM;
    }
  }

  // 問題が見つからない場合
  if (foundIssues.length === 0) {
    return {
      riskLevel: RiskLevel.LOW,
      issues: [DEFAULT_MESSAGE.NO_ISSUES],
      suggestions: [DEFAULT_MESSAGE.SAFE_TO_POST]
    };
  }

  // 改善提案を生成
  const suggestions = generateSuggestions(foundIssues, highestRiskLevel);

  return {
    riskLevel: highestRiskLevel,
    issues: foundIssues,
    suggestions
  };
}

/**
 * 画像内容を分析し、リスク評価を行います
 * @param {string} imageBase64 - Base64エンコードされた画像データ
 * @param {string} caption - 画像に添えられたキャプション
 * @param {string} context - 追加のコンテキスト情報
 * @returns {Promise<RiskAssessment>} リスク評価結果
 */
export async function deepCheckImage(imageBase64: string, caption: string = "", context: string = ""): Promise<RiskAssessment> {
  // 実際の実装では、Gemini APIに画像データとテキストを送信します
  // ここではモックデータを返します

  // 処理時間をシミュレート
  await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY.IMAGE));

  // 画像のハッシュ値（モック）に基づいてリスクを評価
  // 実際の実装では、画像の内容をAIが分析します
  const mockImageHash = imageBase64.length % 10;

  // キャプションのリスク評価
  const captionAssessment = caption ? await deepCheckText(caption, context) : null;

  // 画像内容のモック評価
  let imageIssues: string[] = [];
  let imageRiskLevel = RiskLevel.LOW;

  if (mockImageHash >= 8) {
    imageIssues.push("画像に不適切なコンテンツが含まれている可能性があります");
    imageRiskLevel = RiskLevel.HIGH;
  } else if (mockImageHash >= 5) {
    imageIssues.push("画像に著作権で保護されたコンテンツが含まれている可能性があります");
    imageRiskLevel = RiskLevel.MEDIUM;
  } else if (mockImageHash >= 3) {
    imageIssues.push("画像に個人情報が写り込んでいる可能性があります");
    imageRiskLevel = RiskLevel.MEDIUM;
  }

  // キャプションと画像の評価を統合
  const allIssues = [
    ...(captionAssessment?.issues || []),
    ...imageIssues
  ];

  // 最も高いリスクレベルを採用
  const finalRiskLevel = captionAssessment?.riskLevel === RiskLevel.HIGH || imageRiskLevel === RiskLevel.HIGH
    ? RiskLevel.HIGH
    : captionAssessment?.riskLevel === RiskLevel.MEDIUM || imageRiskLevel === RiskLevel.MEDIUM
      ? RiskLevel.MEDIUM
      : RiskLevel.LOW;

  // 問題が見つからない場合
  if (allIssues.length === 0 || (allIssues.length === 1 && allIssues[0] === DEFAULT_MESSAGE.NO_ISSUES)) {
    return {
      riskLevel: RiskLevel.LOW,
      issues: [DEFAULT_MESSAGE.NO_ISSUES],
      suggestions: [DEFAULT_MESSAGE.SAFE_TO_POST]
    };
  }

  // 改善提案を生成
  const suggestions = generateSuggestions(allIssues, finalRiskLevel);

  return {
    riskLevel: finalRiskLevel,
    issues: allIssues,
    suggestions
  };
}

/**
 * 動画の文字起こしを分析し、リスク評価を行います
 * @param {string} transcription - 動画の文字起こしテキスト
 * @param {Object[]} segments - タイムスタンプ付きのセグメント
 * @param {string} context - 追加のコンテキスト情報
 * @returns {Promise<RiskAssessment & { timeRanges: Object[] }>} リスク評価結果とリスクのある時間範囲
 */
export async function deepCheckVideo(
  transcription: string, 
  segments: Array<{ start: number, end: number, text: string }> = [], 
  context: string = ""
): Promise<RiskAssessment & { timeRanges: Array<{ start: number, end: number, issue: string }> }> {
  // 実際の実装では、Gemini APIに文字起こしとコンテキストを送信します
  // ここではモックデータを返します

  // 処理時間をシミュレート
  await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY.VIDEO));

  // 文字起こし全体のリスク評価
  const textAssessment = await deepCheckText(transcription, context);

  // 各セグメントのリスク評価
  const timeRanges: Array<{ start: number, end: number, issue: string }> = [];

  if (segments && segments.length > 0) {
    for (const segment of segments) {
      // 各セグメントのテキストを評価
      const segmentAssessment = await deepCheckText(segment.text);

      // 中リスク以上の問題があれば時間範囲を記録
      if (segmentAssessment.riskLevel !== RiskLevel.LOW && segmentAssessment.issues.length > 0 && 
          segmentAssessment.issues[0] !== "特に問題は見つかりませんでした") {
        timeRanges.push({
          start: segment.start,
          end: segment.end,
          issue: segmentAssessment.issues[0]
        });
      }
    }
  }

  return {
    ...textAssessment,
    timeRanges
  };
}

/**
 * 検出された問題に基づいて改善提案を生成します
 * @param {string[]} issues - 検出された問題のリスト
 * @param {RiskLevel} riskLevel - リスクレベル
 * @returns {string[]} 改善提案のリスト
 */
function generateSuggestions(issues: string[], riskLevel: RiskLevel): string[] {
  const suggestions: string[] = [];

  // 問題ごとの提案を生成
  issues.forEach(issue => {
    if (issue.includes("バカ") || issue.includes("アホ") || issue.includes("馬鹿")) {
      suggestions.push("侮辱的な表現は避け、より丁寧な言葉で意見を述べることをお勧めします");
    } else if (issue.includes("クソ")) {
      suggestions.push("強い否定的表現は炎上リスクが高いため、より穏やかな表現に変更してください");
    } else if (issue.includes("死ね")) {
      suggestions.push("他者を傷つける可能性のある過激な表現は絶対に避けてください");
    } else if (issue.includes("うざい") || issue.includes("最悪") || issue.includes("嫌い") || issue.includes("勘違い")) {
      suggestions.push("ネガティブな感情表現は、より客観的な表現に変更することをお勧めします");
    } else if (issue.includes("著作権")) {
      suggestions.push("著作権で保護されたコンテンツを使用する場合は、適切な許可を得るか、フリー素材を使用してください");
    } else if (issue.includes("個人情報")) {
      suggestions.push("画像内の個人情報（住所、電話番号など）にはモザイク処理を施してください");
    } else if (issue.includes("不適切なコンテンツ")) {
      suggestions.push("不適切なコンテンツを含む画像は投稿を控えるか、別の画像に変更してください");
    } else if (issue.includes("炎上リスク")) {
      suggestions.push("過去の投稿との関連性を考慮し、より慎重な表現を心がけてください");
    }
  });

  // リスクレベルに応じた全体的な提案を追加
  if (riskLevel === RiskLevel.HIGH) {
    suggestions.push(DEFAULT_MESSAGE.HIGH_RISK);
  } else if (riskLevel === RiskLevel.MEDIUM) {
    suggestions.push(DEFAULT_MESSAGE.MEDIUM_RISK);
  }

  // 提案がない場合のデフォルト提案
  if (suggestions.length === 0) {
    suggestions.push(DEFAULT_MESSAGE.DEFAULT_SUGGESTION);
  }

  return suggestions;
}
