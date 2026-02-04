import React from 'react';
import EmptyState from './EmptyState';
import styles from './ColorPalette.module.css';

/**
 * 调色板组件
 * 显示从图片中提取的多个颜色
 */
const ColorPalette = ({ colors, onColorSelect }) => {
    if (!colors || colors.length === 0) {
        return (
            <div className={styles.paletteContainer}>
                <EmptyState
                    icon="🎨"
                    title="暂无调色板"
                    description='点击"生成调色板"按钮从图片中提取多种颜色'
                />
            </div>
        );
    }

    return (
        <div className={styles.paletteContainer}>
            <h3 className={styles.paletteTitle}>调色板</h3>
            <div className={styles.paletteGrid}>
                {colors.map((color, index) => (
                    <div
                        key={index}
                        className={styles.paletteItem}
                        onClick={() => onColorSelect && onColorSelect(color)}
                        style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                    >
                        <div className={styles.colorInfo}>
                            <div className={styles.colorHex}>
                                {`#${[color.r, color.g, color.b].map(c => 
                                    c.toString(16).padStart(2, '0')
                                ).join('')}`}
                            </div>
                            <div className={styles.colorRgb}>
                                RGB({color.r}, {color.g}, {color.b})
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ColorPalette;
