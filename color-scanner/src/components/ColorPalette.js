import React from 'react';
import styles from './ColorPalette.module.css';

/**
 * 调色板组件
 * 显示从图片中提取的多个颜色
 */
const ColorPalette = ({ colors, onColorSelect }) => {
    if (!colors || colors.length === 0) {
        return null;
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
