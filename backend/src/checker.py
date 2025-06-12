import whisper
import google.generativeai as genai
import openai 
import os
import json 
import re 
import subprocess 
from dotenv import load_dotenv
# from acrcloud.recognizer import ACRCloudRecognizer, ACRCloudStatusCode 
# from .agent.graph import graph as research_agent_graph
from agent.graph import graph as research_agent_graph

# .envファイルから環境変数をロード
load_dotenv()

# Gemini APIの設定
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# OpenAI APIの設定
openai.api_key = os.getenv("OPENAI_API_KEY")
print(f"DEBUG: OpenAI APIキーが設定されていますか: {'はい' if openai.api_key else 'いいえ'}")
print(f"DEBUG: APIキーの先頭部分: {openai.api_key[:8] if openai.api_key else '未設定'}")

video_path = "backend/data/videos/test_video.mp4"
# # --- 動画からの文字起こし（Gemini API使用） ---
# def process_video_to_transcript_gemini(video_path: str) -> dict:
#     """
#     動画ファイルをGoogleのGemini APIでタイムスタンプ付きの文字起こしを生成する。

#     Args:
#         video_path (str): 動画ファイルのパス。

#     Returns:
#         dict: {
#             'segments': list[dict] - タイムスタンプ付きのセグメントデータ
#             'full_text': str - 会話全体の文字列
#         }
#     """
#     if not os.path.exists(video_path):
#         raise FileNotFoundError(f"動画ファイルが見つかりません: {video_path}")

#     print(f"DEBUG: Gemini APIで動画 '{video_path}' から文字起こしを生成します。")

#     try:
#         # Gemini APIの設定
#         model = genai.GenerativeModel('gemini-pro-vision')
        
#         # 動画ファイルを読み込む
#         with open(video_path, "rb") as video_file:
#             video_data = video_file.read()
        
#         # プロンプトの設定
#         prompt = """
#         この動画の音声を文字起こししてください。
#         以下の形式でJSONを出力してください：
#         {
#             "segments": [
#                 {
#                     "start": 開始時間（秒）,
#                     "end": 終了時間（秒）,
#                     "text": "文字起こしテキスト"
#                 }
#             ]
#         }
#         時間は秒単位で、小数点以下2桁まで指定してください。
#         """

#         # Gemini APIで文字起こしを実行
#         response = model.generate_content([prompt, video_data])
#         response_text = response.text.strip()
        
#         # JSONレスポンスをパース
#         transcript_data = json.loads(response_text)
        
#         # 結果を整形
#         formatted_segments = []
#         full_text = ""
        
#         for segment in transcript_data['segments']:
#             formatted_segments.append({
#                 'start': segment['start'],
#                 'end': segment['end'],
#                 'text': segment['text'].strip(),
#                 'words': []  # Gemini APIでは単語レベルのタイムスタンプは取得できない
#             })
#             full_text += segment['text'].strip() + " "
        
#         full_text = full_text.strip()
        
#         print(f"DEBUG: Gemini APIによる文字起こしが完了しました。")
#         print(f"  検出されたセグメント数: {len(formatted_segments)}")
#         print(f"  全体の文字数: {len(full_text)}")
        
#         # デバッグ用に最初のセグメントの詳細を表示
#         if formatted_segments:
#             print(f"DEBUG: 最初のセグメントの詳細:")
#             print(f"  テキスト: {formatted_segments[0]['text']}")
#             print(f"  時間: {formatted_segments[0]['start']:.2f} - {formatted_segments[0]['end']:.2f}")
        
#         return {
#             'segments': formatted_segments,
#             'full_text': full_text
#         }

#     except Exception as e:
#         print(f"ERROR: Gemini APIによる文字起こし中にエラーが発生しました: {e}")
#         return {
#             'segments': [],
#             'full_text': ""
#         }
# # print(process_video_to_transcript_gemini(video_path))

