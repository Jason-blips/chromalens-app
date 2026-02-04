import React, { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import LipstickScanner from "./components/LipstickScanner";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import styles from "./App.module.css";

function App() {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
    const [showProfile, setShowProfile] = useState(false);

    // 监听认证状态变化
    useEffect(() => {
        if (!isAuthenticated) {
            // 未登录时，确保显示登录界面
            setAuthMode('login');
            setShowProfile(false);
        }
    }, [isAuthenticated]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div>加载中...</div>
            </div>
        );
    }

    // 如果未登录，显示登录/注册页面
    if (!isAuthenticated) {
        return (
            <div className={styles.appContainer}>
                <h1 className={styles.appTitle}>chromalens - 图像识别与色彩分析工具</h1>
                {authMode === 'login' ? (
                    <Login onSwitchToRegister={() => setAuthMode('register')} />
                ) : (
                    <Register onSwitchToLogin={() => setAuthMode('login')} />
                )}
            </div>
        );
    }

    // 如果已登录，显示主应用或个人资料
    return (
        <div className={styles.appContainer}>
            <header className={styles.header}>
                <h1 className={styles.appTitle}>chromalens - 图像识别与色彩分析工具</h1>
                <div className={styles.headerActions}>
                    <span className={styles.welcomeText}>欢迎, {user?.username || '用户'}</span>
                    <button 
                        onClick={() => setShowProfile(!showProfile)}
                        className={styles.profileButton}
                    >
                        {showProfile ? '返回' : '个人资料'}
                    </button>
                    <button 
                        onClick={logout}
                        className={styles.logoutButton}
                    >
                        登出
                    </button>
                </div>
            </header>
            
            {showProfile ? (
                <Profile />
            ) : (
                <LipstickScanner />
            )}
        </div>
    );
}

export default App;

