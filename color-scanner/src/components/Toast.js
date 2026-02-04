import React, { useEffect } from 'react';
import styles from './Toast.module.css';

/**
 * Toast通知组件
 * 用于显示成功、错误、信息等提示消息
 */
const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose && onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <span className={styles.icon}>{icons[type] || icons.info}</span>
            <span className={styles.message}>{message}</span>
            <button 
                className={styles.closeButton}
                onClick={onClose}
                aria-label="关闭"
            >
                ×
            </button>
        </div>
    );
};

export default Toast;