# --- 動画からの文字起こし ---
def process_video_to_transcript(video_path: str) -> dict:
    """
    動画ファイルをOpenAIのWhisper APIでタイムスタンプ付きの文字起こしを生成する。

    Args:
        video_path (str): 動画ファイルのパス。

    Returns:
        dict: {
            'segments': list[dict] - タイムスタンプ付きのセグメントデータ
            'full_text': str - 会話全体の文字列
        }
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"動画ファイルが見つかりません: {video_path}")

    print(f"DEBUG: 動画 '{video_path}' から文字起こしを生成します。")

    try:
        # OpenAIクライアントの初期化
        client = openai.OpenAI()
        
        # OpenAIのWhisper APIを使用して文字起こし
        with open(video_path, "rb") as video_file:
            transcript = client.audio.transcriptions.create(
                model="gpt-4o-transcribe",
                file=video_file,
                response_format="json",
                language="ja"
            )

        # 結果を整形
        formatted_segments = []
        full_text = transcript.text if hasattr(transcript, 'text') else ""

        # セグメント情報がない場合は、全体を1つのセグメントとして扱う
        if not hasattr(transcript, 'segments'):
            formatted_segments.append({
                'start': 0.0,
                'end': 0.0,  # 正確な時間は不明
                'text': full_text,
                'words': []
            })
        else:
            for segment in transcript.segments:
                words_with_timestamps = []
                if hasattr(segment, 'words'):
                    for word in segment.words:
                        words_with_timestamps.append({
                            'word': word.word,
                            'start': word.start,
                            'end': word.end
                        })
                
                segment_text = segment.text.strip()
                formatted_segments.append({
                    'start': segment.start,
                    'end': segment.end,
                    'text': segment_text,
                    'words': words_with_timestamps
                })
        
        print(f"DEBUG: 文字起こしが完了しました。")
        print(f"  全体の文字数: {len(full_text)}")
        
        # デバッグ用に最初のセグメントの詳細を表示
        if formatted_segments:
            print(f"DEBUG: 最初のセグメントの詳細:")
            print(f"  テキスト: {formatted_segments[0]['text']}")
            if formatted_segments[0]['start'] != 0.0 or formatted_segments[0]['end'] != 0.0:
                print(f"  時間: {formatted_segments[0]['start']:.2f} - {formatted_segments[0]['end']:.2f}")
            if formatted_segments[0]['words']:
                print("  単語レベルのタイムスタンプ:")
                for word in formatted_segments[0]['words']:
                    print(f"    {word['word']}: {word['start']:.2f} - {word['end']:.2f}")
        
        return {
            'segments': formatted_segments,
            'full_text': full_text
        }

    except Exception as e:
        print(f"ERROR: Whisper APIによる文字起こし中にエラーが発生しました: {e}")
        return {
            'segments': [],
            'full_text': ""
        }
print(process_video_to_transcript(video_path))

# print(process_video_to_transcript(video_path))
# --- プレーンテキスト抽出 ---
def extract_plain_text(transcripts: list[dict]) -> str:
    """
    タイムスタンプ付き文字起こしデータからプレーンテキストを抽出する。

    Args:
        transcripts (list[dict]): タイムスタンプ（'start', 'end'）とテキスト（'text'）を含む辞書のリスト。

    Returns:
        str: 結合されたプレーンテキスト。
    """
    if not transcripts:
        print("DEBUG: 文字起こしデータが空のため、空の文字列を返します。")
        return ""
        
    plain_text = " ".join([segment['text'] for segment in transcripts])
    return plain_text

# # --- 3. Geminiによる深掘り分析 ---
# def analyze_with_gemini_deep_research(text: str) -> dict:
#     """
#     Geminiを利用してテキスト内容を深掘りし、コンプライアンス関連情報を抽出する。

#     Args:
#         text (str): 文字起こしされたテキスト。

#     Returns:
#         dict: 深掘りされた分析結果。事故の種類、内容、関係者、潜在的なリスクなど。
#     """
#     api_key = os.getenv("GOOGLE_API_KEY")
#     if not api_key:
#         raise ValueError("GOOGLE_API_KEY 環境変数が設定されていません。Gemini APIを利用できません。")

#     genai.configure(api_key=api_key)
#     model = genai.GenerativeModel('gemini-pro')

#     print(f"DEBUG: Geminiで以下のテキストを深掘り分析します:\n'{text[:200]}...'")

#     prompt = f"""
#     以下の会議録テキストを分析し、**コンプライアンス違反の可能性がある箇所や、
#     **組織にとってのリスク**につながる可能性のある情報（例：不適切発言、情報漏洩示唆、不正行為の兆候など）を深掘りしてください。
    
#     分析結果は、以下のJSON形式で出力してください。

#     {{
#         "potential_issue": "検出された主な問題点やリスクの概要 (例: 不適切発言による情報漏洩リスク)",
#         "incident_category": "関連するコンプライアンス分野 (例: 情報セキュリティ, ハラスメント, 財務報告, 贈収賄, 労働法など)",
#         "keywords": ["関連するキーワード1", "関連するキーワード2", ...],
#         "gemini_summary": "検出された問題点の具体的な内容と、その背景、潜在的な影響の要約",
#         "gemini_risk_assessment": "Geminiによるリスク評価 ('低', '中', '高' のいずれか)",
#         "relevant_text_snippet": "問題がある可能性のある原文の一部 (最大200文字程度)"
#     }}

#     会議録テキスト:
#     {text}
#     """

#     try:
#         response = model.generate_content(prompt)
#         response_text = response.text.strip()
#         analysis_result = json.loads(response_text)
        
#         print(f"DEBUG: Geminiによる分析が完了しました。リスク評価: {analysis_result.get('gemini_risk_assessment')}")
#         return analysis_result

#     except Exception as e:
#         print(f"ERROR: Geminiによる深掘り分析中にエラーが発生しました: {e}")
#         print(f"DEBUG: Geminiの生レスポンス (エラー時): {response.text if 'response' in locals() else 'N/A'}")
#         return {
#             'potential_issue': '分析エラーまたは関連情報なし',
#             'incident_category': '不明',
#             'keywords': [],
#             'gemini_summary': 'Geminiによる分析中にエラーが発生しました。',
#             'gemini_risk_assessment': '不明',
#             'relevant_text_snippet': text[:200]
#         }

