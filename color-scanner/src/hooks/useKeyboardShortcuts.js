import { useEffect } from 'react';

/**
 * 键盘快捷键Hook
 * 提供全局键盘快捷键支持
 */
export const useKeyboardShortcuts = (shortcuts) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 忽略在输入框中的快捷键
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable
            ) {
                return;
            }

            const key = e.key.toLowerCase();
            const ctrlKey = e.ctrlKey || e.metaKey;
            const shiftKey = e.shiftKey;
            const altKey = e.altKey;

            // 构建快捷键标识
            const shortcutKey = [
                ctrlKey && 'ctrl',
                shiftKey && 'shift',
                altKey && 'alt',
                key
            ].filter(Boolean).join('+');

            // 查找匹配的快捷键
            const handler = shortcuts[shortcutKey];
            if (handler) {
                e.preventDefault();
                handler(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [shortcuts]);
};
