from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from colorthief import ColorThief
import os
import json
import bcrypt
import jwt
import secrets
import re
import html
from datetime import datetime, timedelta
from functools import wraps
from urllib.parse import quote

app = Flask(__name__)

# 安全配置
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_urlsafe(32))
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# 安全头配置
Talisman(app, 
    force_https=False,  # 开发环境不需要强制HTTPS
    strict_transport_security=False,  # 开发环境
    content_security_policy=None,  # 允许内联脚本（开发环境）
    referrer_policy='strict-origin-when-cross-origin'
)

# CORS 配置 - 限制来源
CORS(app, 
    resources={r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],  # 只允许本地开发
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["X-CSRF-Token"],
        "supports_credentials": True
    }},
    supports_credentials=True
)

# 速率限制
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

UPLOAD_FOLDER = "uploads"
USERS_FOLDER = "users"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(USERS_FOLDER, exist_ok=True)

# 简单的用户数据存储（实际应该使用数据库）
USERS_FILE = os.path.join(USERS_FOLDER, "users.json")

# CSRF Token 存储（生产环境应使用 Redis）
csrf_tokens = {}

def load_users():
    """加载用户数据"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_users(users):
    """保存用户数据"""
    # 原子性写入：先写入临时文件，再重命名
    temp_file = USERS_FILE + '.tmp'
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
    os.replace(temp_file, USERS_FILE)

def hash_password(password):
    """使用 bcrypt 进行安全的密码哈希（加盐）"""
    # bcrypt 自动生成盐并包含在哈希中
    salt = bcrypt.gensalt(rounds=12)  # 12轮，平衡安全性和性能
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, hashed):
    """验证密码（常量时间比较，防止时序攻击）"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        # 即使出错也执行常量时间操作，防止时序攻击
        bcrypt.checkpw(b'dummy', b'$2b$12$dummy')
        return False

def generate_csrf_token():
    """生成 CSRF Token"""
    token = secrets.token_urlsafe(32)
    return token

def validate_csrf_token(token):
    """验证 CSRF Token"""
    if not token:
        return False
    # 简单的内存存储验证（生产环境应使用 Redis 或数据库）
    return token in csrf_tokens.values()

def sanitize_input(text, max_length=None):
    """清理和验证用户输入，防止 XSS 和注入攻击"""
    if not isinstance(text, str):
        return ""
    
    # 移除控制字符（除了换行和制表符）
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
    
    # HTML 转义
    text = html.escape(text)
    
    # 长度限制
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()

def validate_email(email):
    """验证邮箱格式（防止注入）"""
    if not email or not isinstance(email, str):
        return False
    
    # 长度限制
    if len(email) > 255:
        return False
    
    # 严格的邮箱格式验证
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # 防止注入攻击：检查危险字符
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    if any(char in email for char in dangerous_chars):
        return False
    
    return True

