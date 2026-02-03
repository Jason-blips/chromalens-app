import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 摄像头捕获自定义Hook
 * 提供摄像头启动、停止、图像捕获等功能
 */
export const useCameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [error, setError] = useState(null);

    /**
     * 启动摄像头
     */
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
                
                // 确保视频播放
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(err => {
                        console.error('Error playing video stream:', err);
                    });
                };
            }
        } catch (err) {
            console.error('Unable to access the camera:', err);
            setError(err.message || '无法访问摄像头');
            setIsCameraActive(false);
        }
    }, []);

    /**
     * 停止摄像头
     */
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setIsCameraActive(false);
        }
    }, []);

    /**
     * 从视频流捕获图像
     * @returns {string|null} 返回base64格式的图像数据URL，失败返回null
     */
    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) {
            return null;
        }

        try {
            const context = canvasRef.current.getContext('2d');
            const { videoWidth, videoHeight } = videoRef.current;
            
            if (videoWidth === 0 || videoHeight === 0) {
                return null;
            }

            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            context.drawImage(
                videoRef.current, 
                0, 
                0, 
                canvasRef.current.width, 
                canvasRef.current.height
            );
            
            return canvasRef.current.toDataURL('image/png');
        } catch (err) {
            console.error('Error capturing image:', err);
            setError('捕获图像失败');
            return null;
        }
    }, []);

    // 组件卸载时清理摄像头资源
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    return {
        videoRef,
        canvasRef,
        isCameraActive,
        error,
        startCamera,
        stopCamera,
        captureImage
    };
};
