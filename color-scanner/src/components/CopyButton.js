import React, { useState } from 'react';
import styles from './CopyButton.module.css';

/**
 * 复制按钮组件
 * 一键复制文本到剪贴板
 */
const CopyButton = ({ text, label = '复制', onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onCopy && onCopy(text);
        } catch (err) {
            console.error('复制失败:', err);
            // 降级方案：使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                onCopy && onCopy(text);
            } catch (e) {
                console.error('复制失败:', e);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <button
            className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
            title={copied ? '已复制!' : `复制 ${label}`}
            aria-label={`复制 ${label}`}
        >
            {copied ? '✓ 已复制' : '📋 复制'}
        </button>
    );
};

export default CopyButton;
