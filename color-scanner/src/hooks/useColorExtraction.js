import { useState, useEffect, useCallback } from 'react';
import ColorThief from 'color-thief';
import { 
    extractDominantColorFromCanvas, 
    extractDominantColorFromVideo,
    extractDominantColorFromImageData 
} from '../utils/fastColorExtractor';

/**
 * 颜色提取自定义Hook
 * 从图像中提取主色调
 */
export const useColorExtraction = () => {
    const [dominantColor, setDominantColor] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState(null);

    /**
     * 从图像URL或base64数据中提取主色调
     * @param {string} imageSrc - 图像URL或base64数据
     * @param {number} quality - 提取质量 (1-10，默认5)
     */
    const extractDominantColor = useCallback(async (imageSrc, quality = 5) => {
        if (!imageSrc) {
            setDominantColor(null);
            return;
        }

        setIsExtracting(true);
        setError(null);

        try {
            const imgElement = document.createElement('img');
            imgElement.crossOrigin = 'Anonymous';
            
            // 使用Promise处理图像加载
            await new Promise((resolve, reject) => {
                imgElement.onload = resolve;
                imgElement.onerror = reject;
                imgElement.src = imageSrc;
            });

            // 临时添加到DOM以便ColorThief可以访问
            imgElement.style.display = 'none';
            document.body.appendChild(imgElement);

            const colorThief = new ColorThief();
            const color = colorThief.getColor(imgElement, quality);
            
            // 清理临时元素
            document.body.removeChild(imgElement);

            setDominantColor({
                r: color[0],
                g: color[1],
                b: color[2]
            });
        } catch (err) {
            console.error('Error extracting color:', err);
            setError('提取颜色失败');
            setDominantColor(null);
        } finally {
            setIsExtracting(false);
        }
    }, []);

    /**
     * 从Canvas元素中快速提取主色调（优化版本，响应时间<150ms）
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @param {Object} options - 提取选项
     */
    const extractColorFromCanvas = useCallback((canvas, options = {}) => {
        if (!canvas) {
            return;
        }

        setIsExtracting(true);
        setError(null);

        try {
            // 使用优化的像素采样算法
            const color = extractDominantColorFromCanvas(canvas, options);
            setDominantColor(color);
        } catch (err) {
            console.error('Error extracting color from canvas:', err);
            setError('从画布提取颜色失败');
        } finally {
            setIsExtracting(false);
        }
    }, []);

    /**
     * 从视频元素中实时提取主色调（优化版本）
     * @param {HTMLVideoElement} video - Video元素
     * @param {HTMLCanvasElement} canvas - 临时Canvas元素
     * @param {Object} options - 提取选项
     */
    const extractColorFromVideo = useCallback((video, canvas, options = {}) => {
        if (!video || !canvas) {
            return;
        }

        setIsExtracting(true);
        setError(null);

        try {
            // 使用优化的视频帧分析
            const color = extractDominantColorFromVideo(video, canvas, options);
            setDominantColor(color);
        } catch (err) {
            console.error('Error extracting color from video:', err);
            setError('从视频提取颜色失败');
        } finally {
            setIsExtracting(false);
        }
    }, []);

    /**
     * 清除提取的颜色
     */
    const clearColor = useCallback(() => {
        setDominantColor(null);
        setError(null);
    }, []);

    return {
        dominantColor,
        isExtracting,
        error,
        extractDominantColor,
        extractColorFromCanvas,
        extractColorFromVideo,
        clearColor
    };
};
