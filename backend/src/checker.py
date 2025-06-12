import whisper
import google.generativeai as genaikey
from google import genai
import openai 
import os
import json 
import re 
import subprocess 
from dotenv import load_dotenv
# from acrcloud.recognizer import ACRCloudRecognizer, ACRCloudStatusCode 
# from .agent.graph import graph as research_agent_graph
from agent.graph import graph as research_agent_graph
import time

# .envファイルから環境変数をロード
load_dotenv()

# Gemini APIの設定
genaikey.configure(api_key=os.getenv("GEMINI_API_KEY"))

# OpenAI APIの設定
openai.api_key = os.getenv("OPENAI_API_KEY")
print(f"DEBUG: OpenAI APIキーが設定されていますか: {'はい' if openai.api_key else 'いいえ'}")
print(f"DEBUG: APIキーの先頭部分: {openai.api_key[:8] if openai.api_key else '未設定'}")

# 絶対パスを使用してファイルパスを解決（hack01の重複を避ける）
video_path = os.path.abspath("backend/data/videos/test_video.mp4")

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
                model="whisper-1",  # モデル名を修正
                file=video_file,
                response_format="verbose_json",  # レスポンスフォーマットを変更
                language="ja",
                timestamp_granularities=["segment", "word"]  # タイムスタンプの粒度を指定
            )

        # 結果を整形
        formatted_segments = []
        full_text = ""

        # セグメント情報の処理
        if hasattr(transcript, 'segments'):
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
                full_text += segment_text + " "
        else:
            # セグメント情報がない場合は、全体を1つのセグメントとして扱う
            formatted_segments.append({
                'start': 0.0,
                'end': 0.0,
                'text': transcript.text if hasattr(transcript, 'text') else "",
                'words': []
            })
            full_text = transcript.text if hasattr(transcript, 'text') else ""
        
        full_text = full_text.strip()
        
        print(f"DEBUG: 文字起こしが完了しました。")
        print(f"  全体の文字数: {len(full_text)}")
        print(f"  セグメント数: {len(formatted_segments)}")
        
        # デバッグ用に最初のセグメントの詳細を表示
        if formatted_segments:
            print(f"DEBUG: 最初のセグメントの詳細:")
            print(f"  テキスト: {formatted_segments[0]['text']}")
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

# --- 3. Gemini Deep Researchによる背景傾向調査 ---
def analyze_with_gemini_deep_research(speaker_info: dict = None) -> dict:
    """
    LangGraph エージェントを用いてテキスト内容を深掘りし、発言者の過去の情報を取得する。
    発言者情報があれば、エージェントがツールを用いて過去情報を検索し、分析に含める。

    Args:
        text (str): 文字起こしされたテキスト。
        speaker_info (dict, optional): 発言者/投稿者に関する情報。
                                       例: {'name': 'フワちゃん', 'account_url': 'https://x.com/fuwa876'}

    Returns:
        dict: 深掘りされた分析結果。事故の種類、内容、関係者、潜在的なリスクなど。
              `user_research_summary` フィールドに Deep Research の結果が含まれる。
    """
    print(f"DEBUG: LangGraph エージェントを用いて深掘り分析を開始します:")
    if speaker_info:
        print(f"DEBUG: 発言者情報が提供されました: {speaker_info}")

    # LangGraph エージェントへのプロンプトを構築
    # LangGraphのPrompts.pyに定義されているSystem PromptとHuman Promptを考慮
    
        # user_query = f"以下の会議録テキストからコンプライアンス違反の可能性とリスクを深く調査し、分析してください。もし発言者に関する情報があれば、その人物の公開されている過去のコンプライアンス関連情報もインターネットで検索し、分析に含めてください。特に、情報漏洩、ハラスメント、不正行為、不適切な発言など、組織にとってのリスクになりうる点を重点的に調べてください。"
        user_query = f"以下の情報から分析してください。もし発言者に関する情報があれば、その人物の公開されている過去のコンプライアンス関連情報もインターネットで検索し、分析に含めてください。特に、情報漏洩、ハラスメント、不正行為、不適切な発言など、組織にとってのリスクになりうる点を重点的に調べてください。判断リソースリンク以外を表示してください"

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
    
# テスト用
# print(analyze_with_gemini_deep_research({
#     "name": "フワちゃん",
#     "account_url": "https://x.com/fuwa876"
# }))

# --- 4. 事故の時間・分野のクロスチェックとショートアノテーション ---