# --- 3. Geminiによる深掘り分析 (LangGraph エージェントの呼び出しに置き換え) ---
def analyze_with_gemini_deep_research(speaker_info: dict = None) -> dict:
    """
    LangGraph エージェントを用いてテキスト内容を深掘りし、コンプライアンス関連情報を抽出する。
    発言者情報があれば、エージェントがツールを用いて過去情報を検索し、分析に含める。

    Args:
        text (str): 文字起こしされたテキスト。
        speaker_info (dict, optional): 発言者/投稿者に関する情報。
                                       例: {'name': '田中', 'account_url': 'https://example.com/tanaka_x'}

    Returns:
        dict: 深掘りされた分析結果。事故の種類、内容、関係者、潜在的なリスクなど。
              `user_research_summary` フィールドに Deep Research の結果が含まれる。
    """
    print(f"DEBUG: LangGraph エージェントを用いて深掘り分析を開始します:")
    if speaker_info:
        print(f"DEBUG: 発言者情報が提供されました: {speaker_info}")

    # LangGraph エージェントへのプロンプトを構築
    # ここでのmessagesは、LangGraphエージェントが受け取る形式に合わせる
    # LangGraphのPrompts.pyに定義されているSystem PromptとHuman Promptを考慮
    
    # ユーザーがエージェントに何を調査してほしいかを明確に指示する
        # user_query = f"以下の会議録テキストからコンプライアンス違反の可能性とリスクを深く調査し、分析してください。もし発言者に関する情報があれば、その人物の公開されている過去のコンプライアンス関連情報もインターネットで検索し、分析に含めてください。特に、情報漏洩、ハラスメント、不正行為、不適切な発言など、組織にとってのリスクになりうる点を重点的に調べてください。"
        user_query = f"以下の情報から分析してください。もし発言者に関する情報があれば、その人物の公開されている過去のコンプライアンス関連情報もインターネットで検索し、分析に含めてください。特に、情報漏洩、ハラスメント、不正行為、不適切な発言など、組織にとってのリスクになりうる点を重点的に調べてください。"

    if speaker_info:
        user_query += f"\n\n発言者/投稿者情報: 名前: {speaker_info.get('name', '不明')}, アカウントURL: {speaker_info.get('account_url', 'なし')}"

    try:
        # LangGraph エージェントの実行
        # graph.py で定義された graph.invoke を使用
        # LangGraph のクイックスタートでは state に messages を渡している
        # initial_search_query_count や max_research_loops は configuration.py で設定されている
        result = research_agent_graph.invoke({
            "messages": [{"role": "human", "content": user_query}],
            # 他の初期設定があればここに追加 (例: initial_search_query_count, max_research_loops など)
            # これらは agent/configuration.py でデフォルト値が設定されていることが多い
            # "initial_search_query_count": 3,
            # "max_research_loops": 2,
            # "reasoning_model": "gemini-pro"
        })

        # LangGraph エージェントの最終出力から必要な情報を抽出
        final_message_content = ""
        if "messages" in result and result["messages"]:
            # 最後のメッセージがエージェントの最終的な回答と仮定
            last_message = result["messages"][-1]
            if hasattr(last_message, "type") and last_message.type == "ai" and hasattr(last_message, "content"):
                final_message_content = last_message.content
            elif hasattr(last_message, "content") and isinstance(last_message.content, list):
                # contentがリストの場合（例: ToolOutputなど）、テキスト部分を結合
                final_message_content = " ".join([
                    part.text for part in last_message.content if hasattr(part, "text")
                ])

        print(f"DEBUG: LangGraphエージェントの最終出力:\n{final_message_content[:500]}...")

        # 文字列形式のまま返す
        return {
            'potential_issue': 'LangGraph分析結果',
            'incident_category': '分析結果',
            'keywords': [],
            'gemini_summary': final_message_content,
            'gemini_risk_assessment': '要評価',
            'relevant_text_snippet': final_message_content[:200] if final_message_content else 'なし',
            'user_research_summary': final_message_content
        }

    except Exception as e:
        print(f"ERROR: LangGraph エージェントの実行中にエラーが発生しました: {e}")
        return {
            'potential_issue': 'LangGraph分析エラー',
            'incident_category': '不明',
            'keywords': [],
            'gemini_summary': f'LangGraphエージェントの実行中にエラーが発生しました: {e}',
            'gemini_risk_assessment': '不明',
            'user_research_summary': 'エージェントの調査中にエラーが発生しました。'
        }
    
#テスト用
# print(analyze_with_gemini_deep_research({
#     "name": "フワちゃん",
#     "account_url": "https://x.com/fuwa876"
# }))

