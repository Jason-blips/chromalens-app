import React from 'react';
import styles from './SelectionOverlay.module.css';

/**
 * 选择区域覆盖层组件
 * 提供更好的视觉反馈和交互体验
 */
const SelectionOverlay = ({ 
    selectionArea, 
    isSelecting,
    onClear,
    imageSize = null 
}) => {
    if (!selectionArea) return null;

    const { x, y, width, height } = selectionArea;
    const area = Math.round(width * height);
    const aspectRatio = width > 0 && height > 0 ? (width / height).toFixed(2) : '0';

    return (
        <>
            {/* 遮罩层 */}
            <div 
                className={styles.mask}
                style={{
                    clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        ${x}px 100%, 
                        ${x}px ${y}px, 
                        ${x + width}px ${y}px, 
                        ${x + width}px ${y + height}px, 
                        ${x}px ${y + height}px, 
                        ${x}px 100%, 
                        100% 100%, 
                        100% 0%
                    )`
                }}
            />

            {/* 选择框 */}
            <div
                className={`${styles.selectionBox} ${isSelecting ? styles.selecting : ''}`}
                style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`
                }}
            >
                {/* 边框 */}
                <div className={styles.border} />
                
                {/* 四个角的调整点 */}
                <div className={`${styles.corner} ${styles.topLeft}`} />
                <div className={`${styles.corner} ${styles.topRight}`} />
                <div className={`${styles.corner} ${styles.bottomRight}`} />
                <div className={`${styles.corner} ${styles.bottomLeft}`} />
            </div>

            {/* 信息标签 */}
            {width > 50 && height > 50 && (
                <div
                    className={styles.infoLabel}
                    style={{
                        left: `${x}px`,
                        top: `${y - 40}px`
                    }}
                >
                    <div className={styles.infoContent}>
                        <span className={styles.infoItem}>
                            {Math.round(width)} × {Math.round(height)} px
                        </span>
                        <span className={styles.infoItem}>
                            {area.toLocaleString()} 像素
                        </span>
                        {imageSize && imageSize.width > 0 && imageSize.height > 0 && (
                            <span className={styles.infoItem}>
                                {((width / imageSize.width) * 100).toFixed(1)}% × {((height / imageSize.height) * 100).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* 清除按钮 */}
            {!isSelecting && width > 50 && height > 50 && (
                <button
                    className={styles.clearButton}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear && onClear();
                    }}
                    style={{
                        left: `${x + width + 8}px`,
                        top: `${y}px`
                    }}
                    title="清除选择 (Esc)"
                    aria-label="清除选择"
                >
                    ×
                </button>
            )}
        </>
    );
};

export default SelectionOverlay;
