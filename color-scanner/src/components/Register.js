import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from './Auth.module.css';

/**
 * 注册组件
 */
const Register = ({ onSwitchToLogin }) => {
    const { register, error: authError, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        gender: ''
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('头像文件大小不能超过2MB');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                setError('请选择图片文件');
                return;
            }

            setAvatar(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setAvatarPreview(e.target.result);
            };
            reader.readAsDataURL(file);
            setError(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // 验证必填字段
        if (!formData.username || !formData.email || !formData.password) {
            setError('请填写所有必填字段');
            return;
        }

        // 验证密码
        if (formData.password !== formData.confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        if (formData.password.length < 6) {
            setError('密码长度至少6位');
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('请输入有效的邮箱地址');
            return;
        }

        // 准备注册数据
        const registerData = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            gender: formData.gender,
            avatar: avatarPreview // 使用base64格式
        };

        const result = await register(registerData);
        if (!result.success) {
            setError(result.error);
        } else {
            // 注册成功，用户已自动登录，App.js 会自动跳转到主页
            // 不需要手动导航，因为 useAuth 已经更新了 isAuthenticated 状态
        }
    };

    return (
        <div className={styles.authContainer}>
            <h2 className={styles.authTitle}>注册</h2>
            <form onSubmit={handleSubmit} className={styles.authForm}>
                {/* 头像上传 */}
                <div className={styles.formGroup}>
                    <label>头像（可选）</label>
                    <div className={styles.avatarUpload}>
                        {avatarPreview ? (
                            <div className={styles.avatarPreview}>
                                <img src={avatarPreview} alt="头像预览" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAvatar(null);
                                        setAvatarPreview(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                    className={styles.removeAvatar}
                                >
                                    ×
                                </button>
                            </div>
                        ) : (
                            <div 
                                className={styles.avatarPlaceholder}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span>点击上传头像</span>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="username">用户名 *</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="请输入用户名"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="email">邮箱 *</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="请输入邮箱"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="gender">性别</label>
                    <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                    >
                        <option value="">请选择</option>
                        <option value="male">男</option>
                        <option value="female">女</option>
                        <option value="other">其他</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password">密码 *</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="至少6位字符"
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="confirmPassword">确认密码 *</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="请再次输入密码"
                        required
                    />
                </div>

                {(error || authError) && (
                    <div className={styles.errorMessage}>
                        {error || authError}
                    </div>
                )}

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? '注册中...' : '注册'}
                </button>

                <div className={styles.switchLink}>
                    已有账号？{' '}
                    <button 
                        type="button" 
                        onClick={onSwitchToLogin}
                        className={styles.linkButton}
                    >
                        立即登录
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Register;