# --- 4. 事故の時間・分野のクロスチェックとショートアノテーション ---
def cross_check_and_annotate_incident(
    gemini_analysis: dict, transcripts: list[dict]
) -> dict:
    """
    Geminiの分析結果と文字起こしデータから、事故の時刻と関連分野をクロスチェックしアノテーションを追加する。
    また、GPTでの文脈判断のために、関連するテキストとその前後数セグメントのテキストを抽出する。

    Args:
        gemini_analysis (dict): Geminiによる深掘り分析結果。
        transcripts (list[dict]): タイムスタンプ（'start', 'end'）とテキスト（'text'）を含む辞書のリスト。

    Returns:
        dict: 事故時刻、関連分野、ショートアノテーション、
              そしてGPTに渡すための関連コンテキストテキストを含む辞書。
    """
    print(f"DEBUG: 事故時刻と分野をクロスチェックし、GPT用コンテキストを準備します。")

    incident_timestamp_approx = "N/A"
    relevant_field = gemini_analysis.get('incident_category', '不明')
    short_annotation = gemini_analysis.get('gemini_summary', '詳細不明なコンプライアンス関連事象')
    context_for_gpt = ""

    analysis_keywords = gemini_analysis.get('keywords', [])
    relevant_snippet = gemini_analysis.get('relevant_text_snippet', '')

    best_match_segment_index = -1
    max_match_len = 0

    # `transcripts`がダミー（テキスト入力のみの場合）ではないか確認
    # text_inputのみの場合、transcriptsは [{'start': 0.0, 'end': 0.0, 'text': text_input}] のダミーが想定される
    is_dummy_transcript = (len(transcripts) == 1 and 
                           transcripts[0].get('start') == 0.0 and 
                           transcripts[0].get('end') == 0.0 and
                           len(transcripts[0].get('text', '')) > 0) # テキストが空でないことを確認

    if is_dummy_transcript:
        # テキスト入力のみの場合、全体のテキストがコンテキスト
        context_for_gpt = transcripts[0].get('text', '')
        incident_timestamp_approx = "不明" 
        if relevant_snippet:
            short_annotation = f"関連テキスト: '{relevant_snippet}'"
        else:
            short_annotation = gemini_analysis.get('gemini_summary', short_annotation)
    else:
        # 動画からの文字起こしの場合（実際のタイムスタンプがある場合）
        for i, segment in enumerate(transcripts):
            segment_text = segment['text']
            # relevant_snippet が segment_text 内に含まれるか
            if relevant_snippet and relevant_snippet in segment_text:
                if len(relevant_snippet) > max_match_len:
                    max_match_len = len(relevant_snippet)
                    best_match_segment_index = i
            else:
                # キーワードに基づいて一致を試みる
                matched_keywords_count = sum(1 for kw in analysis_keywords if kw in segment_text)
                if matched_keywords_count > 0:
                    # 既存のベストマッチよりも多くのキーワードが一致するか、
                    # まだベストマッチがない場合に更新
                    if best_match_segment_index == -1 or \
                       (best_match_segment_index != -1 and matched_keywords_count > sum(1 for kw in analysis_keywords if kw in transcripts[best_match_segment_index]['text'])):
                        best_match_segment_index = i

        if best_match_segment_index != -1:
            best_match_segment = transcripts[best_match_segment_index]
            start_time = best_match_segment['start']
            end_time = best_match_segment['end']
            incident_timestamp_approx = f"{int(start_time // 60)}:{int(start_time % 60):02d} - {int(end_time // 60)}:{int(end_time % 60):02d}"
            
            if relevant_snippet:
                short_annotation = f"関連テキスト: '{relevant_snippet}'"
            elif gemini_analysis.get('gemini_summary'):
                short_annotation = gemini_analysis['gemini_summary']
            else:
                short_annotation = f"キーワード: {', '.join(analysis_keywords)} に基づく事象"

            context_window_segments = 3
            start_index = max(0, best_match_segment_index - context_window_segments)
            end_index = min(len(transcripts), best_match_segment_index + context_window_segments + 1)

            context_segments = transcripts[start_index:end_index]
            context_for_gpt = "\n".join([f"({s['start']:.2f}-{s['end']:.2f}) {s['text'].strip()}" for s in context_segments])
            
            print(f"DEBUG: GPT用コンテキストを生成しました (長さ: {len(context_for_gpt)}文字)")
        else:
            # タイムスタンプ付き文字起こしだが、関連するセグメントが見つからなかった場合
            context_for_gpt = extract_plain_text(transcripts) # 全体を渡す
            incident_timestamp_approx = "N/A (関連セグメントなし)"


    return {
        'incident_timestamp_approx': incident_timestamp_approx,
        'relevant_field': relevant_field,
        'short_annotation': short_annotation,
        'context_for_gpt': context_for_gpt 
    }

# --- 5. GPTによる前後の文脈判断 ---
def judge_context_with_gpt(
    context_text: str,          # 全テキストではなく、関連する文脈テキストを受け取る
    incident_timestamp_approx: str,
    relevant_field: str
) -> dict:
    """
    GPTを利用して、特定された発言の前後の文脈を判断し、意図やニュアンスを評価する。

    Args:
        context_text (str): 問題のある発言を含む、関連する前後の文脈テキスト。
        incident_timestamp_approx (str): 事故のおおよそのタイムスタンプ範囲。
        relevant_field (str): 関連する分野。

    Returns:
        dict: 文脈判断の結果。意図、ニュアンス、追加のリスク評価など。
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY 環境変数が設定されていません。GPT APIを利用できません。")

    openai.api_key = api_key

    print(f"DEBUG: GPTで文脈を判断します。対象タイムスタンプ: {incident_timestamp_approx}, 分野: {relevant_field}")
    print(f"DEBUG: 分析対象のコンテキストテキスト:\n'{context_text[:200]}...'")

    prompt = f"""
    以下のテキストは、会議録の一部で、タイムスタンプ'{incident_timestamp_approx}'付近に'{relevant_field}'に関する潜在的な問題発言が含まれている可能性があります。

    このテキストを分析し、問題とされている発言の**意図（皮肉、冗談、真剣さ、質問、事実報告など）**を判断してください。
    
    また、その発言がコンプライアンス違反の可能性をどの程度高めるか、または軽減するかを評価し、文脈から判断される追加のリスク要因や軽減要因があれば指摘してください。

    分析結果は、以下のJSON形式で出力してください。

    {{
        "contextual_intent": "発言の意図とニュアンスの具体的な説明 (例: 真剣な情報伝達、皮肉めいた発言、軽い冗談など)",
        "gpt_context_assessment": "文脈を踏まえた上でのコンプライアンスリスクへの影響評価 (例: リスクを増幅させる、リスクを軽減する、影響なしなど)",
        "gpt_additional_risk_factor": "文脈から判断される追加のリスク要因（例: 隠蔽の意図、繰り返し発言など）または軽減要因（例: 直後に謝罪があった、誤解と判明したなど） (該当しない場合は 'なし')",
        "gpt_risk_modifier": "最終的なリスク修正の度合い ('増幅', '軽減', 'なし' のいずれか)"
    }}

    関連するコンテキストテキスト:
    {context_text}
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは会議録からコンプライアンスリスクを評価する専門家です。提供された文脈に基づいて、発言の意図を正確に判断してください。"},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        response_content = response.choices[0].message.content
        context_judgement_result = json.loads(response_content)
        
        print(f"DEBUG: GPTによる文脈判断が完了しました。意図: {context_judgement_result.get('contextual_intent')}")
        return context_judgement_result

    except openai.APIError as e:
        print(f"ERROR: OpenAI APIエラーが発生しました: {e}")
        return {
            'contextual_intent': 'APIエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし'
        }
    except json.JSONDecodeError as e:
        print(f"ERROR: GPTからのレスポンスが有効なJSONではありません: {e}")
        print(f"DEBUG: GPT生レスポンス (JSONエラー時): {response_content if 'response_content' in locals() else 'N/A'}")
        return {
            'contextual_intent': 'JSONパースエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし'
        }
    except Exception as e:
        print(f"ERROR: GPTによる文脈判断中に予期せぬエラーが発生しました: {e}")
        return {
            'contextual_intent': '予期せぬエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし'
        }

