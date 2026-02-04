import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useColorExtraction } from '../hooks/useColorExtraction';
import { useColorConverter } from '../hooks/useColorConverter';
import { useColorHistory } from '../hooks/useColorHistory';
import { predictColorName } from '../utils/colorNaming';
import { extractColorPalette } from '../utils/fastColorExtractor';
import ColorPalette from './ColorPalette';
import ColorHistory from './ColorHistory';
import styles from './LipstickScanner.module.css';

/**
 * 色彩分析工具组件
 * 使用模块化Hooks实现，提高代码复用性和可维护性
 */
const LipstickScanner = () => {
    const [image, setImage] = useState(null);
    const [colorName, setColorName] = useState(null);
    const [isNaming, setIsNaming] = useState(false);
    const [selectionArea, setSelectionArea] = useState(null); // 选择区域 {x, y, width, height}
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState(null);
    const [paletteColors, setPaletteColors] = useState([]);
    const [showPalette, setShowPalette] = useState(false);
    const imageRef = useRef(null);
    const selectionCanvasRef = useRef(null);
    
    // 颜色历史记录
    const { addToHistory } = useColorHistory();

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
                setSelectionArea(null); // 清除之前的选择
                // 先提取整张图片的颜色
                extractDominantColor(imageData);
            };
            reader.readAsDataURL(file);
        }
    }, [extractDominantColor]);

    /**
     * 处理鼠标按下 - 开始选择区域
     */
    const handleMouseDown = useCallback((e) => {
        if (!image || !imageRef.current) return;
        
        const rect = imageRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionArea(null);
    }, [image]);

    /**
     * 处理鼠标移动 - 更新选择区域
     */
    const handleMouseMove = useCallback((e) => {
        if (!isSelecting || !selectionStart || !imageRef.current) return;
        
        const rect = imageRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const x = Math.min(selectionStart.x, currentX);
        const y = Math.min(selectionStart.y, currentY);
        const width = Math.abs(currentX - selectionStart.x);
        const height = Math.abs(currentY - selectionStart.y);
        
        setSelectionArea({ x, y, width, height });
    }, [isSelecting, selectionStart]);

    /**
     * 从选中区域提取颜色
     */
    const extractColorFromSelection = useCallback((area) => {
        if (!imageRef.current || !image) return;
        
        const img = imageRef.current;
        
        // 等待图片加载完成
        if (img.complete && img.naturalWidth > 0) {
            extractFromArea(img, area);
        } else {
            img.onload = () => extractFromArea(img, area);
        }
        
        function extractFromArea(imageElement, selectionArea) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 计算实际图片尺寸和显示尺寸的比例
            const scaleX = imageElement.naturalWidth / imageElement.offsetWidth;
            const scaleY = imageElement.naturalHeight / imageElement.offsetHeight;
            
            // 计算选中区域在实际图片中的位置和尺寸
            const actualX = Math.max(0, Math.floor(selectionArea.x * scaleX));
            const actualY = Math.max(0, Math.floor(selectionArea.y * scaleY));
            const actualWidth = Math.min(
                Math.floor(selectionArea.width * scaleX),
                imageElement.naturalWidth - actualX
            );
            const actualHeight = Math.min(
                Math.floor(selectionArea.height * scaleY),
                imageElement.naturalHeight - actualY
            );
            
            // 确保尺寸有效
            if (actualWidth <= 0 || actualHeight <= 0) {
                console.warn('选择区域无效');
                return;
            }
            
            // 设置canvas尺寸为选中区域
            canvas.width = actualWidth;
            canvas.height = actualHeight;
            
            // 绘制选中区域的图片
            ctx.drawImage(
                imageElement,
                actualX, actualY, actualWidth, actualHeight,
                0, 0, actualWidth, actualHeight
            );
            
            // 从canvas提取颜色
            extractColorFromCanvas(canvas);
        }
    }, [image, extractColorFromCanvas]);

    /**
     * 处理鼠标抬起 - 完成选择并提取颜色
     */
    const handleMouseUp = useCallback(() => {
        if (!isSelecting) return;
        
        setIsSelecting(false);
        setSelectionStart(null);
        
        if (selectionArea && selectionArea.width > 10 && selectionArea.height > 10) {
            // 从选中区域提取颜色
            extractColorFromSelection(selectionArea);
        } else {
            // 如果选择区域太小，清除选择
            setSelectionArea(null);
        }
    }, [isSelecting, selectionArea, extractColorFromSelection]);

    /**
     * 清除选择区域
     */
    const handleClearSelection = useCallback(() => {
        setSelectionArea(null);
        if (image) {
            // 重新提取整张图片的颜色
            extractDominantColor(image);
        }
    }, [image, extractDominantColor]);

    /**
     * 生成调色板（从图片中提取多个颜色）
     */
    const generatePalette = useCallback(() => {
        if (!imageRef.current || !image) return;
        
        const img = imageRef.current;
        if (!img.complete || img.naturalWidth === 0) {
            img.onload = () => generatePalette();
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractColorPalette(imageData, 8); // 提取8种颜色
        setPaletteColors(colors);
        setShowPalette(true);
    }, [image]);


    /**
     * 当提取到主色调时，更新颜色转换和命名
     */
    useEffect(() => {
        if (dominantColor && colorFormats.hex) {
            // 更新颜色转换
            updateFromRgb(dominantColor.r, dominantColor.g, dominantColor.b);
            
            // 预测颜色名称
            setIsNaming(true);
            predictColorName(dominantColor.r, dominantColor.g, dominantColor.b)
                .then(result => {
                    setColorName(result);
                    
                    // 保存到历史记录
                    addToHistory({
                        rgb: dominantColor,
                        hex: colorFormats.hex,
                        hsl: colorFormats.hsl,
                        name: result.name,
                        confidence: result.confidence,
                        image: image
                    });
                })
                .catch(err => {
                    console.error('Error predicting color name:', err);
                    setColorName({ name: '未知颜色', confidence: 0 });
                })
                .finally(() => {
                    setIsNaming(false);
                });
        } else if (!dominantColor) {
            setColorName(null);
        }
    }, [dominantColor, colorFormats, updateFromRgb, addToHistory, image]);

    /**
     * 清除所有数据
     */
    const handleClear = useCallback(() => {
        setImage(null);
        clearColor();
        setColorName(null);
        setSelectionArea(null);
        setIsSelecting(false);
        setSelectionStart(null);
    }, [clearColor]);

    // 全局鼠标事件，确保选择功能正常工作
    useEffect(() => {
        if (isSelecting) {
            const handleGlobalMouseMove = (e) => {
                handleMouseMove(e);
            };
            const handleGlobalMouseUp = () => {
                handleMouseUp();
            };
            
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            
            return () => {
                window.removeEventListener('mousemove', handleGlobalMouseMove);
                window.removeEventListener('mouseup', handleGlobalMouseUp);
            };
        }
    }, [isSelecting, handleMouseMove, handleMouseUp]);

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
            
            {/* 摄像头提示 */}
            {isCameraActive && !cameraError && (
                <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '0.25rem',
                    width: '100%',
                    maxWidth: '28rem',
                    fontSize: '0.875rem',
                    color: '#92400e'
                }}>
                    💡 提示：如果视频画面是灰色的，可能是摄像头被其他应用占用或摄像头驱动问题。
                    <br />
                    你可以使用下方的"选择本地图片"功能来测试颜色分析功能。
                </div>
            )}

            {/* 视频预览区域 */}
            <div style={{ 
                width: '100%', 
                maxWidth: '28rem', 
                minHeight: '200px',
                backgroundColor: '#000',
                borderRadius: '0.5rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline
                    muted
                    style={{ 
                        width: '100%',
                        height: 'auto',
                        minHeight: '200px',
                        display: isCameraActive ? 'block' : 'none',
                        objectFit: 'cover',
                        backgroundColor: '#000',
                        position: 'relative',
                        zIndex: 10,
                        visibility: isCameraActive ? 'visible' : 'hidden'
                    }}
                    onLoadedMetadata={() => {
                        console.log('视频元数据加载，强制刷新显示');
                        if (videoRef.current) {
                            const video = videoRef.current;
                            // 强制触发重绘
                            video.style.display = 'none';
                            void video.offsetHeight; // 触发重排（使用void避免ESLint警告）
                            video.style.display = 'block';
                            
                            // 检查视频内容
                            setTimeout(() => {
                                const canvas = document.createElement('canvas');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(video, 0, 0);
                                const imageData = ctx.getImageData(0, 0, Math.min(100, video.videoWidth), Math.min(100, video.videoHeight));
                                const pixels = imageData.data;
                                let nonGrayCount = 0;
                                let totalPixels = 0;
                                
                                for (let i = 0; i < pixels.length; i += 4) {
                                    const r = pixels[i];
                                    const g = pixels[i + 1];
                                    const b = pixels[i + 2];
                                    totalPixels++;
                                    
                                    // 检查是否不是灰色（RGB值不完全相同）
                                    if (Math.abs(r - g) > 5 || Math.abs(g - b) > 5 || Math.abs(r - b) > 5) {
                                        nonGrayCount++;
                                    }
                                }
                                
                                console.log('视频内容分析:', {
                                    totalPixels: totalPixels,
                                    nonGrayPixels: nonGrayCount,
                                    grayPercentage: ((totalPixels - nonGrayCount) / totalPixels * 100).toFixed(2) + '%',
                                    hasColor: nonGrayCount > totalPixels * 0.1
                                });
                                
                                if (nonGrayCount < totalPixels * 0.1) {
                                    console.warn('⚠️ 警告：视频内容主要是灰色，可能是摄像头没有实际画面输出');
                                }
                            }, 500);
                        }
                    }}
                    onPlaying={() => {
                        console.log('✓✓✓ 视频正在播放，应该有画面了 ✓✓✓');
                        if (videoRef.current) {
                            const video = videoRef.current;
                            const style = window.getComputedStyle(video);
                            console.log('视频显示检查:', {
                                display: style.display,
                                visibility: style.visibility,
                                opacity: style.opacity,
                                width: style.width,
                                height: style.height,
                                zIndex: style.zIndex,
                                videoWidth: video.videoWidth,
                                videoHeight: video.videoHeight,
                                currentTime: video.currentTime,
                                paused: video.paused
                            });
                            
                            // 强制刷新
                            if (video.paused) {
                                video.play().catch(err => console.error('播放失败:', err));
                            }
                        }
                    }}
                />
                {!isCameraActive && (
                    <div style={{ 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#999',
                        fontSize: '0.875rem',
                        pointerEvents: 'none'
                    }}>
                        点击"启动摄像头"开始
                    </div>
                )}
            </div>
            
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
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                            ref={imageRef}
                            src={image} 
                            alt="分析中" 
                            className={styles.imagePreview}
                            style={{ 
                                cursor: isSelecting ? 'crosshair' : 'default',
                                userSelect: 'none'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                        {/* 选择区域框 */}
                        {selectionArea && (
                            <>
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${selectionArea.x}px`,
                                        top: `${selectionArea.y}px`,
                                        width: `${selectionArea.width}px`,
                                        height: `${selectionArea.height}px`,
                                        border: '2px solid #3b82f6',
                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                        pointerEvents: 'none',
                                        boxSizing: 'border-box',
                                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
                                    }}
                                />
                                {/* 选择区域信息 */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${selectionArea.x}px`,
                                        top: `${selectionArea.y - 30}px`,
                                        backgroundColor: 'rgba(59, 130, 246, 0.95)',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        pointerEvents: 'none',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                                    }}
                                >
                                    {Math.round(selectionArea.width)} × {Math.round(selectionArea.height)} 像素
                                </div>
                                {/* 四个角的调整点 */}
                                {[
                                    { x: 0, y: 0 },
                                    { x: selectionArea.width, y: 0 },
                                    { x: selectionArea.width, y: selectionArea.height },
                                    { x: 0, y: selectionArea.height }
                                ].map((corner, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            position: 'absolute',
                                            left: `${selectionArea.x + corner.x - 4}px`,
                                            top: `${selectionArea.y + corner.y - 4}px`,
                                            width: '8px',
                                            height: '8px',
                                            backgroundColor: '#3b82f6',
                                            border: '2px solid white',
                                            borderRadius: '50%',
                                            pointerEvents: 'none',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                    
                    {/* 提示信息 */}
                    <div style={{
                        padding: '0.5rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        color: '#0369a1',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        💡 提示：在图片上拖拽鼠标选择要分析的区域（最小10×10像素）
                    </div>
                    
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

                    {/* 操作按钮 */}
                    <div className={styles.buttonGroup}>
                        {selectionArea && (
                            <Button onClick={handleClearSelection} text="清除选择" color="gray" />
                        )}
                        {image && (
                            <Button onClick={generatePalette} text="生成调色板" color="blue" />
                        )}
                        <Button onClick={handleClear} text="清除图片" color="gray" />
                    </div>
                </div>
            )}

            {/* 调色板显示 */}
            {showPalette && paletteColors.length > 0 && (
                <ColorPalette 
                    colors={paletteColors} 
                    onColorSelect={(color) => {
                        updateFromRgb(color.r, color.g, color.b);
                        extractColorFromCanvas(document.createElement('canvas'));
                    }}
                />
            )}

            {/* 颜色历史记录 */}
            <ColorHistory 
                onColorSelect={(color) => {
                    if (color.rgb) {
                        updateFromRgb(color.rgb.r, color.rgb.g, color.rgb.b);
                    }
                }}
            />
        </div>
    );
};

export default LipstickScanner;
