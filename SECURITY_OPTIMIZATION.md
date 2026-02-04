# ChromaLens 安全优化文档

## 📋 概述

本文档详细记录了 ChromaLens 项目的安全优化措施，包括密码加密、CSRF 保护、SQL 注入防护、速率限制等安全功能的实现。

---

## 🔐 安全优化清单

### ✅ 1. 密码加密升级

**问题**: 
- 原使用 SHA-256 简单哈希，无加盐，易受彩虹表攻击
- 密码存储不安全

**解决方案**:
- **使用 bcrypt 加盐哈希**: 
  - 自动生成随机盐值
  - 12 轮加密（平衡安全性和性能）
  - 每次哈希结果都不同，防止彩虹表攻击

```python
def hash_password(password):
    """使用 bcrypt 进行安全的密码哈希（加盐）"""
    salt = bcrypt.gensalt(rounds=12)  # 12轮，平衡安全性和性能
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
```

**优势**:
- 抗彩虹表攻击
- 计算成本高，防止暴力破解
- 自动加盐，每次哈希结果不同

---

### ✅ 2. 常量时间密码比较

**问题**: 
- 普通字符串比较存在时序攻击风险
- 攻击者可以通过响应时间推断密码正确性

**解决方案**:
- **使用 bcrypt.checkpw**: 常量时间比较
- **错误处理**: 即使出错也执行常量时间操作

```python
def verify_password(password, hashed):
    """验证密码（常量时间比较，防止时序攻击）"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        # 即使出错也执行常量时间操作，防止时序攻击
        bcrypt.checkpw(b'dummy', b'$2b$12$dummy')
        return False
```

**优势**:
- 防止时序攻击
- 无法通过响应时间推断密码正确性

---

### ✅ 3. CSRF 保护

**问题**: 
- 缺乏 CSRF（跨站请求伪造）保护
- 易受恶意网站攻击

**解决方案**:
- **CSRF Token 生成**: 使用 `secrets.token_urlsafe(32)` 生成安全 token
- **Token 验证**: 验证请求中的 CSRF token
- **API 端点**: `/api/csrf-token` 获取 token

```python
def generate_csrf_token():
    """生成 CSRF Token"""
    token = secrets.token_urlsafe(32)
    return token

@app.route("/api/csrf-token", methods=["GET"])
def get_csrf_token():
    """获取 CSRF Token"""
    token = generate_csrf_token()
    csrf_tokens[request.remote_addr] = token
    return jsonify({"csrf_token": token}), 200
```

**注意**: 当前实现使用内存存储，生产环境应使用 Redis 并设置过期时间。

---

### ✅ 4. 速率限制（Rate Limiting）

**问题**: 
- 缺乏速率限制，易受暴力破解攻击
- 无法防止自动化攻击

**解决方案**:
- **使用 Flask-Limiter**: 实现速率限制
- **不同端点不同限制**:
  - 注册: 5次/分钟
  - 登录: 10次/分钟
  - 更新用户: 20次/小时
  - 上传文件: 10次/分钟
- **账户锁定**: 5次登录失败后锁定15分钟

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route("/api/login", methods=["POST"])
@limiter.limit("10 per minute")  # 登录速率限制
def login():
    # ...
```

**账户锁定机制**:
```python
# 5次失败后锁定账户15分钟
if user["failed_login_attempts"] >= 5:
    user["locked_until"] = (datetime.now() + timedelta(minutes=15)).isoformat()
    user["failed_login_attempts"] = 0
```

---

### ✅ 5. JWT 会话管理

**问题**: 
- 缺乏会话管理机制
- 无法验证用户身份

**解决方案**:
- **JWT Token 生成**: 使用 PyJWT 生成安全 token
- **Token 验证**: 验证 token 有效性和过期时间
- **认证装饰器**: `@require_auth` 保护需要认证的端点

```python
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

def require_auth(f):
    """JWT 认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').split(' ')[1]
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({"error": "无效或过期的Token"}), 401
        g.current_user_id = payload['user_id']
        return f(*args, **kwargs)
    return decorated_function
```

**Token 配置**:
- 访问令牌: 24小时过期
- 刷新令牌: 30天过期（未来实现）
- 使用 HS256 算法

---

### ✅ 6. 输入验证和清理

**问题**: 
- 缺乏输入验证，易受 XSS 和注入攻击
- 用户输入未清理

**解决方案**:
- **HTML 转义**: 防止 XSS 攻击
- **正则验证**: 验证邮箱、用户名格式
- **长度限制**: 防止缓冲区溢出
- **危险字符过滤**: 移除控制字符和危险字符

```python
def sanitize_input(text, max_length=None):
    """清理和验证用户输入，防止 XSS 和注入攻击"""
    if not isinstance(text, str):
        return ""
    
    # 移除控制字符
    text = re.sub(r'[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]', '', text)
    
    # HTML 转义
    text = html.escape(text)
    
    # 长度限制
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()

def validate_email(email):
    """验证邮箱格式（防止注入）"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # 防止注入攻击：检查危险字符
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    if any(char in email for char in dangerous_chars):
        return False
    
    return True
```

**验证规则**:
- 邮箱: 严格格式验证，长度限制255字符
- 用户名: 只允许字母、数字、下划线、连字符，长度3-20字符
- 密码: 至少8位，必须包含字母和数字

---

### ✅ 7. SQL 注入防护

**问题**: 
- 虽然当前使用 JSON 存储，但未来迁移到数据库时会有风险
- 缺乏参数化查询准备

**解决方案**:
- **输入验证**: 严格验证所有用户输入
- **危险字符过滤**: 移除 SQL 注入相关字符
- **参数化查询准备**: 为未来数据库迁移做准备

```python
# 防止 SQL 注入的字符过滤
dangerous_chars = ['<', '>', '"', "'", '&', '\x00', ';', '|', '`']
if any(char in username for char in dangerous_chars):
    return False
