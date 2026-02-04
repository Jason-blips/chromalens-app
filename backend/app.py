from flask import Flask, request, jsonify
from flask_cors import CORS
from colorthief import ColorThief
import os
import json
import hashlib
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # 允许跨域请求

UPLOAD_FOLDER = "uploads"
USERS_FOLDER = "users"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(USERS_FOLDER, exist_ok=True)

# 简单的用户数据存储（实际应该使用数据库）
USERS_FILE = os.path.join(USERS_FOLDER, "users.json")

def load_users():
    """加载用户数据"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_users(users):
    """保存用户数据"""
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(password):
    """简单的密码哈希（实际应该使用更安全的方法）"""
    return hashlib.sha256(password.encode()).hexdigest()

@app.route("/api/register", methods=["POST"])
def register():
    """用户注册"""
    try:
        data = request.json
        users = load_users()
        
        # 验证必填字段
        if not data.get("email") or not data.get("password") or not data.get("username"):
            return jsonify({"error": "缺少必填字段"}), 400
        
        # 检查邮箱是否已存在
        if data["email"] in users:
            return jsonify({"error": "该邮箱已被注册"}), 400
        
        # 创建新用户
        user_id = str(len(users) + 1)
        user = {
            "id": user_id,
            "username": data["username"],
            "email": data["email"],
            "password": hash_password(data["password"]),
            "gender": data.get("gender", ""),
            "avatar": data.get("avatar"),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        users[data["email"]] = user
        save_users(users)
        
        # 返回用户信息（不包含密码）
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    """用户登录"""
    try:
        data = request.json
        users = load_users()
        
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "邮箱和密码不能为空"}), 400
        
        # 验证用户
        if email not in users:
            return jsonify({"error": "邮箱或密码错误"}), 401
        
        user = users[email]
        if user["password"] != hash_password(password):
            return jsonify({"error": "邮箱或密码错误"}), 401
        
        # 返回用户信息（不包含密码）
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/user/<user_id>", methods=["GET"])
def get_user(user_id):
    """获取用户信息"""
    try:
        users = load_users()
        user = next((u for u in users.values() if u["id"] == user_id), None)
        
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/user/<user_id>", methods=["PUT"])
def update_user(user_id):
    """更新用户信息"""
    try:
        data = request.json
        users = load_users()
        
        # 查找用户
        user = next((u for u in users.values() if u["id"] == user_id), None)
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        # 更新用户信息
        if "username" in data:
            user["username"] = data["username"]
        if "email" in data:
            # 如果邮箱改变，需要更新键
            if data["email"] != user["email"]:
                if data["email"] in users:
                    return jsonify({"error": "该邮箱已被使用"}), 400
                del users[user["email"]]
                user["email"] = data["email"]
                users[data["email"]] = user
        if "gender" in data:
            user["gender"] = data["gender"]
        if "avatar" in data:
            user["avatar"] = data["avatar"]
        
        user["updatedAt"] = datetime.now().isoformat()
        save_users(users)
        
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    """上传文件并提取颜色（保留原有功能）"""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    # 提取主色
    color_thief = ColorThief(filepath)
    dominant_color = color_thief.get_color(quality=5)  # 获取主色调

    return jsonify({"dominant_color": dominant_color})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

