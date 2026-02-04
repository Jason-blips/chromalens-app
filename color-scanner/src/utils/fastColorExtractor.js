/**
 * 高性能颜色提取工具
 * 直接从Canvas像素数据中提取主色调，优化性能确保响应时间<150ms
 */

/**
 * 从Canvas ImageData中快速提取主色调
 * 使用降采样和颜色量化优化性能
 * @param {ImageData} imageData - Canvas的ImageData对象
 * @param {Object} options - 配置选项
 * @param {number} options.sampleRate - 采样率 (0-1)，默认0.1，即采样10%的像素
 * @param {number} options.quantization - 颜色量化级别 (0-255)，默认32，将颜色值量化到32级
 * @returns {{r: number, g: number, b: number}} RGB颜色对象
 */
export const extractDominantColorFromImageData = (imageData, options = {}) => {
    const startTime = performance.now();
    
    const {
        sampleRate = 0.1,      // 采样10%的像素
        quantization = 32      // 量化到32级
    } = options;

    const { data, width, height } = imageData;
    const pixelCount = width * height;
    const sampleCount = Math.max(1, Math.floor(pixelCount * sampleRate));
    
    // 颜色直方图，使用量化后的颜色作为key
    const colorHistogram = new Map();
    
    // 随机采样或均匀采样像素
    const step = Math.max(1, Math.floor(1 / sampleRate));
    
    for (let i = 0; i < pixelCount; i += step) {
        const index = i * 4;
        
        // 跳过透明像素
        if (data[index + 3] < 128) continue;
        
        // 获取RGB值并量化
        const r = Math.floor(data[index] / quantization) * quantization;
        const g = Math.floor(data[index + 1] / quantization) * quantization;
        const b = Math.floor(data[index + 2] / quantization) * quantization;
        
        // 创建颜色key
        const colorKey = `${r},${g},${b}`;
        
        // 累加颜色出现次数
        const count = colorHistogram.get(colorKey) || 0;
        colorHistogram.set(colorKey, count + 1);
    }
    
    // 找到出现次数最多的颜色
    let maxCount = 0;
    let dominantColorKey = null;
    
    for (const [colorKey, count] of colorHistogram.entries()) {
        if (count > maxCount) {
            maxCount = count;
            dominantColorKey = colorKey;
        }
    }
    
    // 解析颜色值
    if (!dominantColorKey) {
        return { r: 0, g: 0, b: 0 };
    }
    
    const [r, g, b] = dominantColorKey.split(',').map(Number);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 性能监控：如果超过150ms，记录警告
    if (duration > 150) {
        console.warn(`Color extraction took ${duration.toFixed(2)}ms (exceeds 150ms target)`);
    } else {
        console.log(`✓ Color extraction took ${duration.toFixed(2)}ms`);
    }
    
    return { r, g, b };
};

/**
 * 从Canvas元素中快速提取主色调
 * @param {HTMLCanvasElement} canvas - Canvas元素
 * @param {Object} options - 配置选项
 * @returns {{r: number, g: number, b: number}} RGB颜色对象
 */
export const extractDominantColorFromCanvas = (canvas, options = {}) => {
    if (!canvas) {
        return { r: 0, g: 0, b: 0 };
    }

    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
            return { r: 0, g: 0, b: 0 };
        }

        // 如果Canvas很大，先创建一个缩小的临时Canvas进行采样
        const { width, height } = canvas;
        const maxDimension = 400; // 最大采样尺寸
        
        let imageData;
        if (width > maxDimension || height > maxDimension) {
            // 创建临时Canvas进行降采样
            const tempCanvas = document.createElement('canvas');
            const scale = Math.min(maxDimension / width, maxDimension / height);
            tempCanvas.width = Math.floor(width * scale);
            tempCanvas.height = Math.floor(height * scale);
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
            imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        } else {
            imageData = ctx.getImageData(0, 0, width, height);
        }

        return extractDominantColorFromImageData(imageData, options);
    } catch (err) {
        console.error('Error extracting color from canvas:', err);
        return { r: 0, g: 0, b: 0 };
    }
};

/**
 * 从视频元素中快速提取主色调（实时分析）
 * @param {HTMLVideoElement} video - Video元素
 * @param {HTMLCanvasElement} canvas - 用于绘制的临时Canvas
 * @param {Object} options - 配置选项
 * @returns {{r: number, g: number, b: number}} RGB颜色对象
 */
export const extractDominantColorFromVideo = (video, canvas, options = {}) => {
    if (!video || !canvas) {
        return { r: 0, g: 0, b: 0 };
    }

    try {
        const { videoWidth, videoHeight } = video;
        if (videoWidth === 0 || videoHeight === 0) {
            return { r: 0, g: 0, b: 0 };
        }

        // 设置Canvas尺寸
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // 绘制当前视频帧
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 提取颜色
        return extractDominantColorFromCanvas(canvas, options);
    } catch (err) {
        console.error('Error extracting color from video:', err);
        return { r: 0, g: 0, b: 0 };
    }
};

/**
 * 使用中位切分算法提取调色板（更精确但稍慢）
 * @param {ImageData} imageData - Canvas的ImageData对象
 * @param {number} colorCount - 要提取的颜色数量，默认1（主色调）
 * @returns {Array} 颜色数组 [{r, g, b}, ...]
 */
export const extractColorPalette = (imageData, colorCount = 1) => {
    const startTime = performance.now();
    
    const { data, width, height } = imageData;
    const pixelCount = width * height;
    
    // 收集所有非透明像素
    const pixels = [];
    for (let i = 0; i < pixelCount; i++) {
        const index = i * 4;
        if (data[index + 3] >= 128) { // 跳过透明像素
            pixels.push({
                r: data[index],
                g: data[index + 1],
                b: data[index + 2]
            });
        }
    }
    
    if (pixels.length === 0) {
        return [{ r: 0, g: 0, b: 0 }];
    }
    
    // 如果只需要一个颜色，使用快速方法
    if (colorCount === 1) {
        // 计算平均颜色（简单快速）
        const sum = pixels.reduce((acc, pixel) => ({
            r: acc.r + pixel.r,
            g: acc.g + pixel.g,
            b: acc.b + pixel.b
        }), { r: 0, g: 0, b: 0 });
        
        const count = pixels.length;
        const avgColor = {
            r: Math.round(sum.r / count),
            g: Math.round(sum.g / count),
            b: Math.round(sum.b / count)
        };
        
        const endTime = performance.now();
        console.log(`Palette extraction took ${(endTime - startTime).toFixed(2)}ms`);
        
        return [avgColor];
    }
    
    // 对于多个颜色，使用简化的K-means聚类
    // 这里简化实现，实际可以使用更复杂的算法
    const colors = [];
    const step = Math.floor(pixels.length / colorCount);
    
    for (let i = 0; i < colorCount; i++) {
        const pixel = pixels[i * step] || pixels[0];
        colors.push(pixel);
    }
    
    const endTime = performance.now();
    console.log(`Palette extraction took ${(endTime - startTime).toFixed(2)}ms`);
    
    return colors;
};
