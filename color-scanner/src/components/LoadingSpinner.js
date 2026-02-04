import React from 'react';
import styles from './LoadingSpinner.module.css';

/**
 * 加载动画组件
 * @param {Object} props
 * @param {string} props.size - 大小 'small' | 'medium' | 'large'
 * @param {string} props.color - 颜色
 * @param {string} props.text - 加载文本
 */
const LoadingSpinner = ({ size = 'medium', color = '#3b82f6', text = null }) => {
    return (
        <div className={styles.loadingContainer}>
            <div 
                className={`${styles.spinner} ${styles[size]}`}
                style={{ borderTopColor: color }}
            />
            {text && <p className={styles.loadingText}>{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