def analyze_video_compliance(video_path: str, transcripts: list[dict]) -> dict:
    """
    動画の動作と発言の両方からコンプライアンス違反を検出し、タイムスタンプ付きで出力する。

    Args:
        video_path (str): 動画ファイルのパス
        transcripts (list[dict]): タイムスタンプ付きの文字起こしデータ

    Returns:
        dict: コンプライアンス違反の検出結果
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"動画ファイルが見つかりません: {video_path}")

    print(f"DEBUG: 動画 '{video_path}' のコンプライアンス分析を開始します。")

    try:
        # Gemini APIの設定
        # model = genai.GenerativeModel('gemini-pro-vision')
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        model_name = "gemini-2.5-flash-preview-05-20"
        # 動画ファイルの存在とサイズを確認
        file_size = os.path.getsize(video_path)
        print(f"DEBUG: 動画ファイルサイズ: {file_size / (1024*1024):.2f} MB")
        
        if file_size == 0:
            raise ValueError("動画ファイルが空です")
        
        # 文字起こしデータの確認
        if not transcripts:
            raise ValueError("文字起こしデータが空です")
        
        print(f"DEBUG: 文字起こしデータのセグメント数: {len(transcripts)}")
        
        # 文字起こしデータを整形
        transcript_text = "\n".join([
            f"[{segment['start']:.2f}-{segment['end']:.2f}] {segment['text']}"
            for segment in transcripts
        ])
        
        print(f"DEBUG: 文字起こしテキストの長さ: {len(transcript_text)} 文字")

        # プロンプトの設定
        prompt = f"""
        以下の動画と文字起こしデータを分析し、コンプライアンス違反の可能性がある箇所を特定してください。

        文字起こしデータ:
        {transcript_text}

        以下の点について分析してください：
        1. 動画内の不適切な動作（暴力、ハラスメント行為など）
        2. 不適切な発言（差別的発言、ハラスメント発言など）
        3. 各違反の具体的な時間帯

        以下のJSON形式で出力してください：
        {{
            "violations": [
                {{
                    "type": "動作" or "発言",
                    "description": "違反の具体的な説明",
                    "start_time": 開始時間（秒）,
                    "end_time": 終了時間（秒）,
                    "severity": "高" or "中" or "低",
                    "related_text": "関連する発言（発言タイプの場合）"
                }}
            ],
            "summary": "全体的な分析結果の要約"
        }}
        """

        print("DEBUG: Gemini APIで分析を開始します...")
        
        # 動画ファイルをアップロード
        my_file = client.files.upload(file=video_path)
            
            # ファイルの処理が完了するまで待機
        while my_file.state.name == "PROCESSING":
            print("ビデオを処理中...", end="\r")
            time.sleep(5)
            my_file = client.files.get(name=my_file.name)
        
        # Gemini APIで分析を実行
        response = client.models.generate_content(
            model=model_name,
            contents=[prompt, my_file]
        )
        print(response)
        print("DEBUG: Gemini APIからの応答を受信しました")
        
        # JSONレスポンスをパース
        try:
            # レスポンスからテキストコンテンツを抽出
            response_text = response.candidates[0].content.parts[0].text
            # JSON部分を抽出（```json と ``` の間のテキスト）
            json_text = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
            if json_text:
                analysis_result = json.loads(json_text.group(1))
            else:
                raise ValueError("JSONデータが見つかりませんでした")
            print("DEBUG: JSONレスポンスのパースに成功しました")
        except json.JSONDecodeError as e:
            print(f"ERROR: JSONのパースに失敗しました: {e}")
            print(f"受信したレスポンス: {response_text[:200]}...")  # 最初の200文字のみ表示
            raise

        # 結果を整形して返す
        return {
            'violations': analysis_result.get('violations', []),
            'summary': analysis_result.get('summary', '分析結果なし'),
            'raw_response': response  # デバッグ用
        }

    except Exception as e:
        print(f"ERROR: コンプライアンス分析中にエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return {
            'violations': [],
            'summary': f"エラーが発生しました: {str(e)}",
            'raw_response': None
        }




# --- 5. GPTによる前後の文脈判断 ---
def judge_context_with_gpt(
    full_transcript: str,          # 文字起こしの全文
    violation_record: dict,        # analyze_video_complianceからの違反レコード
    speaker_background: dict = None  # 発言者の背景情報（オプション）
) -> dict:
    """
    GPTを利用して、特定された発言の前後の文脈を判断し、意図やニュアンスを評価する。
    発言者の背景情報も考慮して、コンプライアンス違反の可能性を総合的に判断する。

    Args:
        full_transcript (str): 文字起こしの全文。
        violation_record (dict): analyze_video_complianceからの違反レコード。
            {
                'type': str,              # 違反の種類（"動作" or "発言"）
                'description': str,       # 違反の具体的な説明
                'start_time': float,      # 開始時間（秒）
                'end_time': float,        # 終了時間（秒）
                'severity': str,          # 重要度（"高" or "中" or "低"）
                'related_text': str       # 関連する発言（発言タイプの場合）
            }
        speaker_background (dict, optional): 発言者の背景情報。
            {
                'name': str,                     # 発言者名
                'past_incidents': list,          # 過去のコンプライアンス関連事案
                'character_type': str,           # キャラクタータイプ（例：お笑い芸人、政治家など）
                'usual_style': str               # 通常の発言スタイル
            }

    Returns:
        dict: 文脈判断の結果。意図、ニュアンス、追加のリスク評価など。
            {
                'contextual_intent': str,        # 発言の意図とニュアンスの具体的な説明
                'gpt_context_assessment': str,   # 文脈を踏まえた上でのコンプライアンスリスクへの影響評価
                'gpt_additional_risk_factor': str, # 文脈から判断される追加のリスク要因または軽減要因
                'gpt_risk_modifier': str,        # 最終的なリスク修正の度合い ('増幅', '軽減', 'なし' のいずれか)
                'speaker_context_impact': str,   # 発言者の背景情報がリスク評価に与える影響
                'final_judgment': str            # 発言者の背景を考慮した上での最終判断
            }
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY 環境変数が設定されていません。GPT APIを利用できません。")

    openai.api_key = api_key

    # タイムスタンプを分:秒形式に変換
    start_time = violation_record.get('start_time', 0)
    end_time = violation_record.get('end_time', 0)
    incident_timestamp = f"{int(start_time // 60)}:{int(start_time % 60):02d} - {int(end_time // 60)}:{int(end_time % 60):02d}"

    print(f"DEBUG: GPTで文脈を判断します。")
    print(f"対象タイムスタンプ: {incident_timestamp}")
    print(f"違反タイプ: {violation_record.get('type', '不明')}")
    print(f"重要度: {violation_record.get('severity', '不明')}")

    # 発言者の背景情報を文字列に変換
    speaker_info = ""
    if speaker_background:
        speaker_info = f"""
        発言者: {speaker_background.get('name', '不明')}
        キャラクタータイプ: {speaker_background.get('character_type', '不明')}
        通常の発言スタイル: {speaker_background.get('usual_style', '不明')}
        過去のコンプライアンス関連事案: {', '.join(speaker_background.get('past_incidents', ['なし']))}
        """

    prompt = f"""
    以下の情報を分析し、コンプライアンス違反の可能性を判断してください。

    1. 問題の発言:
    タイムスタンプ: {incident_timestamp}
    違反タイプ: {violation_record.get('type', '不明')}
    重要度: {violation_record.get('severity', '不明')}
    説明: {violation_record.get('description', '不明')}
    関連テキスト: {violation_record.get('related_text', '不明')}

    2. 発言者の背景情報:
    {speaker_info if speaker_info else "発言者の背景情報は提供されていません。"}

    3. 音声文の全文:
    {full_transcript}

    以下の点について分析してください：
    1. 発言の意図（皮肉、冗談、真剣な情報伝達など）
    2. 発言者のキャラクターや過去の発言スタイルを考慮した場合の許容可能性
    3. 前後の文脈から判断される発言の真意
    4. コンプライアンス違反の可能性（発言者の背景を考慮しても許容できないか）

    分析結果は、以下のJSON形式で出力してください：

    {{
        "contextual_intent": "発言の意図とニュアンスの具体的な説明",
        "gpt_context_assessment": "文脈を踏まえた上でのコンプライアンスリスクへの影響評価",
        "gpt_additional_risk_factor": "文脈から判断される追加のリスク要因または軽減要因",
        "gpt_risk_modifier": "最終的なリスク修正の度合い ('増幅', '軽減', 'なし' のいずれか)",
        "speaker_context_impact": "発言者の背景情報がリスク評価に与える影響",
        "final_judgment": "発言者の背景を考慮した上での最終判断"
    }}
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "あなたは音声文からコンプライアンスリスクを評価する専門家です。発言者の背景や文脈を考慮して、発言の意図を正確に判断してください。ただし、貴方が大丈夫と通してしまうと、全世界に発信される可能性があるので、貴方の判断は慎重に厳しく倫理性を十分に考慮して行ってください。"},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        response_content = response.choices[0].message.content
        context_judgement_result = json.loads(response_content)
        
        print(f"DEBUG: GPTによる文脈判断が完了しました。")
        print(f"意図: {context_judgement_result.get('contextual_intent')}")
        print(f"リスク修正: {context_judgement_result.get('gpt_risk_modifier')}")
        
        return context_judgement_result

    except openai.APIError as e:
        print(f"ERROR: OpenAI APIエラーが発生しました: {e}")
        return {
            'contextual_intent': 'APIエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし',
            'speaker_context_impact': '不明',
            'final_judgment': 'APIエラーにより判断不能'
        }
    except json.JSONDecodeError as e:
        print(f"ERROR: GPTからのレスポンスが有効なJSONではありません: {e}")
        print(f"DEBUG: GPT生レスポンス (JSONエラー時): {response_content if 'response_content' in locals() else 'N/A'}")
        return {
            'contextual_intent': 'JSONパースエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし',
            'speaker_context_impact': '不明',
            'final_judgment': 'JSONエラーにより判断不能'
        }
    except Exception as e:
        print(f"ERROR: GPTによる文脈判断中に予期せぬエラーが発生しました: {e}")
        return {
            'contextual_intent': '予期せぬエラーにより判断不能',
            'gpt_context_assessment': '不明',
            'gpt_additional_risk_factor': 'なし',
            'gpt_risk_modifier': 'なし',
            'speaker_context_impact': '不明',
            'final_judgment': '予期せぬエラーにより判断不能'
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

# # --- 8. 単一ソースからのアラート生成 ---
# def generate_alert(
#     gemini_analysis: dict,
#     incident_details: dict,
#     gpt_context_judgement: dict,
#     transcripts: list[dict],
#     music_detection_result: dict = None,
#     source_type: str = "video" # source_type を追加
# ) -> dict:
#     """
#     全ての分析結果を統合し、コンプライアンスアラートを生成する。

