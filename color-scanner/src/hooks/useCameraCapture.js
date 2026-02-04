import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * 摄像头捕获自定义Hook
 * 提供摄像头启动、停止、图像捕获等功能
 */
export const useCameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [error, setError] = useState(null);

    /**
     * 启动摄像头
     */
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            console.log('=== 开始请求摄像头 ===');
            
            // 先停止之前的流
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            
            // 先尝试获取摄像头权限（通过一个简单的getUserMedia调用）
            // 这样可以让enumerateDevices获取到设备标签
            let videoConstraints = true;
            
            try {
                // 尝试获取设备列表（可能需要先获取权限）
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                console.log('可用的摄像头设备:', videoDevices);
                
                if (videoDevices.length > 0 && videoDevices[0].deviceId) {
                    // 如果获取到了设备ID，使用它
                    videoConstraints = {
                        deviceId: { ideal: videoDevices[0].deviceId }
                    };
                    console.log('使用摄像头:', videoDevices[0].label || videoDevices[0].deviceId);
                }
            } catch (enumError) {
                console.warn('枚举设备失败，使用默认设置:', enumError);
                // 如果枚举失败，使用默认设置
                videoConstraints = true;
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: videoConstraints
            });
            
            console.log('✓ 摄像头流获取成功');
            const videoTrack = stream.getVideoTracks()[0];
            console.log('视频轨道:', videoTrack);
            console.log('视频轨道状态:', videoTrack?.readyState);
            console.log('视频轨道设置:', videoTrack?.getSettings());
            console.log('视频轨道能力:', videoTrack?.getCapabilities());
            console.log('视频轨道是否启用:', videoTrack?.enabled);
            console.log('视频轨道是否静音:', videoTrack?.muted);
            
            // 检查视频轨道是否真的在发送数据
            if (videoTrack) {
                videoTrack.onmute = () => {
                    console.error('⚠️ 视频轨道被静音了！');
                    setError('视频轨道被静音，请检查摄像头权限');
                };
                videoTrack.onunmute = () => {
                    console.log('✓ 视频轨道取消静音');
                };
                videoTrack.onended = () => {
                    console.error('⚠️ 视频轨道已结束！');
                    setError('视频轨道已结束');
                };
            }
            
            streamRef.current = stream;
            setIsCameraActive(true); // 先设置状态，让视频元素显示
            
            // 立即尝试设置，如果元素不存在则等待
            const setVideoStream = (retryCount = 0) => {
                if (videoRef.current) {
                    console.log('设置视频流到video元素');
                    const video = videoRef.current;
                    
                    // 清除之前的stream
                    if (video.srcObject) {
                        video.srcObject.getTracks().forEach(track => track.stop());
                    }
                    
                    // 设置stream
                    video.srcObject = stream;
                    console.log('✓ Stream已设置到video元素');
                    
                    // 等待视频元数据
                    const checkVideo = () => {
                        console.log('检查视频状态:', {
                            srcObject: !!video.srcObject,
                            paused: video.paused,
                            readyState: video.readyState,
                            videoWidth: video.videoWidth,
                            videoHeight: video.videoHeight,
                            offsetWidth: video.offsetWidth,
                            offsetHeight: video.offsetHeight,
                            currentTime: video.currentTime
                        });
                        
                        if (video.videoWidth > 0 && video.videoHeight > 0) {
                            console.log('✓✓✓ 视频有尺寸，应该能看到画面了 ✓✓✓');
                        }
                    };
                    
                    // 立即检查
                    checkVideo();
                    
                    // 监听视频事件
                    video.addEventListener('loadedmetadata', () => {
                        console.log('✓ 视频元数据加载');
                        checkVideo();
                    }, { once: true });
                    
                    video.addEventListener('loadeddata', () => {
                        console.log('✓ 视频数据加载');
                        checkVideo();
                    }, { once: true });
                    
                    video.addEventListener('canplay', () => {
                        console.log('✓ 视频可以播放');
                        checkVideo();
                    }, { once: true });
                    
                    video.addEventListener('playing', () => {
                        console.log('✓✓✓ 视频正在播放 ✓✓✓');
                        checkVideo();
                    }, { once: true });
                    
                    // 强制播放
                    const playVideo = async () => {
                        try {
                            await video.play();
                            console.log('✓ 视频播放成功');
                            console.log('视频尺寸:', video.videoWidth, 'x', video.videoHeight);
                            console.log('视频显示尺寸:', video.offsetWidth, 'x', video.offsetHeight);
                            
                            // 创建一个测试视频元素来验证视频流是否有内容
                            setTimeout(() => {
                                const testVideo = document.createElement('video');
                                testVideo.srcObject = stream;
                                testVideo.autoplay = true;
                                testVideo.muted = true;
                                testVideo.playsInline = true;
                                testVideo.style.cssText = 'position:fixed;top:10px;right:10px;width:200px;height:150px;border:3px solid red;z-index:99999;background:#000;object-fit:cover;';
                                document.body.appendChild(testVideo);
                                
                                testVideo.addEventListener('loadedmetadata', () => {
                                    console.log('测试视频元数据:', {
                                        width: testVideo.videoWidth,
                                        height: testVideo.videoHeight,
                                        readyState: testVideo.readyState
                                    });
                                });
                                
                                testVideo.addEventListener('playing', () => {
                                    console.log('测试视频正在播放');
                                    // 尝试从视频中提取一帧来检查是否有内容
                                    setTimeout(() => {
                                        const testCanvas = document.createElement('canvas');
                                        testCanvas.width = testVideo.videoWidth || 640;
                                        testCanvas.height = testVideo.videoHeight || 480;
                                        const ctx = testCanvas.getContext('2d');
                                        ctx.drawImage(testVideo, 0, 0);
                                        const imageData = ctx.getImageData(0, 0, 10, 10);
                                        const hasContent = imageData.data.some((val, i) => i % 4 !== 3 && val !== 0 && val !== 128);
                                        console.log('视频帧内容检查:', {
                                            hasContent: hasContent,
                                            firstPixel: Array.from(imageData.data.slice(0, 4)),
                                            allGray: imageData.data.slice(0, 40).every((val, i) => {
                                                if (i % 4 === 3) return true; // alpha通道
                                                return val === 128 || val === 0;
                                            })
                                        });
                                    }, 1000);
                                });
                                
                                testVideo.play().then(() => {
                                    console.log('测试视频已添加到右上角（红色边框）');
                                }).catch(err => {
                                    console.error('测试视频播放失败:', err);
                                });
                            }, 500);
                        } catch (err) {
                            console.error('✗ 视频播放失败:', err);
                            setError('视频播放失败: ' + err.message);
                        }
                    };
                    
                    // 强制设置视频属性，确保能显示
                    video.setAttribute('playsinline', '');
                    video.setAttribute('webkit-playsinline', '');
                    
                    // 如果视频已经准备好，立即播放
                    if (video.readyState >= 2) {
                        playVideo();
                    } else {
                        // 等待视频准备好
                        const handleLoadedMetadata = () => {
                            console.log('视频元数据加载完成');
                            playVideo();
                        };
                        const handleCanPlay = () => {
                            console.log('视频可以播放');
                            playVideo();
                        };
                        const handlePlaying = () => {
                            console.log('视频正在播放中');
                        };
                        
                        video.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                        video.addEventListener('canplay', handleCanPlay, { once: true });
                        video.addEventListener('playing', handlePlaying, { once: true });
                    }
                    
                    // 强制触发一次渲染
                    setTimeout(() => {
                        if (video && !video.paused) {
                            video.currentTime = video.currentTime; // 触发重绘
                            console.log('强制触发视频重绘');
                        }
                    }, 200);
                } else if (retryCount < 20) {
                    console.warn(`视频元素尚未挂载，等待中... (${retryCount + 1}/20)`);
                    setTimeout(() => setVideoStream(retryCount + 1), 100);
                } else {
                    console.error('✗ 视频元素未找到，已重试20次');
                    setError('视频元素未找到');
                }
            };
            
            // 立即尝试
            setVideoStream();
            
        } catch (err) {
            console.error('✗ 无法访问摄像头:', err);
            console.error('错误详情:', {
                name: err.name,
                message: err.message,
                constraint: err.constraint
            });
            
            let errorMessage = '无法访问摄像头';
            
            // 根据错误类型提供更具体的错误信息
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = '未找到摄像头设备，请检查摄像头是否已连接';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试';
            } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                errorMessage = '摄像头不支持请求的设置，尝试使用默认设置';
            } else if (err.message) {
                errorMessage = `无法访问摄像头: ${err.message}`;
            }
            
            setError(errorMessage);
            setIsCameraActive(false);
            streamRef.current = null;
        }
    }, []);

    /**
     * 停止摄像头
     */
    const stopCamera = useCallback(() => {
        console.log('停止摄像头');
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('停止轨道:', track.label);
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    }, []);

    /**
     * 从视频流捕获图像
     */
    const captureImage = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) {
            console.error('视频或画布元素不存在');
            return null;
        }

        try {
            const { videoWidth, videoHeight } = videoRef.current;
            
            if (videoWidth === 0 || videoHeight === 0) {
                console.error('视频尺寸为0:', videoWidth, videoHeight);
                return null;
            }

            console.log('捕获图像，尺寸:', videoWidth, 'x', videoHeight);
            
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
            
            return canvasRef.current.toDataURL('image/png');
        } catch (err) {
            console.error('捕获图像失败:', err);
            setError('捕获图像失败');
            return null;
        }
    }, []);

    // 监听视频元素状态
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            console.log('视频元数据加载完成');
            console.log('视频尺寸:', video.videoWidth, 'x', video.videoHeight);
            console.log('视频状态:', {
                paused: video.paused,
                readyState: video.readyState,
                srcObject: !!video.srcObject
            });
            
            if (video.paused && video.srcObject) {
                video.play().catch(err => {
                    console.error('自动播放失败:', err);
                });
            }
        };

        const handleCanPlay = () => {
            console.log('视频可以播放');
            if (video.paused && video.srcObject) {
                video.play().catch(err => {
                    console.error('播放失败:', err);
                });
            }
        };

        const handlePlay = () => {
            console.log('✓✓✓ 视频正在播放 ✓✓✓');
        };

        const handleError = (e) => {
            console.error('视频错误:', e);
            console.error('错误详情:', video.error);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('play', handlePlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('error', handleError);
        };
    }, [isCameraActive]);

    // 组件卸载时清理
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
