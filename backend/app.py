from flask import Flask, request, jsonify
from colorthief import ColorThief
import os

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok = True)

@app.route("/upload", methods = ["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # 提取主色
    color_thief = ColorThief(filepath)
    dominant_color = color_thief.get_color(quality = 5) # 获取主色调

    return jsonify({"dominant_color": dominant_color})

if __name__ == "__main__":
    app.run(host = "0.0.0.0", port = 5000, debug = True)

