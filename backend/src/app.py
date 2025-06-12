from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from checker import detailed_image_text_analysis, detailed_video_analysis, detailed_text_only_analysis

# 環境変数の読み込み
load_dotenv()

app = Flask(__name__)
CORS(app)  # CORSを有効化

# エラーハンドリング
@app.errorhandler(Exception)
def handle_error(error):
    response = {
        "error": str(error),
        "status": "error"
    }
    return jsonify(response), 500

# 動画のコンプライアンス分析API
@app.route('/api/analyze/video', methods=['POST'])
def analyze_video():
    try:
        if 'video' not in request.files:
            return jsonify({"error": "動画ファイルが提供されていません"}), 400

        video_file = request.files['video']
        speaker_background = request.form.get('speaker_background', None)
        if speaker_background:
            import json
            speaker_background = json.loads(speaker_background)

        temp_video_path = "temp_video.mp4"
        video_file.save(temp_video_path)

        # ここで詳細分析関数を呼び出し
        result = detailed_video_analysis(temp_video_path, speaker_background)

        os.remove(temp_video_path)

        return jsonify({
            "status": "success",
            "logs": result.get("logs"),
            "transcript": result.get("transcript_result"),
            "compliance_analysis": result.get("compliance_result")
        })

    except Exception as e:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        raise e

# 画像とテキストのコンプライアンス分析API
@app.route('/api/analyze/image-text', methods=['POST'])
def analyze_image_text():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "画像ファイルが提供されていません"}), 400

        image_file = request.files['image']
        text_input = request.form.get('text', None)
        speaker_background = request.form.get('speaker_background', None)
        if speaker_background:
            import json
            speaker_background = json.loads(speaker_background)

        temp_image_path = "temp_image.jpg"
        image_file.save(temp_image_path)

        # 詳細分析関数を呼び出し
        result = detailed_image_text_analysis(
            temp_image_path,
            text_input,
            speaker_background
        )

        os.remove(temp_image_path)

        return jsonify({
            "status": "success",
            "logs": result.get("logs"),
            "analysis_result": result.get("analysis_result")
        })

    except Exception as e:
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        raise e

# テキストのみのコンプライアンス分析API
@app.route('/api/analyze/text', methods=['POST'])
def analyze_text_only():
    try:
        data = request.get_json() if request.is_json else request.form
        text_input = data.get('text', None)
        speaker_background = data.get('speaker_background', None)
        if speaker_background and isinstance(speaker_background, str):
            import json
            speaker_background = json.loads(speaker_background)

        if not text_input:
            return jsonify({"error": "テキストが提供されていません"}), 400

        result = detailed_text_only_analysis(
            text_input,
            speaker_background
        )

        return jsonify({
            "status": "success",
            "logs": result.get("logs"),
            "analysis_result": result.get("analysis_result")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # 開発環境ではデバッグモードを有効化
    app.run(debug=True, host='0.0.0.0', port=5000) 