def validate_username(username):
    """验证用户名格式"""
    if not username or not isinstance(username, str):
        return False
    
    # 长度限制
    if len(username) < 3 or len(username) > 20:
        return False
    
    # 只允许字母、数字、下划线和连字符
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return False
    
    # 防止注入
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00', ';', '|', '`']
    if any(char in username for char in dangerous_chars):
        return False
    
    return True

def generate_jwt_token(user_id, email):
    """生成 JWT Token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_jwt_token(token):
    """验证 JWT Token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """JWT 认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({"error": "无效的认证头"}), 401
        
        if not token:
            return jsonify({"error": "需要认证"}), 401
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({"error": "无效或过期的Token"}), 401
        
        g.current_user_id = payload['user_id']
        g.current_user_email = payload['email']
        return f(*args, **kwargs)
    
    return decorated_function

@app.route("/api/csrf-token", methods=["GET"])
def get_csrf_token():
    """获取 CSRF Token"""
    token = generate_csrf_token()
    # 存储 token（生产环境应使用 Redis，设置过期时间）
    csrf_tokens[request.remote_addr] = token
    return jsonify({"csrf_token": token}), 200

@app.route("/api/register", methods=["POST"])
@limiter.limit("5 per minute")  # 注册速率限制
def register():
    """用户注册"""
    try:
        if not request.is_json:
            return jsonify({"error": "请求必须是JSON格式"}), 400
            
        data = request.json
        if not data:
            return jsonify({"error": "请求数据不能为空"}), 400
        
        # CSRF 保护（可选，根据需求）
        # csrf_token = request.headers.get('X-CSRF-Token')
        # if not validate_csrf_token(csrf_token):
        #     return jsonify({"error": "无效的CSRF Token"}), 403
        
        users = load_users()
        
        # 验证和清理输入
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        username_raw = data.get("username", "").strip()
        
        # 输入验证
        if not email or not password or not username_raw:
            return jsonify({"error": "缺少必填字段"}), 400
        
        # 邮箱验证
        if not validate_email(email):
            return jsonify({"error": "邮箱格式无效"}), 400
        
        # 用户名验证和清理
        if not validate_username(username_raw):
            return jsonify({"error": "用户名格式无效。只能包含字母、数字、下划线和连字符，长度3-20字符"}), 400
        
        username = sanitize_input(username_raw, max_length=20)
        
        # 密码强度验证
        if len(password) < 8:  # 提高最小长度
            return jsonify({"error": "密码长度至少8位"}), 400
        
        if len(password) > 128:
            return jsonify({"error": "密码长度不能超过128位"}), 400
        
        # 密码强度检查（可选）
        if not re.search(r'[A-Za-z]', password) or not re.search(r'[0-9]', password):
            return jsonify({"error": "密码必须包含字母和数字"}), 400
        
        # 检查邮箱是否已存在（常量时间操作）
        if email in users:
            return jsonify({"error": "该邮箱已被注册"}), 400
        
        # 检查用户名是否已存在
        existing_usernames = [u.get("username", "").lower() for u in users.values()]
        if username.lower() in existing_usernames:
            return jsonify({"error": "该用户名已被使用"}), 400
        
        # 验证头像数据大小（如果提供）
        avatar = data.get("avatar")
        if avatar:
            if not isinstance(avatar, str):
                return jsonify({"error": "头像数据格式无效"}), 400
            if len(avatar) > 2 * 1024 * 1024:  # 2MB限制
                return jsonify({"error": "头像数据过大"}), 400
        
        # 创建新用户
        user_id = str(len(users) + 1)
        user = {
            "id": user_id,
            "username": username,
            "email": email,
            "password": hash_password(password),  # 使用 bcrypt
            "gender": sanitize_input(data.get("gender", ""), max_length=10),
            "avatar": avatar,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "failed_login_attempts": 0,
            "locked_until": None
        }
        
        users[email] = user
        save_users(users)
        
        # 生成 JWT Token
        token = generate_jwt_token(user_id, email)
        
        # 返回用户信息（不包含密码）
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({
            "success": True, 
            "user": user_response,
            "token": token
        }), 201
        
    except KeyError as e:
        return jsonify({"error": f"缺少必要字段: {str(e)}"}), 400
    except ValueError as e:
        return jsonify({"error": f"数据格式错误: {str(e)}"}), 400
    except Exception as e:
        # 不暴露内部错误信息
        print(f"注册错误: {str(e)}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")  # 登录速率限制
def login():
    """用户登录"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "请求数据不能为空"}), 400
        
        users = load_users()
        
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        if not email or not password:
            return jsonify({"error": "邮箱和密码不能为空"}), 400
        
        # 验证邮箱格式
        if not validate_email(email):
            return jsonify({"error": "邮箱或密码错误"}), 401
        
        # 验证用户（常量时间操作，防止用户枚举）
        user = users.get(email)
        if not user:
            # 即使用户不存在也执行密码验证，防止时序攻击
            dummy_hash = "$2b$12$" + "x" * 53
            verify_password(password, dummy_hash)
            return jsonify({"error": "邮箱或密码错误"}), 401
        
        # 检查账户是否被锁定
        if user.get("locked_until"):
            locked_until = datetime.fromisoformat(user["locked_until"])
            if datetime.now() < locked_until:
                remaining = int((locked_until - datetime.now()).total_seconds())
                return jsonify({
                    "error": f"账户已被锁定，请{remaining}秒后重试"
                }), 423
        
        # 验证密码（常量时间比较）
        if not verify_password(password, user["password"]):
            # 增加失败次数
            user["failed_login_attempts"] = user.get("failed_login_attempts", 0) + 1
            
            # 5次失败后锁定账户15分钟
            if user["failed_login_attempts"] >= 5:
                user["locked_until"] = (datetime.now() + timedelta(minutes=15)).isoformat()
                user["failed_login_attempts"] = 0
            
            save_users(users)
            return jsonify({"error": "邮箱或密码错误"}), 401
        
        # 登录成功，重置失败次数
        user["failed_login_attempts"] = 0
        user["locked_until"] = None
        user["last_login"] = datetime.now().isoformat()
        save_users(users)
        
        # 生成 JWT Token
        token = generate_jwt_token(user["id"], email)
        
        # 返回用户信息（不包含密码）
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({
            "success": True, 
            "user": user_response,
            "token": token
        }), 200
        
    except Exception as e:
        print(f"登录错误: {str(e)}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

@app.route("/api/user/<user_id>", methods=["GET"])
@require_auth
def get_user(user_id):
    """获取用户信息（需要认证）"""
    try:
        # 只能获取自己的信息
        if user_id != g.current_user_id:
            return jsonify({"error": "无权访问"}), 403
        
        users = load_users()
        user = next((u for u in users.values() if u["id"] == user_id), None)
        
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 200
        
    except Exception as e:
        print(f"获取用户错误: {str(e)}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

@app.route("/api/user/<user_id>", methods=["PUT"])
@require_auth
@limiter.limit("20 per hour")  # 更新速率限制
def update_user(user_id):
    """更新用户信息（需要认证）"""
    try:
        # 只能更新自己的信息
        if user_id != g.current_user_id:
            return jsonify({"error": "无权访问"}), 403
        
        data = request.json
        if not data:
            return jsonify({"error": "请求数据不能为空"}), 400
        
        users = load_users()
        
        # 查找用户
        user = next((u for u in users.values() if u["id"] == user_id), None)
        if not user:
            return jsonify({"error": "用户不存在"}), 404
        
        # 更新用户信息（验证和清理输入）
        if "username" in data:
            username_raw = data["username"].strip()
            if not validate_username(username_raw):
                return jsonify({"error": "用户名格式无效"}), 400
            username = sanitize_input(username_raw, max_length=20)
            # 检查用户名是否已被其他用户使用
            existing_usernames = [
                u.get("username", "").lower() 
                for u in users.values() 
                if u["id"] != user_id
            ]
            if username.lower() in existing_usernames:
                return jsonify({"error": "该用户名已被使用"}), 400
            user["username"] = username
        
        if "email" in data:
            new_email = data["email"].strip().lower()
            if not validate_email(new_email):
                return jsonify({"error": "邮箱格式无效"}), 400
            if new_email != user["email"]:
                if new_email in users:
                    return jsonify({"error": "该邮箱已被使用"}), 400
                del users[user["email"]]
                user["email"] = new_email
                users[new_email] = user
        
        if "gender" in data:
            user["gender"] = sanitize_input(data["gender"], max_length=10)
        
        if "avatar" in data:
            avatar = data["avatar"]
            if avatar and len(avatar) > 2 * 1024 * 1024:
                return jsonify({"error": "头像数据过大"}), 400
            user["avatar"] = avatar
        
        user["updatedAt"] = datetime.now().isoformat()
        save_users(users)
        
        user_response = {k: v for k, v in user.items() if k != "password"}
        return jsonify({"success": True, "user": user_response}), 200
        
    except Exception as e:
        print(f"更新用户错误: {str(e)}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

@app.route("/upload", methods=["POST"])
@limiter.limit("10 per minute")  # 上传速率限制
def upload_file():
    """上传文件并提取颜色（保留原有功能）"""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files["file"]
        
        # 验证文件名（防止路径遍历攻击）
        filename = file.filename
        if not filename:
            return jsonify({"error": "文件名不能为空"}), 400
        
        # 清理文件名，防止路径遍历
        filename = os.path.basename(filename)
        filename = sanitize_input(filename, max_length=255)
        
        # 验证文件扩展名
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({"error": "不支持的文件类型"}), 400
        
        # 生成安全的文件名
        safe_filename = f"{secrets.token_urlsafe(16)}{file_ext}"
        filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
        
        # 验证文件大小（10MB限制）
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return jsonify({"error": "文件大小不能超过10MB"}), 400
        
        file.save(filepath)
        
        # 提取主色
        color_thief = ColorThief(filepath)
        dominant_color = color_thief.get_color(quality=5)
        
        return jsonify({"dominant_color": dominant_color}), 200
        
    except Exception as e:
        print(f"上传错误: {str(e)}")
        return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    """速率限制错误处理"""
    return jsonify({"error": "请求过于频繁，请稍后再试"}), 429

@app.errorhandler(404)
def not_found_handler(e):
    """404错误处理"""
    return jsonify({"error": "资源不存在"}), 404

@app.errorhandler(500)
def internal_error_handler(e):
    """500错误处理"""
    return jsonify({"error": "服务器内部错误，请稍后重试"}), 500

if __name__ == "__main__":
    # 生产环境应设置 debug=False
    app.run(host="0.0.0.0", port=5000, debug=True)