#     Args:
#         gemini_analysis (dict): Geminiによる深掘り分析結果。
#         incident_details (dict): 事故時刻と関連分野の詳細。
#         gpt_context_judgement (dict): GPTによる文脈判断結果。
#         transcripts (list[dict]): タイムスタンプ付き文字起こしデータ。
#         music_detection_result (dict, optional): 著作権音楽検出の結果。
#         source_type (str): このアラートが「video」または「text_input」のどちらのソースから生成されたか。

#     Returns:
#         dict: アラートレベル（重・中・予）、理由、関連タイムスタンプを含む辞書。
#     """
#     alert_level = "予"
#     reasons = []
    
#     # 暫定のタイムスタンプとテキストを設定
#     alert_timestamp = incident_details.get('incident_timestamp_approx', '不明')
#     original_text_segment = '該当テキストなし'

#     # --- original_text_segment の設定ロジック ---
#     if source_type == "text_input":
#         # テキスト入力のみの場合、transcriptsはダミーで、text_inputそのものがオリジナルテキスト
#         # `cross_check_and_annotate_incident` で `context_for_gpt` に格納されたものが望ましい
#         original_text_segment = incident_details.get('context_for_gpt', 'N/A')
#         # テキスト入力の場合、タイムスタンプは通常不明
#         alert_timestamp = "不明" # 明示的に不明にする
#     elif source_type == "video":
#         # 動画の場合、タイムスタンプに基づいて正確なテキストを抽出
#         if ' - ' in alert_timestamp and alert_timestamp != '不明':
#             try:
#                 start_m, start_s = map(int, alert_timestamp.split(' - ')[0].split(':'))
#                 end_m, end_s = map(int, alert_timestamp.split(' - ')[1].split(':'))
#                 start_sec_float = float(start_m * 60 + start_s)
#                 end_sec_float = float(end_m * 60 + end_s)
                
#                 for s in transcripts:
#                     if max(s['start'], start_sec_float) < min(s['end'], end_sec_float):
#                         original_text_segment = s['text']
#                         break
#             except ValueError:
#                 pass # タイムスタンプ解析エラーの場合はデフォルト値のまま
#     # --- original_text_segment の設定ロジックここまで ---

#     print(f"DEBUG: generate_alert (Source: {source_type}): アラートを生成します。現在のレベル: {alert_level}")

#     # --- 1. 著作権のある音楽が検出された場合の判断（最優先） ---
#     # 音楽検出は動画ソースにのみ適用されるため、source_type == "video" で確認
#     if source_type == "video" and music_detection_result and music_detection_result.get('detected') and music_detection_result.get('is_copyrighted'):
#         alert_level = "重"
#         reasons.append(
#             f"**著作権違反の音楽検出**: 著作権保護された音楽 '{music_detection_result.get('title', '不明')}' "
#             f"by '{music_detection_result.get('artist', '不明')}' が検出されました。"
#         )
#         # 音楽検出のタイムスタンプを優先的に採用
#         if music_detection_result.get('start_time') is not None and music_detection_result.get('end_time') is not None:
#              alert_timestamp = (
#                  f"{int(music_detection_result['start_time'] // 60)}:{int(music_detection_result['start_time'] % 60):02d} - "
#                  f"{int(music_detection_result['end_time'] // 60)}:{int(music_detection_result['end_time'] % 60):02d}"
#              )
#         original_text_segment = "動画内の音楽部分（文字起こしなし）" # 音楽なのでテキストはなし

