import { useState, useEffect, useCallback } from 'react';

/**
 * 用户认证自定义Hook
 * 管理用户登录、注册、登出状态
 */
export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 从localStorage加载用户信息，并监听变化
    useEffect(() => {
        const loadUser = () => {
            try {
                const savedUser = localStorage.getItem('chromalens_user');
                if (savedUser) {
                    const userData = JSON.parse(savedUser);
                    setUser(userData);
                    setIsAuthenticated(true);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (err) {
                console.error('加载用户信息失败:', err);
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        
        // 初始加载
        loadUser();
        
        // 监听storage事件，当其他标签页或组件修改localStorage时，同步更新
        const handleStorageChange = (e) => {
            if (e.key === 'chromalens_user') {
                loadUser();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // 定期检查localStorage（用于同一标签页内的状态同步）
        // 使用ref来避免闭包问题
        let lastUserStr = localStorage.getItem('chromalens_user');
        const intervalId = setInterval(() => {
            const savedUser = localStorage.getItem('chromalens_user');
            if (savedUser !== lastUserStr) {
                lastUserStr = savedUser;
                loadUser();
            }
        }, 300); // 每300ms检查一次
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
        };
    }, []); // 只在组件挂载时运行一次

    /**
     * 用户注册
     */
    const register = useCallback(async (userData) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // 尝试连接后端API
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    gender: userData.gender || '',
                    avatar: userData.avatar || null
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 注册成功，但不自动登录，返回成功信息
                // 用户需要手动登录
                return { success: true, user: result.user, message: '注册成功！请登录' };
            } else {
                throw new Error(result.error || '注册失败');
            }
        } catch (err) {
            console.error('注册错误:', err);
            
            // 检测网络错误（Failed to fetch通常是TypeError）
            const isNetworkError = err.name === 'TypeError' || 
                                  err.message?.includes('fetch') || 
                                  err.message?.includes('Failed to fetch') ||
                                  err.message?.includes('NetworkError');
            
            if (isNetworkError) {
                const errorMsg = '无法连接到后端服务。请确保后端服务正在运行（http://localhost:5000）。\n\n启动方法：\n1. 打开终端\n2. 进入 backend 目录\n3. 运行: python app.py';
                console.error(errorMsg);
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }
            
            const errorMsg = err.message || '注册失败';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 用户登录
     */
    const login = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // 尝试连接后端API
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: credentials.email,
                    password: credentials.password
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 保存到localStorage
                localStorage.setItem('chromalens_user', JSON.stringify(result.user));
                setUser(result.user);
                setIsAuthenticated(true);
                return { success: true, user: result.user };
            } else {
                throw new Error(result.error || '登录失败');
            }
        } catch (err) {
            console.error('登录错误:', err);
            
            // 检测网络错误
            const isNetworkError = err.name === 'TypeError' || 
                                  err.message?.includes('fetch') || 
                                  err.message?.includes('Failed to fetch') ||
                                  err.message?.includes('NetworkError');
            
            if (isNetworkError) {
                const errorMsg = '无法连接到后端服务。请确保后端服务正在运行（http://localhost:5000）。\n\n启动方法：\n1. 打开终端\n2. 进入 backend 目录\n3. 运行: python app.py';
                console.error(errorMsg);
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }
            
            const errorMsg = err.message || '登录失败';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * 用户登出
     */
    const logout = useCallback(() => {
        localStorage.removeItem('chromalens_user');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
    }, []);

    /**
     * 更新用户信息
     */
    const updateUser = useCallback(async (updates) => {
        if (!user) return { success: false, error: '用户未登录' };
        
        setIsLoading(true);
        setError(null);
        
        try {
            // 尝试连接后端API
            const response = await fetch(`http://localhost:5000/api/user/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // 更新localStorage
                localStorage.setItem('chromalens_user', JSON.stringify(result.user));
                setUser(result.user);
                return { success: true, user: result.user };
            } else {
                throw new Error(result.error || '更新失败');
            }
        } catch (err) {
            // 如果后端不可用，使用本地存储作为fallback
            if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
                console.warn('后端服务不可用，使用本地存储模式');
                
                // 更新本地用户信息
                const updatedUser = { 
                    ...user, 
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('chromalens_user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                return { success: true, user: updatedUser };
            }
            
            const errorMsg = err.message || '更新失败';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        register,
        login,
        logout,
        updateUser
    };
};
