import React from 'react';
import styles from './EmptyState.module.css';

/**
 * 空状态组件
 * 用于显示没有数据时的友好提示
 */
const EmptyState = ({ 
    icon = '🎨', 
    title = '暂无数据', 
    description = '开始使用功能来查看内容',
    action = null 
}) => {
    return (
        <div className={styles.emptyState}>
            <div className={styles.icon}>{icon}</div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            {action && (
                <div className={styles.action}>
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