#     # --- 2. Geminiの初期評価に基づく判断 ---
#     current_level_before_gemini = alert_level 
#     if gemini_analysis.get('gemini_risk_assessment') == '高':
#         if alert_level != "重":
#             alert_level = "重"
#         reasons.append(f"**Gemini初期評価**: 重大なコンプライアンスリスクが検出されました。理由: {gemini_analysis.get('gemini_summary', '不明')}")
#     elif gemini_analysis.get('gemini_risk_assessment') == '中':
#         if alert_level == "予":
#             alert_level = "中"
#         elif alert_level != "重":
#             reasons.append(f"**Gemini初期評価**: 中程度のコンプライアンスリスクが検出されました。理由: {gemini_analysis.get('gemini_summary', '不明')}")
    
#     # --- 3. GPTによる文脈判断に基づく調整 ---
#     gpt_risk_modifier = gpt_context_judgement.get('gpt_risk_modifier', 'なし')
#     contextual_intent = gpt_context_judgement.get('contextual_intent', '')
#     gpt_additional_risk_factor = gpt_context_judgement.get('gpt_additional_risk_factor', '')

#     if gpt_risk_modifier == '増幅':
#         if alert_level == "予":
#             alert_level = "中"
#             reasons.append(f"**文脈評価（GPT）**: 発言の意図がリスクを増幅させると判断されました。意図: {contextual_intent}")
#         elif alert_level == "中":
#             alert_level = "重"
#             reasons.append(f"**文脈評価（GPT）**: 発言の意図がリスクをさらに増幅させると判断されました。意図: {contextual_intent}")
#         if gpt_additional_risk_factor and gpt_additional_risk_factor != 'なし':
#             reasons.append(f"追加のリスク要因: {gpt_additional_risk_factor}")
#     elif gpt_risk_modifier == '軽減':
#         if alert_level == "重":
#             alert_level = "中"
#             reasons.append(f"**文脈評価（GPT）**: 発言が皮肉や誤解の可能性があり、アラートレベルを調整しました。要詳細確認。意図: {contextual_intent}")
#         elif alert_level == "中":
#             alert_level = "予"
#             reasons.append(f"**文脈評価（GPT）**: 発言が皮肉や誤解の可能性があり、アラートレベルを調整しました。要詳細確認。意図: {contextual_intent}")
#         if gpt_additional_risk_factor and gpt_additional_risk_factor != 'なし':
#             reasons.append(f"軽減要因: {gpt_additional_risk_factor}")
#     else:
#         if contextual_intent and "真剣な情報伝達" in contextual_intent:
#             if alert_level == "予":
#                 alert_level = "中"
#                 reasons.append(f"**文脈評価（GPT）**: 発言が真剣な情報伝達であると確認されました。")
#             elif alert_level == "中" and "深刻な" in gpt_context_judgement.get('gpt_context_assessment', ''):
#                 alert_level = "重"
#                 reasons.append(f"**文脈評価（GPT）**: 文脈からより深刻なリスクが示唆されました。")

#     # --- 4. incident_details / accident_time / field からの直接的なアラート条件 ---
#     if incident_details.get('relevant_field') == '情報セキュリティ・個人情報保護':
#         if any(kw in gemini_analysis.get('keywords', []) for kw in ['顧客情報漏洩', '不適切発言', '個人情報流出']):
#             if alert_level != "重":
#                 alert_level = "重"
#             reasons.append(f"**特定条件一致**: 関連分野「{incident_details.get('relevant_field')}」で「顧客情報漏洩」または「不適切発言」が検出されたため、重大なコンプライアンス違反の可能性。")
    
#     final_reason = " ".join(reasons) if reasons else "特段の懸念事項は見られませんでした。"
    
#     # タイムスタンプは、音楽検出が最優先、次にincident_details、最後にテキスト入力の場合は不明
#     if alert_timestamp == '不明' and incident_details.get('incident_timestamp_approx') != 'N/A':
#         alert_timestamp = incident_details.get('incident_timestamp_approx', '不明')
    
#     return {
#         'level': alert_level,
#         'reason': final_reason,
#         'timestamp': alert_timestamp,
#         'original_text_segment': original_text_segment
#     }

# # --- 9. アラートレベルの優先度を定義するヘルパー関数 ---
# def get_alert_level_priority(level: str) -> int:
#     if level == "重": return 3
#     if level == "中": return 2
#     if level == "予": return 1
#     return 0 # 不明など

# # --- 10. 複数ソースからのアラート統合 ---
# def integrate_multi_source_alerts(video_result: dict = None, text_result: dict = None) -> dict:
#     """
#     動画由来とテキスト由来のアラート結果を統合し、最終的なコンプライアンスアラートを生成する。
#     """
#     final_alert_level = "予"
#     final_reasons = []
#     final_timestamp = "不明"
#     final_original_text_segment = "N/A" # 最終的に最も関連性の高いテキストを保持

#     # 動画由来のアラートを処理
#     if video_result:
#         video_specific_alert = generate_alert(
#             video_result['gemini_analysis'],
#             video_result['incident_details'],
#             video_result['gpt_context_judgement'],
#             video_result['transcripts'],
#             video_result['music_detection_result'],
#             source_type="video" # source_type を追加
#         )
#         # 動画由来のアラートレベルと理由を統合
#         if get_alert_level_priority(video_specific_alert['level']) > get_alert_level_priority(final_alert_level):
#             final_alert_level = video_specific_alert['level']
#         final_reasons.append(f"[動画分析]: {video_specific_alert['reason']}")
        
#         # タイムスタンプとテキストセグメントは動画が優先される
#         if video_specific_alert['timestamp'] != '不明':
#             final_timestamp = video_specific_alert['timestamp']
#         if video_specific_alert['original_text_segment'] != '該当テキストなし':
#             final_original_text_segment = video_specific_alert['original_text_segment']

#     # テキスト由来のアラートを処理
#     if text_result:
#         text_specific_alert = generate_alert(
#             text_result['gemini_analysis'],
#             text_result['incident_details'],
#             text_result['gpt_context_judgement'],
#             text_result['transcripts'], # ダミーのtranscript
#             text_result['music_detection_result'], # None
#             source_type="text_input" # source_type を追加
#         )
#         # テキスト由来のアラートレベルと理由を統合
#         if get_alert_level_priority(text_specific_alert['level']) > get_alert_level_priority(final_alert_level):
#             final_alert_level = text_specific_alert['level']
#         final_reasons.append(f"[テキスト分析]: {text_specific_alert['reason']}")
        
