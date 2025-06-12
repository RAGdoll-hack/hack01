import os
from checker import process_video_to_transcript

def test_whisper_transcription(video_path: str):
    """
    Whisper APIを使用して動画の文字起こしをテストする

    Args:
        video_path (str): テストする動画ファイルのパス
    """
    print(f"テスト開始: {video_path}")
    
    # ファイルの存在確認
    if not os.path.exists(video_path):
        print(f"エラー: ファイルが見つかりません: {video_path}")
        return
    
    # 文字起こしの実行
    try:
        result = process_video_to_transcript(video_path)
        
        # 結果の表示
        print("\n=== 文字起こし結果 ===")
        print(f"全体のテキスト:\n{result['full_text']}")
        
        print("\n=== セグメントごとの詳細 ===")
        for i, segment in enumerate(result['segments'], 1):
            print(f"\nセグメント {i}:")
            print(f"時間: {segment['start']:.2f} - {segment['end']:.2f}")
            print(f"テキスト: {segment['text']}")
            
            if segment['words']:
                print("単語レベルのタイムスタンプ:")
                for word in segment['words']:
                    print(f"  {word['word']}: {word['start']:.2f} - {word['end']:.2f}")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")

if __name__ == "__main__":
    # テスト用の動画ファイルパス
    # 注意: このパスを実際の動画ファイルのパスに変更してください
    video_path = "backend/data/videos/test_video.mp4"
    
    # テストの実行
    test_whisper_transcription(video_path) 