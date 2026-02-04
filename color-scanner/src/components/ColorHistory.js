import React, { useState } from 'react';
import { useColorHistory } from '../hooks/useColorHistory';
import styles from './ColorHistory.module.css';

/**
 * 颜色历史记录组件
 */
const ColorHistory = ({ onColorSelect }) => {
    const { history, favorites, toggleFavorite, removeFromHistory, clearHistory, exportHistory, exportHistoryCSV } = useColorHistory();
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'favorites'

    const displayColors = activeTab === 'favorites' ? favorites : history;

    const formatColor = (color) => {
        const hex = color.hex || `#${[color.rgb?.r || 0, color.rgb?.g || 0, color.rgb?.b || 0]
            .map(c => c.toString(16).padStart(2, '0')).join('')}`;
        return hex.toUpperCase();
    };

    return (
        <div className={styles.historyContainer}>
            <div className={styles.historyHeader}>
                <h3 className={styles.historyTitle}>颜色历史</h3>
                <div className={styles.historyActions}>
                    <button
                        className={styles.exportButton}
                        onClick={exportHistory}
                        title="导出为JSON"
                    >
                        📥 JSON
                    </button>
                    <button
                        className={styles.exportButton}
                        onClick={exportHistoryCSV}
                        title="导出为CSV"
                    >
                        📥 CSV
                    </button>
                    {history.length > 0 && (
                        <button
                            className={styles.clearButton}
                            onClick={clearHistory}
                            title="清空历史"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    全部 ({history.length})
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'favorites' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('favorites')}
                >
                    收藏 ({favorites.length})
                </button>
            </div>

            {displayColors.length === 0 ? (
                <div className={styles.emptyState}>
                    {activeTab === 'favorites' ? '暂无收藏的颜色' : '暂无历史记录'}
                </div>
            ) : (
                <div className={styles.historyGrid}>
                    {displayColors.map((color) => (
                        <div
                            key={color.id}
                            className={styles.historyItem}
                            onClick={() => onColorSelect && onColorSelect(color)}
                        >
                            <div
                                className={styles.colorSwatch}
                                style={{ backgroundColor: formatColor(color) }}
                            />
                            <div className={styles.colorDetails}>
                                <div className={styles.colorName}>{color.name || '未知颜色'}</div>
                                <div className={styles.colorHex}>{formatColor(color)}</div>
                                {color.confidence && (
                                    <div className={styles.confidence}>
                                        置信度: {(color.confidence * 100).toFixed(0)}%
                                    </div>
                                )}
                                <div className={styles.colorTime}>
                                    {new Date(color.timestamp).toLocaleString('zh-CN', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                            <div className={styles.itemActions}>
                                <button
                                    className={`${styles.favoriteButton} ${color.isFavorite ? styles.favoriteActive : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(color.id);
                                    }}
                                    title={color.isFavorite ? '取消收藏' : '收藏'}
                                >
                                    {color.isFavorite ? '❤️' : '🤍'}
                                </button>
                                <button
                                    className={styles.deleteButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFromHistory(color.id);
                                    }}
                                    title="删除"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ColorHistory;