#         # テキスト由来のタイムスタンプは通常「不明」だが、もし特定できれば、動画のタイムスタンプがなければ採用
#         if text_specific_alert['timestamp'] != '不明' and final_timestamp == '不明':
#              final_timestamp = text_specific_alert['timestamp']
#         # テキスト由来のオリジナルテキストセグメントも、動画のものがなければ採用
#         if text_specific_alert['original_text_segment'] != '該当テキストなし' and final_original_text_segment == 'N/A':
#             final_original_text_segment = text_specific_alert['original_text_segment']

#     return {
#         'level': final_alert_level,
#         'reason': " ".join(final_reasons),
#         'timestamp': final_timestamp,
#         'original_text_segment': final_original_text_segment
#     }


# # --- 11. エージェントの実行エントリポイント ---
# def run_compliance_agent(text_input: str = None, video_path: str = None) -> dict:
#     """
#     コンプライアンス判定AIエージェントの全処理を実行する。
#     テキストのみ、または動画パスを指定して実行可能。
#     """
#     video_alert_data = None
#     text_alert_data = None

#     # --- 入力タイプの判定と初期処理 ---
#     if video_path and text_input:
#         print("WARNING: 動画パスとテキスト入力の両方が指定されました。両方を分析し、結果を統合します。")
        
#         # 動画処理パス
#         transcripts_with_timestamps_video = process_video_to_transcript(video_path)
#         plain_text_from_video = extract_plain_text(transcripts_with_timestamps_video['segments'])
#         music_detection_result = None
#         audio_output_path = "temp_audio_for_music_detection.mp3"
#         audio_extracted = extract_audio_from_video(video_path, audio_output_path)
#         if audio_extracted:
#             music_detection_result = detect_copyrighted_music_from_audio(audio_output_path)
#             os.remove(audio_output_path)
#         else:
#             print("WARNING: 音声抽出に失敗したため、著作権音楽検出はスキップされます。")
#         gemini_analysis_video = analyze_with_gemini_deep_research(plain_text_from_video)
#         incident_details_video = cross_check_and_annotate_incident(gemini_analysis_video, transcripts_with_timestamps_video['segments'])
#         gpt_context_judgement_video = judge_context_with_gpt(
#             incident_details_video.get('context_for_gpt', plain_text_from_video),
#             incident_details_video.get('incident_timestamp_approx', ''),
#             incident_details_video.get('relevant_field', '')
#         )
#         video_alert_data = {
#             'gemini_analysis': gemini_analysis_video,
#             'incident_details': incident_details_video,
#             'gpt_context_judgement': gpt_context_judgement_video,
#             'transcripts': transcripts_with_timestamps_video['segments'],
#             'music_detection_result': music_detection_result
#         }

#         # テキスト処理パス
#         plain_text_from_input = text_input
#         dummy_transcripts_for_text = [{"start": 0.0, "end": 0.0, "text": text_input}]
#         gemini_analysis_text = analyze_with_gemini_deep_research(plain_text_from_input)
#         incident_details_text = cross_check_and_annotate_incident(gemini_analysis_text, dummy_transcripts_for_text)
#         gpt_context_judgement_text = judge_context_with_gpt(
#             incident_details_text.get('context_for_gpt', plain_text_from_input),
#             incident_details_text.get('incident_timestamp_approx', ''),
#             incident_details_text.get('relevant_field', '')
#         )
#         text_alert_data = {
#             'gemini_analysis': gemini_analysis_text,
#             'incident_details': incident_details_text,
#             'gpt_context_judgement': gpt_context_judgement_text,
#             'transcripts': dummy_transcripts_for_text,
#             'music_detection_result': None # テキスト入力の場合は音楽検出なし
#         }

#     elif video_path:
#         print(f"DEBUG: 動画パス '{video_path}' を入力として処理を開始します。")
#         transcripts_with_timestamps = process_video_to_transcript(video_path)
#         plain_text = extract_plain_text(transcripts_with_timestamps['segments'])
#         music_detection_result = None
#         audio_output_path = "temp_audio_for_music_detection.mp3"
#         audio_extracted = extract_audio_from_video(video_path, audio_output_path)
#         if audio_extracted:
#             music_detection_result = detect_copyrighted_music_from_audio(audio_output_path)
#             os.remove(audio_output_path)
#         else:
#             print("WARNING: 音声抽出に失敗したため、著作権音楽検出はスキップされます。")
#         gemini_analysis = analyze_with_gemini_deep_research(plain_text)
#         incident_details = cross_check_and_annotate_incident(gemini_analysis, transcripts_with_timestamps['segments'])
#         gpt_context_judgement = judge_context_with_gpt(
#             incident_details.get('context_for_gpt', plain_text),
#             incident_details.get('incident_timestamp_approx', ''),
#             incident_details.get('relevant_field', '')
#         )
#         video_alert_data = {
#             'gemini_analysis': gemini_analysis,
#             'incident_details': incident_details,
#             'gpt_context_judgement': gpt_context_judgement,
#             'transcripts': transcripts_with_timestamps['segments'],
#             'music_detection_result': music_detection_result
#         }

# # テスト用のコード
# if __name__ == "__main__":
#     try:
#         print("\n=== テスト開始 ===")
#         print(f"現在の作業ディレクトリ: {os.getcwd()}")
#         print(f"動画ファイルパス: {video_path}")
#         print(f"動画ファイルの存在確認: {'存在します' if os.path.exists(video_path) else '存在しません'}")
        
#         if os.path.exists(video_path):
#             print(f"動画ファイルサイズ: {os.path.getsize(video_path) / (1024*1024):.2f} MB")
        
#         # 1. 文字起こしを実行
#         print("\n=== 文字起こしの実行 ===")
#         transcript_result = process_video_to_transcript(video_path)
        
#         # 文字起こし結果の確認
#         print("\n=== 文字起こし結果の確認 ===")
#         print(f"セグメント数: {len(transcript_result['segments'])}")
#         print(f"全体の文字数: {len(transcript_result['full_text'])}")
        
