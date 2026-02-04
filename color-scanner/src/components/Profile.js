import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from './Auth.module.css';

/**
 * 个人资料组件
 */
const Profile = () => {
    const { user, updateUser, logout, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        gender: user?.gender || ''
    });
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const fileInputRef = useRef(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
        setSuccess(null);
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
        setSuccess(null);

        // 验证必填字段
        if (!formData.username || !formData.email) {
            setError('请填写所有必填字段');
            return;
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('请输入有效的邮箱地址');
            return;
        }

        const updates = {
            username: formData.username,
            email: formData.email,
            gender: formData.gender,
            avatar: avatarPreview
        };

        const result = await updateUser(updates);
        if (result.success) {
            setSuccess('资料更新成功！');
        } else {
            setError(result.error);
        }
    };

    if (!user) {
        return <div>加载中...</div>;
    }

    return (
        <div className={styles.authContainer}>
            <h2 className={styles.authTitle}>个人资料</h2>
            <form onSubmit={handleSubmit} className={styles.authForm}>
                {/* 头像上传 */}
                <div className={styles.formGroup}>
                    <label>头像</label>
                    <div className={styles.avatarUpload}>
                        {avatarPreview ? (
                            <div className={styles.avatarPreview}>
                                <img src={avatarPreview} alt="头像" />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={styles.removeAvatar}
                                    style={{ background: 'rgba(59, 130, 246, 0.8)' }}
                                >
                                    ✎
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

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                    }}>
                        {success}
                    </div>
                )}

                <button 
                    type="submit" 
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? '更新中...' : '更新资料'}
                </button>

                <button 
                    type="button" 
                    onClick={logout}
                    className={styles.submitButton}
                    style={{ 
                        backgroundColor: '#ef4444',
                        marginTop: '0.5rem'
                    }}
                >
                    登出
                </button>
            </form>
        </div>
    );
};

export default Profile;