# --- 6. 音声抽出ヘルパー関数 ---
def extract_audio_from_video(video_path: str, output_audio_path: str) -> bool:
    """
    動画ファイルから音声を抽出し、指定されたパスに保存する。
    ffmpegがシステムにインストールされている必要があります。

    Args:
        video_path (str): 入力動画ファイルのパス
        output_audio_path (str): 出力音声ファイルのパス

    Returns:
        bool: 音声抽出が成功したかどうか
    """
    try:
        command = [
            'ffmpeg', '-y',  # 既存ファイルを上書き
            '-i', video_path,
            '-q:a', '0',     # 音質を高く設定 (VBR, high quality)
            '-map', 'a',     # 音声ストリームのみを抽出
            output_audio_path
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(f"DEBUG: 音声を '{output_audio_path}' に抽出しました。")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: 音声抽出中にエラーが発生しました: {e}")
        print(f"ERROR: コマンドエラー出力:\n{e.stderr}")
        return False
    except FileNotFoundError:
        print("ERROR: 'ffmpeg' コマンドが見つかりません。ffmpegがインストールされ、PATHが通っているか確認してください。")
        return False
    except Exception as e:
        print(f"ERROR: 予期せぬ音声抽出エラーが発生しました: {e}")
        return False

# --- 7. 著作権のある音楽検出（ACRCloud利用） ---
def detect_copyrighted_music_from_audio(audio_path: str) -> dict:
    """
    音声ファイルから著作権のある音楽を検出する。
    ACRCloud APIを呼び出す具体的な実装例。
    """
    print(f"DEBUG: 音声ファイル '{audio_path}' から著作権のある音楽を検出します（ACRCloud利用）。")

    acrcloud_host = os.getenv("ACRCLOUD_HOST")
    acrcloud_access_key = os.getenv("ACRCLOUD_ACCESS_KEY")
    acrcloud_access_secret = os.getenv("ACRCLOUD_ACCESS_SECRET")

    if not all([acrcloud_host, acrcloud_access_key, acrcloud_access_secret]):
        print("ERROR: ACRCloud APIキー（ACRCLOUD_HOST, ACRCLOUD_ACCESS_KEY, ACRCLOUD_ACCESS_SECRET）が設定されていません。音楽検出をスキップします。")
        return {
            'detected': False, 'title': None, 'artist': None,
            'start_time': None, 'end_time': None, 'is_copyrighted': False,
            'error': 'ACRCloud API keys not configured.'
        }

    config = {
        'host': acrcloud_host,
        'access_key': acrcloud_access_key,
        'access_secret': acrcloud_access_secret,
        'timeout': 10 # タイムアウト秒数
    }
    re = ACRCloudRecognizer(config)

    try:
        result_json_str = re.recognize_by_file(audio_path, 0)
        result = json.loads(result_json_str)
        print(f"DEBUG: ACRCloudレスポンス: {json.dumps(result, indent=2)}")

        if result.get('status', {}).get('code') == ACRCloudStatusCode.SUCCESS:
            if 'metadata' in result and 'music' in result['metadata'] and len(result['metadata']['music']) > 0:
                music_info = result['metadata']['music'][0]
                is_copyrighted = True # 検出されたら著作権ありと仮定

                return {
                    'detected': True,
                    'title': music_info.get('title'),
                    'artist': ', '.join([art.get('name') for art in music_info.get('artists', [])]),
                    'album': music_info.get('album', {}).get('name'),
                    'genres': ', '.join([g.get('name') for g in music_info.get('genres', [])]) if music_info.get('genres') else None,
                    'start_time': music_info.get('play_offset_ms', 0) / 1000.0,
                    'end_time': (music_info.get('play_offset_ms', 0) + music_info.get('duration_ms', 0)) / 1000.0,
                    'is_copyrighted': is_copyrighted,
                    'detection_method': 'ACRCloud'
                }
            else:
                print("DEBUG: ACRCloud: 音楽は検出されませんでした。")
                return {
                    'detected': False, 'title': None, 'artist': None,
                    'start_time': None, 'end_time': None, 'is_copyrighted': False,
                    'detection_method': 'ACRCloud'
                }
        else:
            status_msg = result.get('status', {}).get('msg', 'Unknown status message')
            print(f"ERROR: ACRCloud認識エラー: Code={result.get('status', {}).get('code')}, Message={status_msg}")
            return {
                'detected': False, 'title': None, 'artist': None,
                'start_time': None, 'end_time': None, 'is_copyrighted': False,
                'error': f'ACRCloud recognition failed: {status_msg}'
            }

    except FileNotFoundError:
        print(f"ERROR: 音声ファイル '{audio_path}' が見つかりません。")
        return {
            'detected': False, 'title': None, 'artist': None,
            'start_time': None, 'end_time': None, 'is_copyrighted': False,
            'error': 'Audio file not found.'
        }
    except json.JSONDecodeError as e:
        print(f"ERROR: ACRCloudからのレスポンスのJSONパースに失敗しました: {e}")
        return {
            'detected': False, 'title': None, 'artist': None,
            'start_time': None, 'end_time': None, 'is_copyrighted': False,
            'error': 'Failed to parse ACRCloud response JSON.'
        }
    except Exception as e:
        print(f"ERROR: ACRCloud認識中に予期せぬエラーが発生しました: {e}")
        return {
            'detected': False, 'title': None, 'artist': None,
            'start_time': None, 'end_time': None, 'is_copyrighted': False,
            'error': f'Unexpected ACRCloud error: {e}'
        }

# --- 8. 単一ソースからのアラート生成 ---
def generate_alert(
    gemini_analysis: dict,
    incident_details: dict,
    gpt_context_judgement: dict,
    transcripts: list[dict],
    music_detection_result: dict = None,
    source_type: str = "video" # source_type を追加
) -> dict:
    """
    全ての分析結果を統合し、コンプライアンスアラートを生成する。

    Args:
        gemini_analysis (dict): Geminiによる深掘り分析結果。
        incident_details (dict): 事故時刻と関連分野の詳細。
        gpt_context_judgement (dict): GPTによる文脈判断結果。
        transcripts (list[dict]): タイムスタンプ付き文字起こしデータ。
        music_detection_result (dict, optional): 著作権音楽検出の結果。
        source_type (str): このアラートが「video」または「text_input」のどちらのソースから生成されたか。

    Returns:
        dict: アラートレベル（重・中・予）、理由、関連タイムスタンプを含む辞書。
    """
    alert_level = "予"
    reasons = []
    
    # 暫定のタイムスタンプとテキストを設定
    alert_timestamp = incident_details.get('incident_timestamp_approx', '不明')
    original_text_segment = '該当テキストなし'

    # --- original_text_segment の設定ロジック ---
    if source_type == "text_input":
        # テキスト入力のみの場合、transcriptsはダミーで、text_inputそのものがオリジナルテキスト
        # `cross_check_and_annotate_incident` で `context_for_gpt` に格納されたものが望ましい
        original_text_segment = incident_details.get('context_for_gpt', 'N/A')
        # テキスト入力の場合、タイムスタンプは通常不明
        alert_timestamp = "不明" # 明示的に不明にする
    elif source_type == "video":
        # 動画の場合、タイムスタンプに基づいて正確なテキストを抽出
        if ' - ' in alert_timestamp and alert_timestamp != '不明':
            try:
                start_m, start_s = map(int, alert_timestamp.split(' - ')[0].split(':'))
                end_m, end_s = map(int, alert_timestamp.split(' - ')[1].split(':'))
                start_sec_float = float(start_m * 60 + start_s)
                end_sec_float = float(end_m * 60 + end_s)
                
                for s in transcripts:
                    if max(s['start'], start_sec_float) < min(s['end'], end_sec_float):
                        original_text_segment = s['text']
                        break
            except ValueError:
                pass # タイムスタンプ解析エラーの場合はデフォルト値のまま
    # --- original_text_segment の設定ロジックここまで ---

    print(f"DEBUG: generate_alert (Source: {source_type}): アラートを生成します。現在のレベル: {alert_level}")

    # --- 1. 著作権のある音楽が検出された場合の判断（最優先） ---
    # 音楽検出は動画ソースにのみ適用されるため、source_type == "video" で確認
    if source_type == "video" and music_detection_result and music_detection_result.get('detected') and music_detection_result.get('is_copyrighted'):
        alert_level = "重"
        reasons.append(
            f"**著作権違反の音楽検出**: 著作権保護された音楽 '{music_detection_result.get('title', '不明')}' "
            f"by '{music_detection_result.get('artist', '不明')}' が検出されました。"
        )
        # 音楽検出のタイムスタンプを優先的に採用
        if music_detection_result.get('start_time') is not None and music_detection_result.get('end_time') is not None:
             alert_timestamp = (
                 f"{int(music_detection_result['start_time'] // 60)}:{int(music_detection_result['start_time'] % 60):02d} - "
                 f"{int(music_detection_result['end_time'] // 60)}:{int(music_detection_result['end_time'] % 60):02d}"
             )
        original_text_segment = "動画内の音楽部分（文字起こしなし）" # 音楽なのでテキストはなし

    # --- 2. Geminiの初期評価に基づく判断 ---
    current_level_before_gemini = alert_level 
    if gemini_analysis.get('gemini_risk_assessment') == '高':
        if alert_level != "重":
            alert_level = "重"
        reasons.append(f"**Gemini初期評価**: 重大なコンプライアンスリスクが検出されました。理由: {gemini_analysis.get('gemini_summary', '不明')}")
    elif gemini_analysis.get('gemini_risk_assessment') == '中':
        if alert_level == "予":
            alert_level = "中"
        elif alert_level != "重":
            reasons.append(f"**Gemini初期評価**: 中程度のコンプライアンスリスクが検出されました。理由: {gemini_analysis.get('gemini_summary', '不明')}")
    
    # --- 3. GPTによる文脈判断に基づく調整 ---
    gpt_risk_modifier = gpt_context_judgement.get('gpt_risk_modifier', 'なし')
    contextual_intent = gpt_context_judgement.get('contextual_intent', '')
    gpt_additional_risk_factor = gpt_context_judgement.get('gpt_additional_risk_factor', '')

    if gpt_risk_modifier == '増幅':
        if alert_level == "予":
            alert_level = "中"
            reasons.append(f"**文脈評価（GPT）**: 発言の意図がリスクを増幅させると判断されました。意図: {contextual_intent}")
        elif alert_level == "中":
            alert_level = "重"
            reasons.append(f"**文脈評価（GPT）**: 発言の意図がリスクをさらに増幅させると判断されました。意図: {contextual_intent}")
        if gpt_additional_risk_factor and gpt_additional_risk_factor != 'なし':
            reasons.append(f"追加のリスク要因: {gpt_additional_risk_factor}")
    elif gpt_risk_modifier == '軽減':
        if alert_level == "重":
            alert_level = "中"
            reasons.append(f"**文脈評価（GPT）**: 発言が皮肉や誤解の可能性があり、アラートレベルを調整しました。要詳細確認。意図: {contextual_intent}")
        elif alert_level == "中":
            alert_level = "予"
            reasons.append(f"**文脈評価（GPT）**: 発言が皮肉や誤解の可能性があり、アラートレベルを調整しました。要詳細確認。意図: {contextual_intent}")
        if gpt_additional_risk_factor and gpt_additional_risk_factor != 'なし':
            reasons.append(f"軽減要因: {gpt_additional_risk_factor}")
    else:
        if contextual_intent and "真剣な情報伝達" in contextual_intent:
            if alert_level == "予":
                alert_level = "中"
                reasons.append(f"**文脈評価（GPT）**: 発言が真剣な情報伝達であると確認されました。")
            elif alert_level == "中" and "深刻な" in gpt_context_judgement.get('gpt_context_assessment', ''):
                alert_level = "重"
                reasons.append(f"**文脈評価（GPT）**: 文脈からより深刻なリスクが示唆されました。")

    # --- 4. incident_details / accident_time / field からの直接的なアラート条件 ---
    if incident_details.get('relevant_field') == '情報セキュリティ・個人情報保護':
        if any(kw in gemini_analysis.get('keywords', []) for kw in ['顧客情報漏洩', '不適切発言', '個人情報流出']):
            if alert_level != "重":
                alert_level = "重"
            reasons.append(f"**特定条件一致**: 関連分野「{incident_details.get('relevant_field')}」で「顧客情報漏洩」または「不適切発言」が検出されたため、重大なコンプライアンス違反の可能性。")
    
    final_reason = " ".join(reasons) if reasons else "特段の懸念事項は見られませんでした。"
    
    # タイムスタンプは、音楽検出が最優先、次にincident_details、最後にテキスト入力の場合は不明
    if alert_timestamp == '不明' and incident_details.get('incident_timestamp_approx') != 'N/A':
        alert_timestamp = incident_details.get('incident_timestamp_approx', '不明')
    
    return {
        'level': alert_level,
        'reason': final_reason,
        'timestamp': alert_timestamp,
        'original_text_segment': original_text_segment
    }

# --- 9. アラートレベルの優先度を定義するヘルパー関数 ---
def get_alert_level_priority(level: str) -> int:
    if level == "重": return 3
    if level == "中": return 2
    if level == "予": return 1
    return 0 # 不明など

# --- 10. 複数ソースからのアラート統合 ---
def integrate_multi_source_alerts(video_result: dict = None, text_result: dict = None) -> dict:
    """
    動画由来とテキスト由来のアラート結果を統合し、最終的なコンプライアンスアラートを生成する。
    """
    final_alert_level = "予"
    final_reasons = []
    final_timestamp = "不明"
    final_original_text_segment = "N/A" # 最終的に最も関連性の高いテキストを保持

    # 動画由来のアラートを処理
    if video_result:
        video_specific_alert = generate_alert(
            video_result['gemini_analysis'],
            video_result['incident_details'],
            video_result['gpt_context_judgement'],
            video_result['transcripts'],
            video_result['music_detection_result'],
            source_type="video" # source_type を追加
        )
        # 動画由来のアラートレベルと理由を統合
        if get_alert_level_priority(video_specific_alert['level']) > get_alert_level_priority(final_alert_level):
            final_alert_level = video_specific_alert['level']
        final_reasons.append(f"[動画分析]: {video_specific_alert['reason']}")
        
        # タイムスタンプとテキストセグメントは動画が優先される
        if video_specific_alert['timestamp'] != '不明':
            final_timestamp = video_specific_alert['timestamp']
        if video_specific_alert['original_text_segment'] != '該当テキストなし':
            final_original_text_segment = video_specific_alert['original_text_segment']

    # テキスト由来のアラートを処理
    if text_result:
        text_specific_alert = generate_alert(
            text_result['gemini_analysis'],
            text_result['incident_details'],
            text_result['gpt_context_judgement'],
            text_result['transcripts'], # ダミーのtranscript
            text_result['music_detection_result'], # None
            source_type="text_input" # source_type を追加
        )
        # テキスト由来のアラートレベルと理由を統合
        if get_alert_level_priority(text_specific_alert['level']) > get_alert_level_priority(final_alert_level):
            final_alert_level = text_specific_alert['level']
        final_reasons.append(f"[テキスト分析]: {text_specific_alert['reason']}")
        
        # テキスト由来のタイムスタンプは通常「不明」だが、もし特定できれば、動画のタイムスタンプがなければ採用
        if text_specific_alert['timestamp'] != '不明' and final_timestamp == '不明':
             final_timestamp = text_specific_alert['timestamp']
        # テキスト由来のオリジナルテキストセグメントも、動画のものがなければ採用
        if text_specific_alert['original_text_segment'] != '該当テキストなし' and final_original_text_segment == 'N/A':
            final_original_text_segment = text_specific_alert['original_text_segment']

    return {
        'level': final_alert_level,
        'reason': " ".join(final_reasons),
        'timestamp': final_timestamp,
        'original_text_segment': final_original_text_segment
    }


# --- 11. エージェントの実行エントリポイント ---
def run_compliance_agent(text_input: str = None, video_path: str = None) -> dict:
    """
    コンプライアンス判定AIエージェントの全処理を実行する。
    テキストのみ、または動画パスを指定して実行可能。
    """
    video_alert_data = None
    text_alert_data = None

    # --- 入力タイプの判定と初期処理 ---
    if video_path and text_input:
        print("WARNING: 動画パスとテキスト入力の両方が指定されました。両方を分析し、結果を統合します。")
        
        # 動画処理パス
        transcripts_with_timestamps_video = process_video_to_transcript(video_path)
        plain_text_from_video = extract_plain_text(transcripts_with_timestamps_video['segments'])
        music_detection_result = None
        audio_output_path = "temp_audio_for_music_detection.mp3"
        audio_extracted = extract_audio_from_video(video_path, audio_output_path)
        if audio_extracted:
            music_detection_result = detect_copyrighted_music_from_audio(audio_output_path)
            os.remove(audio_output_path)
        else:
            print("WARNING: 音声抽出に失敗したため、著作権音楽検出はスキップされます。")
        gemini_analysis_video = analyze_with_gemini_deep_research(plain_text_from_video)
        incident_details_video = cross_check_and_annotate_incident(gemini_analysis_video, transcripts_with_timestamps_video['segments'])
        gpt_context_judgement_video = judge_context_with_gpt(
            incident_details_video.get('context_for_gpt', plain_text_from_video),
            incident_details_video.get('incident_timestamp_approx', ''),
            incident_details_video.get('relevant_field', '')
        )
        video_alert_data = {
            'gemini_analysis': gemini_analysis_video,
            'incident_details': incident_details_video,
            'gpt_context_judgement': gpt_context_judgement_video,
            'transcripts': transcripts_with_timestamps_video['segments'],
            'music_detection_result': music_detection_result
        }

        # テキスト処理パス
        plain_text_from_input = text_input
        dummy_transcripts_for_text = [{"start": 0.0, "end": 0.0, "text": text_input}]
        gemini_analysis_text = analyze_with_gemini_deep_research(plain_text_from_input)
        incident_details_text = cross_check_and_annotate_incident(gemini_analysis_text, dummy_transcripts_for_text)
        gpt_context_judgement_text = judge_context_with_gpt(
            incident_details_text.get('context_for_gpt', plain_text_from_input),
            incident_details_text.get('incident_timestamp_approx', ''),
            incident_details_text.get('relevant_field', '')
        )
        text_alert_data = {
            'gemini_analysis': gemini_analysis_text,
            'incident_details': incident_details_text,
            'gpt_context_judgement': gpt_context_judgement_text,
            'transcripts': dummy_transcripts_for_text,
            'music_detection_result': None # テキスト入力の場合は音楽検出なし
        }

    elif video_path:
        print(f"DEBUG: 動画パス '{video_path}' を入力として処理を開始します。")
        transcripts_with_timestamps = process_video_to_transcript(video_path)
        plain_text = extract_plain_text(transcripts_with_timestamps['segments'])
        music_detection_result = None
        audio_output_path = "temp_audio_for_music_detection.mp3"
        audio_extracted = extract_audio_from_video(video_path, audio_output_path)
        if audio_extracted:
            music_detection_result = detect_copyrighted_music_from_audio(audio_output_path)
            os.remove(audio_output_path)
        else:
            print("WARNING: 音声抽出に失敗したため、著作権音楽検出はスキップされます。")
        gemini_analysis = analyze_with_gemini_deep_research(plain_text)
        incident_details = cross_check_and_annotate_incident(gemini_analysis, transcripts_with_timestamps['segments'])
        gpt_context_judgement = judge_context_with_gpt(
            incident_details.get('context_for_gpt', plain_text),
            incident_details.get('incident_timestamp_approx', ''),
            incident_details.get('relevant_field', '')
        )
        video_alert_data = {
            'gemini_analysis': gemini_analysis,
            'incident_details': incident_details,
            'gpt_context_judgement': gpt_context_judgement,
            'transcripts': transcripts_with_timestamps['segments'],
            'music_detection_result': music_detection_result
        }

    elif text_input:
        print(f"DEBUG: テキスト入力のみで処理を開始します。")
        plain_text = text_input
        dummy_transcripts_for_text = [{"start": 0.0, "end": 0.0, "text": text_input}]
        gemini_analysis = analyze_with_gemini_deep_research(plain_text)
        incident_details = cross_check_and_annotate_incident(gemini_analysis, dummy_transcripts_for_text)
        gpt_context_judgement = judge_context_with_gpt(
            incident_details.get('context_for_gpt', plain_text),
            incident_details.get('incident_timestamp_approx', ''),
            incident_details.get('relevant_field', '')
        )
        text_alert_data = {
            'gemini_analysis': gemini_analysis,
            'incident_details': incident_details,
            'gpt_context_judgement': gpt_context_judgement,
            'transcripts': dummy_transcripts_for_text,
            'music_detection_result': None # テキスト入力の場合は音楽検出なし
        }
    else:
        raise ValueError("テキスト入力または動画パスのいずれかを指定してください。")

    # --- 最終的なアラートの統合 ---
    final_alert = integrate_multi_source_alerts(video_alert_data, text_alert_data)
    return final_alert