#         # 最初の3セグメントを表示
#         print("\n最初の3セグメントの詳細:")
#         for i, segment in enumerate(transcript_result['segments'][:3]):
#             print(f"\nセグメント {i+1}:")
#             print(f"時間: {segment['start']:.2f} - {segment['end']:.2f}")
#             print(f"テキスト: {segment['text']}")
#             if segment['words']:
#                 print("単語レベルのタイムスタンプ:")
#                 for word in segment['words'][:5]:  # 最初の5単語を表示
#                     print(f"  {word['word']}: {word['start']:.2f} - {word['end']:.2f}")
        
#         # 2. コンプライアンス分析を実行
#         print("\n=== コンプライアンス分析の実行 ===")
#         compliance_result = analyze_video_compliance(video_path, transcript_result['segments'])
#         print(compliance_result)
#         # 分析結果の表示
#         print("\n=== コンプライアンス分析結果 ===")
#         print(f"要約: {compliance_result['summary']}")
        
#         violations = compliance_result.get('violations', [])
#         print(f"\n検出された違反数: {len(violations)}")
        
#         for i, violation in enumerate(violations, 1):
#             print(f"\n違反 {i}:")
#             print(f"タイプ: {violation['type']}")
#             print(f"説明: {violation['description']}")
#             print(f"時間帯: {violation['start_time']:.2f} - {violation['end_time']:.2f}")
#             print(f"重要度: {violation['severity']}")
#             if violation.get('related_text'):
#                 print(f"関連テキスト: {violation['related_text']}")
        
#     except Exception as e:
#         print(f"\nERROR: テスト実行中にエラーが発生しました: {e}")
#         import traceback
#         traceback.print_exc()

# --- テスト用のコード ---
#これまんま動画オンリーのテスト用(youtube)
# if __name__ == "__main__":
#     try:
#         print("\n=== テスト開始 ===")
#         print(f"現在の作業ディレクトリ: {os.getcwd()}")
#         print(f"動画ファイルパス: {video_path}")
#         print(f"動画ファイルの存在確認: {'存在します' if os.path.exists(video_path) else '存在しません'}")
        
#         if os.path.exists(video_path):
#             print(f"動画ファイルサイズ: {os.path.getsize(video_path) / (1024*1024):.2f} MB")
        
#         # 1. 文字起こしを実行
#         print("\n=== 文字起こしの実行 ===")
#         transcript_result = process_video_to_transcript(video_path)
        
#         # 文字起こし結果の確認
#         print("\n=== 文字起こし結果の確認 ===")
#         print(f"セグメント数: {len(transcript_result['segments'])}")
#         print(f"全体の文字数: {len(transcript_result['full_text'])}")
        
#         # 最初の3セグメントを表示
#         print("\n最初の3セグメントの詳細:")
#         for i, segment in enumerate(transcript_result['segments'][:3]):
#             print(f"\nセグメント {i+1}:")
#             print(f"時間: {segment['start']:.2f} - {segment['end']:.2f}")
#             print(f"テキスト: {segment['text']}")
#             if segment['words']:
#                 print("単語レベルのタイムスタンプ:")
#                 for word in segment['words'][:5]:  # 最初の5単語を表示
#                     print(f"  {word['word']}: {word['start']:.2f} - {word['end']:.2f}")
        
#         # 2. コンプライアンス分析を実行
#         print("\n=== コンプライアンス分析の実行 ===")
#         compliance_result = analyze_video_compliance(video_path, transcript_result['segments'])
        
#         # 分析結果の表示
#         print("\n=== コンプライアンス分析結果 ===")
#         print(f"要約: {compliance_result['summary']}")
        
#         violations = compliance_result.get('violations', [])
#         print(f"\n検出された違反数: {len(violations)}")
        
#         # 3. 各違反に対して文脈判断を実行
#         print("\n=== 文脈判断の実行 ===")
#         for i, violation in enumerate(violations, 1):
#             print(f"\n違反 {i}:")
#             print(f"タイプ: {violation['type']}")
#             print(f"説明: {violation['description']}")
#             print(f"時間帯: {violation['start_time']:.2f} - {violation['end_time']:.2f}")
#             print(f"重要度: {violation['severity']}")
#             if violation.get('related_text'):
#                 print(f"関連テキスト: {violation['related_text']}")
            
#             # 発言者の背景情報を設定（実際の使用では、この情報は別途取得する必要があります）
#             speaker_background = {
#                 'name': '不明',
#                 'past_incidents': [],
#                 'character_type': '不明',
#                 'usual_style': '不明'
#             }
            
#             # 文脈判断を実行
#             print("\n文脈判断の実行:")
#             context_judgement = judge_context_with_gpt(
#                 transcript_result['full_text'],
#                 violation,
#                 speaker_background
#             )
            
#             # 文脈判断結果の表示
#             print("\n文脈判断結果:")
#             print(f"意図: {context_judgement.get('contextual_intent')}")
#             print(f"リスク評価: {context_judgement.get('gpt_context_assessment')}")
#             print(f"リスク修正: {context_judgement.get('gpt_risk_modifier')}")
#             print(f"発言者背景の影響: {context_judgement.get('speaker_context_impact')}")
#             print(f"最終判断: {context_judgement.get('final_judgment')}")
            
#             # 区切り線を表示
#             print("\n" + "="*50)
        
#     except Exception as e:
#         print(f"\nERROR: テスト実行中にエラーが発生しました: {e}")
#         import traceback
#         traceback.print_exc()

