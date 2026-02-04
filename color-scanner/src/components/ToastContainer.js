import React from 'react';
import Toast from './Toast';
import styles from './ToastContainer.module.css';

/**
 * Toast容器组件
 * 管理多个Toast消息的显示
 */
const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className={styles.container}>
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
};

export default ToastContainer;
