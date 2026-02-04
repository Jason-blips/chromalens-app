import { useState, useEffect, useCallback } from 'react';

/**
 * 颜色历史记录Hook
 * 管理颜色分析历史，支持保存、收藏、删除等功能
 */
export const useColorHistory = () => {
    const [history, setHistory] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [maxHistorySize] = useState(50); // 最多保存50条历史记录

    // 从localStorage加载历史记录
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('chromalens_color_history');
            const savedFavorites = localStorage.getItem('chromalens_color_favorites');
            
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
            }
        } catch (err) {
            console.error('加载颜色历史失败:', err);
        }
    }, []);

    // 保存历史记录到localStorage
    const saveToStorage = useCallback((newHistory, newFavorites) => {
        try {
            localStorage.setItem('chromalens_color_history', JSON.stringify(newHistory));
            localStorage.setItem('chromalens_color_favorites', JSON.stringify(newFavorites));
        } catch (err) {
            console.error('保存颜色历史失败:', err);
        }
    }, []);

    /**
     * 添加颜色到历史记录
     * @param {Object} colorData - 颜色数据 {rgb, hex, hsl, name, confidence, timestamp, image}
     */
    const addToHistory = useCallback((colorData) => {
        const newEntry = {
            id: Date.now().toString(),
            ...colorData,
            timestamp: new Date().toISOString(),
            isFavorite: favorites.some(f => f.hex === colorData.hex)
        };

        setHistory(prev => {
            const updated = [newEntry, ...prev].slice(0, maxHistorySize);
            saveToStorage(updated, favorites);
            return updated;
        });
    }, [favorites, maxHistorySize, saveToStorage]);

    /**
     * 切换收藏状态
     * @param {string} colorId - 颜色ID
     */
    const toggleFavorite = useCallback((colorId) => {
        const color = history.find(c => c.id === colorId);
        if (!color) return;

        setFavorites(prev => {
            const isFavorite = prev.some(f => f.id === colorId);
            let updated;
            
            if (isFavorite) {
                updated = prev.filter(f => f.id !== colorId);
            } else {
                updated = [...prev, { ...color, isFavorite: true }];
            }

            // 更新历史记录中的收藏状态
            setHistory(prevHistory => {
                const updatedHistory = prevHistory.map(c => 
                    c.id === colorId ? { ...c, isFavorite: !isFavorite } : c
                );
                saveToStorage(updatedHistory, updated);
                return updatedHistory;
            });

            return updated;
        });
    }, [history, saveToStorage]);

    /**
     * 删除历史记录
     * @param {string} colorId - 颜色ID
     */
    const removeFromHistory = useCallback((colorId) => {
        setHistory(prev => {
            const updated = prev.filter(c => c.id !== colorId);
            saveToStorage(updated, favorites);
            return updated;
        });

        // 如果删除的是收藏，也从收藏中移除
        setFavorites(prev => {
            const updated = prev.filter(f => f.id !== colorId);
            saveToStorage(history.filter(c => c.id !== colorId), updated);
            return updated;
        });
    }, [favorites, history, saveToStorage]);

    /**
     * 清空历史记录
     */
    const clearHistory = useCallback(() => {
        setHistory([]);
        setFavorites([]);
        saveToStorage([], []);
    }, [saveToStorage]);

    /**
     * 导出历史记录为JSON
     */
    const exportHistory = useCallback(() => {
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `color-history-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [history]);

    /**
     * 导出历史记录为CSV
     */
    const exportHistoryCSV = useCallback(() => {
        const headers = ['时间', '颜色名称', '置信度', 'HEX', 'RGB', 'HSL'];
        const rows = history.map(color => [
            new Date(color.timestamp).toLocaleString('zh-CN'),
            color.name || '未知',
            color.confidence || 0,
            color.hex || '',
            color.rgb ? `rgb(${color.rgb.r},${color.rgb.g},${color.rgb.b})` : '',
            color.hsl ? `hsl(${color.hsl.h},${color.hsl.s}%,${color.hsl.l}%)` : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const dataBlob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `color-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [history]);

    return {
        history,
        favorites,
        addToHistory,
        toggleFavorite,
        removeFromHistory,
        clearHistory,
        exportHistory,
        exportHistoryCSV
    };
};
