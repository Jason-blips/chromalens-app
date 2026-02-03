import React, { useState, useEffect, useCallback } from 'react';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useColorExtraction } from '../hooks/useColorExtraction';
import { useColorConverter } from '../hooks/useColorConverter';
import { predictColorName } from '../utils/colorNaming';
import styles from './LipstickScanner.module.css';

/**
 * 色彩分析工具组件
 * 使用模块化Hooks实现，提高代码复用性和可维护性
 */
const LipstickScanner = () => {
    const [image, setImage] = useState(null);
    const [colorName, setColorName] = useState(null);
    const [isNaming, setIsNaming] = useState(false);

    // 使用摄像头捕获Hook
    const {
        videoRef,
        canvasRef,
        isCameraActive,
        error: cameraError,
        startCamera,
        stopCamera,
        captureImage
    } = useCameraCapture();

    // 使用颜色提取Hook
    const {
        dominantColor,
        isExtracting,
        error: extractionError,
        extractDominantColor,
        extractColorFromCanvas,
        clearColor
    } = useColorExtraction();

    // 使用颜色转换Hook
    const {
        colorFormats,
        updateFromRgb
    } = useColorConverter();

    /**
     * 处理图像捕获
     */
    const handleCapture = useCallback(() => {
        const imageData = captureImage();
        if (imageData) {
            setImage(imageData);
            // 从Canvas提取颜色
            extractColorFromCanvas(canvasRef.current);
        }
    }, [captureImage, extractColorFromCanvas]);

    /**
     * 处理文件上传
     */
    const handleFileUpload = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                setImage(imageData);
                extractDominantColor(imageData);
            };
            reader.readAsDataURL(file);
        }
    }, [extractDominantColor]);

    /**
     * 当提取到主色调时，更新颜色转换和命名
     */
    useEffect(() => {
        if (dominantColor) {
            // 更新颜色转换
            updateFromRgb(dominantColor.r, dominantColor.g, dominantColor.b);
            
            // 预测颜色名称
            setIsNaming(true);
            predictColorName(dominantColor.r, dominantColor.g, dominantColor.b)
                .then(result => {
                    setColorName(result);
                })
                .catch(err => {
                    console.error('Error predicting color name:', err);
                    setColorName({ name: '未知颜色', confidence: 0 });
                })
                .finally(() => {
                    setIsNaming(false);
                });
        } else {
            setColorName(null);
        }
    }, [dominantColor, updateFromRgb]);

    /**
     * 清除所有数据
     */
    const handleClear = useCallback(() => {
        setImage(null);
        clearColor();
        setColorName(null);
    }, [clearColor]);

    // 可复用的按钮组件
    const Button = ({ onClick, text, color, disabled = false }) => (
        <button 
            onClick={onClick} 
            disabled={disabled}
            className={`${styles.button} ${color === 'blue' ? styles.buttonBlue : color === 'green' ? styles.buttonGreen : styles.buttonGray}`}
        >
            {text}
        </button>
    );

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>色彩分析工具</h2>
            
            {/* 错误提示 */}
            {(cameraError || extractionError) && (
                <div className={styles.errorMessage}>
                    {cameraError || extractionError}
                </div>
            )}

            {/* 视频预览 */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className={styles.video}
                style={{ display: isCameraActive ? 'block' : 'none' }}
            />
            
            {/* 控制按钮 */}
            <div className={styles.buttonGroup}>
                {!isCameraActive ? (
                    <Button onClick={startCamera} text="启动摄像头" color="blue" />
                ) : (
                    <>
                        <Button onClick={stopCamera} text="停止摄像头" color="gray" />
                        <Button 
                            onClick={handleCapture} 
                            text="捕获图像" 
                            color="green"
                            disabled={!isCameraActive}
                        />
                    </>
                )}
            </div>

            {/* 文件上传 */}
            <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className={styles.fileInput}
                id="file-upload"
            />
            <label htmlFor="file-upload" className={styles.fileLabel}>
                或选择本地图片
            </label>

            {/* 隐藏的Canvas用于处理 */}
            <canvas ref={canvasRef} className={styles.canvas} />
            
            {/* 图像预览和颜色信息 */}
            {image && (
                <div className={styles.resultContainer}>
                    <img src={image} alt="分析中" className={styles.imagePreview} />
                    
                    {/* 加载状态 */}
                    {(isExtracting || isNaming) && (
                        <div className={styles.loading}>分析中...</div>
                    )}

                    {/* 颜色显示 */}
                    {dominantColor && colorFormats.hex && (
                        <div className={styles.colorInfo}>
                            <div 
                                className={styles.colorDisplay} 
                                style={{ backgroundColor: colorFormats.rgbString }}
                            />
                            
                            {/* 颜色格式信息 */}
                            <div className={styles.colorFormats}>
                                <div className={styles.colorFormatItem}>
                                    <span className={styles.formatLabel}>HEX:</span>
                                    <span className={styles.formatValue}>{colorFormats.hex}</span>
                                </div>
                                <div className={styles.colorFormatItem}>
                                    <span className={styles.formatLabel}>RGB:</span>
                                    <span className={styles.formatValue}>{colorFormats.rgbString}</span>
                                </div>
                                <div className={styles.colorFormatItem}>
                                    <span className={styles.formatLabel}>HSL:</span>
                                    <span className={styles.formatValue}>{colorFormats.hslString}</span>
                                </div>
                            </div>

                            {/* 颜色名称 */}
                            {colorName && (
                                <div className={styles.colorName}>
                                    <span className={styles.nameLabel}>颜色名称:</span>
                                    <span className={styles.nameValue}>
                                        {colorName.name}
                                        {colorName.confidence > 0 && (
                                            <span className={styles.confidence}>
                                                ({Math.round(colorName.confidence * 100)}%)
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 清除按钮 */}
                    <Button onClick={handleClear} text="清除" color="gray" />
                </div>
            )}
        </div>
    );
};

export default LipstickScanner;