# --- 画像とテキストのコンプライアンス分析 ---
def analyze_image_and_text_compliance(
    image_path: str = None,
    text_input: str = None,
    speaker_background: dict = None
) -> dict:
    """
    画像とテキストの両方（またはどちらか一方）を分析し、コンプライアンス違反の可能性を評価する。
    Geminiのマルチモーダル機能を使用して、画像内のテキスト認識と画像内容の分析を同時に行う。

    Args:
        image_path (str, optional): 分析対象の画像ファイルパス。
        text_input (str, optional): 分析対象のテキスト。
        speaker_background (dict, optional): 発言者/投稿者の背景情報。
            {
                'name': str,                     # 発言者名
                'past_incidents': list,          # 過去のコンプライアンス関連事案
                'character_type': str,           # キャラクタータイプ
                'usual_style': str               # 通常の発言スタイル
            }

    Returns:
        dict: 分析結果。以下の情報を含む。
            {
                'violations': [
                    {
                        'type': str,              # 違反の種類（"画像", "テキスト", "画像とテキスト"）
                        'description': str,       # 違反の具体的な説明
                        'severity': str,          # 重要度（"高", "中", "低"）
                        'location': str,          # 違反の場所（"画像内", "テキスト内", "画像とテキスト"）
                        'detected_text': str,     # 検出された問題のあるテキスト
                        'image_content': str,     # 画像の内容説明
                        'context_analysis': str   # 文脈分析結果
                    }
                ],
                'summary': str,                  # 全体的な分析結果の要約
                'risk_level': str,               # 総合的なリスクレベル（"高", "中", "低"）
                'recommendations': list[str]      # 推奨される対応策
            }
    """
    if not image_path and not text_input:
        raise ValueError("画像パスまたはテキストのいずれかは必須です。")

    print(f"DEBUG: 画像とテキストのコンプライアンス分析を開始します。")
    
    # Gemini APIの設定
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model_name = "gemini-2.5-flash-preview-05-20"

    # 発言者の背景情報を文字列に変換
    speaker_info = ""
    if speaker_background:
        speaker_info = f"""
        発言者/投稿者情報:
        名前: {speaker_background.get('name', '不明')}
        キャラクタータイプ: {speaker_background.get('character_type', '不明')}
        通常の発言スタイル: {speaker_background.get('usual_style', '不明')}
        過去のコンプライアンス関連事案: {', '.join(speaker_background.get('past_incidents', ['なし']))}
        """

    # プロンプトの構築
    prompt = f"""
    以下の画像とテキストを分析し、コンプライアンス違反の可能性を評価してください。

    1. 分析対象:
    {f"画像ファイル: {image_path}" if image_path else "画像なし"}
    {f"テキスト入力: {text_input}" if text_input else "テキスト入力なし"}

    2. 発言者/投稿者情報:
    {speaker_info if speaker_info else "発言者/投稿者情報なし"}

    以下の点について分析してください：
    1. 画像内のテキスト（OCRで認識されたもの）
    2. 画像の内容（不適切な表現、著作権問題、プライバシー問題など）
    3. 入力テキストの内容
    4. 画像とテキストの組み合わせによる追加のリスク
    5. 発言者/投稿者の背景を考慮した文脈評価

    分析結果は、以下のJSON形式で出力してください：

    {{
        "violations": [
            {{
                "type": "画像" or "テキスト" or "画像とテキスト",
                "description": "違反の具体的な説明",
                "severity": "高" or "中" or "低",
                "location": "画像内" or "テキスト内" or "画像とテキスト",
                "detected_text": "検出された問題のあるテキスト",
                "image_content": "画像の内容説明(150文字以内)",
                "context_analysis": "文脈分析結果"
            }}
        ],
        "summary": "全体的な分析結果の要約(50文字以内)",
        "risk_level": "高" or "中" or "低",
        "recommendations": ["推奨される対応策"]
    }}
    """

    try:
        # 画像ファイルの処理
        image_file = None
        if image_path:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"画像ファイルが見つかりません: {image_path}")
            
            # 画像ファイルをアップロード
            image_file = client.files.upload(file=image_path)
            
            # ファイルの処理が完了するまで待機
            while image_file.state.name == "PROCESSING":
                print("画像を処理中...", end="\r")
                time.sleep(1)
                image_file = client.files.get(name=image_file.name)

        # Gemini APIで分析を実行
        contents = [prompt]
        if image_file:
            contents.append(image_file)

        response = client.models.generate_content(
            model=model_name,
            contents=contents
        )

        # レスポンスの処理
        response_text = response.candidates[0].content.parts[0].text
        
        # JSON部分を抽出（```json と ``` の間のテキスト）
        json_text = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
        if json_text:
            analysis_result = json.loads(json_text.group(1))
        else:
            raise ValueError("JSONデータが見つかりませんでした")

        print(f"DEBUG: 分析が完了しました。リスクレベル: {analysis_result.get('risk_level')}")
        return analysis_result

    except Exception as e:
        print(f"ERROR: 分析中にエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return {
            'violations': [],
            'summary': f"エラーが発生しました: {str(e)}",
            'risk_level': '不明',
            'recommendations': ['エラーの詳細を確認してください。']
        }

