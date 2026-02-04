/**
 * 输入验证工具函数
 */

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

/**
 * 验证邮箱格式（别名）
 */
export const validateEmail = isValidEmail;

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {Object} {valid: boolean, strength: string, message: string}
 */
export const validatePassword = (password) => {
    if (!password || typeof password !== 'string') {
        return {
            valid: false,
            strength: 'weak',
            message: '密码不能为空'
        };
    }

    if (password.length < 6) {
        return {
            valid: false,
            strength: 'weak',
            message: '密码长度至少6位'
        };
    }

    if (password.length < 8) {
        return {
            valid: true,
            strength: 'medium',
            message: '密码强度：中等'
        };
    }

    // 检查是否包含数字、字母、特殊字符
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (hasNumber && hasLetter && hasSpecial) {
        return {
            valid: true,
            strength: 'strong',
            message: '密码强度：强'
        };
    }

    if ((hasNumber && hasLetter) || (hasLetter && hasSpecial) || (hasNumber && hasSpecial)) {
        return {
            valid: true,
            strength: 'medium',
            message: '密码强度：中等'
        };
    }

    return {
        valid: true,
        strength: 'weak',
        message: '密码强度：弱'
    };
};

/**
 * 验证颜色值
 * @param {Object} color - 颜色对象 {r, g, b}
 * @returns {boolean} 是否有效
 */
export const isValidColor = (color) => {
    if (!color || typeof color !== 'object') return false;
    const { r, g, b } = color;
    return (
        typeof r === 'number' && r >= 0 && r <= 255 &&
        typeof g === 'number' && g >= 0 && g <= 255 &&
        typeof b === 'number' && b >= 0 && b <= 255
    );
};

/**
 * 验证HEX颜色值
 * @param {string} hex - HEX颜色值
 * @returns {boolean} 是否有效
 */
export const isValidHex = (hex) => {
    if (!hex || typeof hex !== 'string') return false;
    const hexRegex = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(hex);
};

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {Array<string>} allowedTypes - 允许的文件类型 ['image/jpeg', 'image/png']
 * @param {number} maxSize - 最大文件大小（字节）
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateFile = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxSize = 10 * 1024 * 1024) => {
    if (!file) {
        return {
            valid: false,
            message: '请选择文件'
        };
    }

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            message: `不支持的文件类型。支持的类型：${allowedTypes.join(', ')}`
        };
    }

    if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            message: `文件大小不能超过 ${maxSizeMB}MB`
        };
    }

    return {
        valid: true,
        message: '文件验证通过'
    };
};

/**
 * 清理用户输入（防止XSS）
 * @param {string} input - 用户输入
 * @returns {string} 清理后的字符串
 */
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

/**
 * 验证用户名
 * @param {string} username - 用户名
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return {
            valid: false,
            message: '用户名不能为空'
        };
    }

    const trimmed = username.trim();
    
    if (trimmed.length < 3) {
        return {
            valid: false,
            message: '用户名长度至少3个字符'
        };
    }

    if (trimmed.length > 20) {
        return {
            valid: false,
            message: '用户名长度不能超过20个字符'
        };
    }

    // 只允许字母、数字、下划线、中文字符
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
    if (!usernameRegex.test(trimmed)) {
        return {
            valid: false,
            message: '用户名只能包含字母、数字、下划线和中文'
        };
    }

    return {
        valid: true,
        message: '用户名有效'
    };
};