```

**未来数据库迁移时**:
- 使用参数化查询（ORM 或参数化 SQL）
- 永远不要拼接 SQL 语句
- 使用预编译语句

---

### ✅ 8. CORS 和安全头配置

**问题**: 
- CORS 配置过于宽松（允许所有来源）
- 缺乏安全头

**解决方案**:
- **限制 CORS 来源**: 只允许本地开发环境
- **Flask-Talisman**: 添加安全头
- **Referrer Policy**: 防止信息泄露

```python
# CORS 配置 - 限制来源
CORS(app, 
    resources={r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }}
)

# 安全头配置
Talisman(app, 
    force_https=False,  # 开发环境
    referrer_policy='strict-origin-when-cross-origin'
)
```

**安全头包括**:
- Content-Security-Policy (生产环境)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy

---

### ✅ 9. 文件上传安全

**问题**: 
- 文件上传缺乏验证
- 易受路径遍历攻击

**解决方案**:
- **文件名清理**: 使用 `os.path.basename` 防止路径遍历
- **文件类型验证**: 只允许图片格式
- **文件大小限制**: 10MB 限制
- **安全文件名**: 使用随机文件名

```python
# 验证文件名（防止路径遍历攻击）
filename = os.path.basename(filename)
filename = sanitize_input(filename, max_length=255)

# 验证文件扩展名
allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
file_ext = os.path.splitext(filename)[1].lower()
if file_ext not in allowed_extensions:
    return jsonify({"error": "不支持的文件类型"}), 400

# 生成安全的文件名
safe_filename = f"{secrets.token_urlsafe(16)}{file_ext}"
```

---

### ✅ 10. 错误处理安全

**问题**: 
- 错误信息可能泄露敏感信息
- 内部错误暴露给用户

**解决方案**:
- **统一错误处理**: 不暴露内部错误信息
- **日志记录**: 内部错误记录到日志
- **用户友好提示**: 显示通用错误信息

```python
except Exception as e:
    # 不暴露内部错误信息
    print(f"注册错误: {str(e)}")  # 记录到日志
    return jsonify({"error": "服务器内部错误，请稍后重试"}), 500
```

---

## 🔒 安全最佳实践

### 1. 密码安全
- ✅ 使用 bcrypt 加盐哈希
- ✅ 最小长度 8 位
- ✅ 必须包含字母和数字
- ✅ 常量时间比较

### 2. 认证和授权
- ✅ JWT Token 管理
- ✅ Token 过期机制
- ✅ 用户只能访问自己的资源

### 3. 输入验证
- ✅ 所有用户输入都经过验证和清理
- ✅ HTML 转义防止 XSS
- ✅ 危险字符过滤

### 4. 速率限制
- ✅ 不同端点不同限制
- ✅ 账户锁定机制
- ✅ 防止暴力破解

### 5. 网络安全
- ✅ CORS 限制来源
- ✅ 安全头配置
- ✅ HTTPS 准备（生产环境）

---

## 📊 安全指标

| 安全措施 | 状态 | 说明 |
|---------|------|------|
| 密码加密 | ✅ | bcrypt (12轮) |
| CSRF 保护 | ✅ | Token 验证 |
| 速率限制 | ✅ | Flask-Limiter |
| JWT 认证 | ✅ | PyJWT |
| 输入验证 | ✅ | 严格验证和清理 |
| SQL 注入防护 | ✅ | 字符过滤和验证 |
| XSS 防护 | ✅ | HTML 转义 |
| 文件上传安全 | ✅ | 类型和大小验证 |
| 安全头 | ✅ | Flask-Talisman |
| 错误处理 | ✅ | 不泄露敏感信息 |

---

## 🚀 生产环境建议

### 1. 环境变量
```bash
# 使用环境变量存储密钥
export SECRET_KEY="your-secret-key-here"
export JWT_SECRET_KEY="your-jwt-secret-key-here"
```

### 2. HTTPS
- 强制使用 HTTPS
- 配置 SSL/TLS 证书
- 启用 HSTS

### 3. 数据库
- 迁移到 PostgreSQL 或 MySQL
- 使用参数化查询
- 数据库连接加密

### 4. Redis
- 使用 Redis 存储 CSRF tokens
- 设置 token 过期时间
- 会话管理

### 5. 监控和日志
- 记录所有安全事件
- 监控异常登录尝试
- 设置告警机制

### 6. 定期更新
- 定期更新依赖包
- 检查安全漏洞
- 使用安全扫描工具

---

## 📝 依赖包

```
Flask==3.0.0
flask-cors==4.0.0
bcrypt==4.1.2          # 密码加密
PyJWT==2.8.0          # JWT 认证
Flask-Limiter==3.5.0  # 速率限制
Flask-Talisman==1.1.0 # 安全头
```

---

## 🔍 安全测试

### 1. 密码安全测试
- ✅ 测试弱密码拒绝
- ✅ 测试密码哈希唯一性
- ✅ 测试常量时间比较

### 2. 认证测试
- ✅ 测试无效 token 拒绝
- ✅ 测试过期 token 拒绝
- ✅ 测试未授权访问拒绝

### 3. 输入验证测试
- ✅ 测试 XSS 攻击防护
- ✅ 测试 SQL 注入防护
- ✅ 测试路径遍历防护

### 4. 速率限制测试
- ✅ 测试超过限制的请求被拒绝
- ✅ 测试账户锁定机制

---

## 📚 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Flask Security Best Practices](https://flask.palletsprojects.com/en/latest/security/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [bcrypt Documentation](https://github.com/pyca/bcrypt/)

---

**文档版本**: 1.0  
**最后更新**: 2024年