# # --- 画像とテキストのコンプライアンス分析テスト ---
if __name__ == "__main__":
    try:
        # 画像とテキストのコンプライアンス分析のテスト
        print("\n=== 画像とテキストのコンプライアンス分析テスト ===")
        
        # テスト用の画像パスとテキスト（hack01の重複を避ける）
        test_image_path = os.path.abspath("backend/data/images/5c638ab13b000033046b26ff.webp")
        test_text = "この画像は社内の機密情報を含んでいます。"
        
        # 発言者の背景情報
        test_speaker_background = {
            'name': 'テストユーザー',
            'past_incidents': ['過去に機密情報の誤送信経験あり'],
            'character_type': '社員',
            'usual_style': '真面目'
        }
        
        # 分析の実行
        result = analyze_image_and_text_compliance(
            image_path=test_image_path,
            text_input=test_text,
            speaker_background=test_speaker_background
        )
        
        # 結果の表示
        print("\n=== 分析結果 ===")
        print(f"リスクレベル: {result.get('risk_level')}")
        print(f"\n要約: {result.get('summary')}")
        
        violations = result.get('violations', [])
        print(f"\n検出された違反数: {len(violations)}")
        
        for i, violation in enumerate(violations, 1):
            print(f"\n違反 {i}:")
            print(f"タイプ: {violation.get('type')}")
            print(f"説明: {violation.get('description')}")
            print(f"重要度: {violation.get('severity')}")
            print(f"場所: {violation.get('location')}")
            if violation.get('detected_text'):
                print(f"検出テキスト: {violation.get('detected_text')}")
            if violation.get('image_content'):
                print(f"画像内容: {violation.get('image_content')}")
            print(f"文脈分析: {violation.get('context_analysis')}")
        
        print("\n推奨される対応策:")
        for i, rec in enumerate(result.get('recommendations', []), 1):
            print(f"{i}. {rec}")
        
    except Exception as e:
        print(f"\nERROR: テスト実行中にエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()

def detailed_video_analysis(video_path, speaker_background=None):
    logs = []
    try:
        logs.append(f"=== テスト開始 ===")
        logs.append(f"動画ファイルパス: {video_path}")
        import os
        logs.append(f"動画ファイルの存在確認: {'存在します' if os.path.exists(video_path) else '存在しません'}")
        if os.path.exists(video_path):
            logs.append(f"動画ファイルサイズ: {os.path.getsize(video_path) / (1024*1024):.2f} MB")

        # 1. 文字起こしを実行
        logs.append("=== 文字起こしの実行 ===")
        transcript_result = process_video_to_transcript(video_path)
        logs.append(f"セグメント数: {len(transcript_result['segments'])}")
        logs.append(f"全体の文字数: {len(transcript_result['full_text'])}")

        # 最初の3セグメントを表示
        for i, segment in enumerate(transcript_result['segments'][:3]):
            logs.append(f"セグメント {i+1}: 時間: {segment['start']:.2f} - {segment['end']:.2f}")
            logs.append(f"テキスト: {segment['text']}")
            if segment['words']:
                logs.append("単語レベルのタイムスタンプ:")
                for word in segment['words'][:5]:
                    logs.append(f"  {word['word']}: {word['start']:.2f} - {word['end']:.2f}")

        # 2. コンプライアンス分析を実行
        logs.append("=== コンプライアンス分析の実行 ===")
        compliance_result = analyze_video_compliance(video_path, transcript_result['segments'])
        logs.append(f"要約: {compliance_result['summary']}")
        violations = compliance_result.get('violations', [])
        logs.append(f"検出された違反数: {len(violations)}")

        # 3. 各違反に対して文脈判断を実行
        for i, violation in enumerate(violations, 1):
            logs.append(f"違反 {i}:")
            logs.append(f"タイプ: {violation['type']}")
            logs.append(f"説明: {violation['description']}")
            logs.append(f"時間帯: {violation['start_time']:.2f} - {violation['end_time']:.2f}")
            logs.append(f"重要度: {violation['severity']}")
            if violation.get('related_text'):
                logs.append(f"関連テキスト: {violation['related_text']}")
            # 文脈判断
            context_judgement = judge_context_with_gpt(
                transcript_result['full_text'],
                violation,
                speaker_background or {
                    'name': '不明',
                    'past_incidents': [],
                    'character_type': '不明',
                    'usual_style': '不明'
                }
            )
            logs.append(f"文脈判断結果: {context_judgement}")
            violation['context_judgement'] = context_judgement
            logs.append("="*50)

        return {
            "logs": logs,
            "transcript_result": transcript_result,
            "compliance_result": compliance_result
        }
    except Exception as e:
        logs.append(f"ERROR: {e}")
        import traceback
        logs.append(traceback.format_exc())
        return {"logs": logs, "error": str(e)}
    
def detailed_image_text_analysis(image_path, text_input, speaker_background=None):
    logs = []
    try:
        logs.append("=== 画像とテキストのコンプライアンス分析テスト ===")
        logs.append(f"画像パス: {image_path}")
        logs.append(f"テキスト: {text_input}")
        logs.append(f"発言者背景: {speaker_background}")

        # 分析の実行
        result = analyze_image_and_text_compliance(
            image_path=image_path,
            text_input=text_input,
            speaker_background=speaker_background
        )

        logs.append("=== 分析結果 ===")
        logs.append(f"リスクレベル: {result.get('risk_level')}")
        logs.append(f"要約: {result.get('summary')}")
        violations = result.get('violations', [])
        logs.append(f"検出された違反数: {len(violations)}")

        for i, violation in enumerate(violations, 1):
            logs.append(f"違反 {i}:")
            logs.append(f"タイプ: {violation.get('type')}")
            logs.append(f"説明: {violation.get('description')}")
            logs.append(f"重要度: {violation.get('severity')}")
            logs.append(f"場所: {violation.get('location')}")
            if violation.get('detected_text'):
                logs.append(f"検出テキスト: {violation.get('detected_text')}")
            if violation.get('image_content'):
                logs.append(f"画像内容: {violation.get('image_content')}")
            logs.append(f"文脈分析: {violation.get('context_analysis')}")

        logs.append("推奨される対応策:")
        for i, rec in enumerate(result.get('recommendations', []), 1):
            logs.append(f"{i}. {rec}")

        return {
            "logs": logs,
            "analysis_result": result
        }
    except Exception as e:
        logs.append(f"ERROR: {e}")
        import traceback
        logs.append(traceback.format_exc())
        return {"logs": logs, "error": str(e)}

def detailed_text_only_analysis(text_input, speaker_background=None):
    logs = []
    try:
        logs.append("=== テキストのみのコンプライアンス分析テスト ===")
        logs.append(f"テキスト: {text_input}")
        logs.append(f"発言者背景: {speaker_background}")

        # 分析の実行（画像なしでテキストのみ）
        result = analyze_image_and_text_compliance(
            image_path=None,
            text_input=text_input,
            speaker_background=speaker_background
        )

        logs.append("=== 分析結果 ===")
        logs.append(f"リスクレベル: {result.get('risk_level')}")
        logs.append(f"要約: {result.get('summary')}")
        violations = result.get('violations', [])
        logs.append(f"検出された違反数: {len(violations)}")

        for i, violation in enumerate(violations, 1):
            logs.append(f"違反 {i}:")
            logs.append(f"タイプ: {violation.get('type')}")
            logs.append(f"説明: {violation.get('description')}")
            logs.append(f"重要度: {violation.get('severity')}")
            logs.append(f"場所: {violation.get('location')}")
            if violation.get('detected_text'):
                logs.append(f"検出テキスト: {violation.get('detected_text')}")
            if violation.get('image_content'):
                logs.append(f"画像内容: {violation.get('image_content')}")
            logs.append(f"文脈分析: {violation.get('context_analysis')}")

        logs.append("推奨される対応策:")
        for i, rec in enumerate(result.get('recommendations', []), 1):
            logs.append(f"{i}. {rec}")

        return {
            "logs": logs,
            "analysis_result": result
        }
    except Exception as e:
        logs.append(f"ERROR: {e}")
        import traceback
        logs.append(traceback.format_exc())
        return {"logs": logs, "error": str(e)}