import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import styles from './Auth.module.css';

/**
 * 登录组件
 */
const Login = ({ onSwitchToRegister }) => {
    const { login, error: authError, isLoading } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.email || !formData.password) {
            setError('请填写所有字段');
            return;
        }

        const result = await login(formData);
        if (!result.success) {
            setError(result.error);
        }
    };

    return (
        <div className={styles.authContainer}>
            <h2 className={styles.authTitle}>登录</h2>
            <form onSubmit={handleSubmit} className={styles.authForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="email">邮箱</label>
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
                    <label htmlFor="password">密码</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="请输入密码"
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
                    {isLoading ? '登录中...' : '登录'}
                </button>

                <div className={styles.switchLink}>
                    还没有账号？{' '}
                    <button 
                        type="button" 
                        onClick={onSwitchToRegister}
                        className={styles.linkButton}
                    >
                        立即注册
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Login;
