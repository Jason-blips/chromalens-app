import { colorNamesDataset } from './colorNames';

/**
 * 颜色命名模块
 * 使用KNN算法实现智能颜色命名
 */
class ColorNamingModel {
    constructor() {
        this.isLoaded = false;
        this.features = null;
        this.labels = null;
        this.k = 3; // KNN的k值，使用3个最近邻
    }

    /**
     * 初始化模型，准备训练数据
     */
    async initialize() {
        if (this.isLoaded) {
            return;
        }

        try {
            // 准备特征数据（RGB值）和标签（颜色名称）
            this.features = [];
            this.labels = [];

            colorNamesDataset.forEach(item => {
                // 将RGB值归一化到0-1范围
                this.features.push([item.r / 255, item.g / 255, item.b / 255]);
                this.labels.push(item.name);
            });

            this.isLoaded = true;
            
            console.log('Color naming model initialized with', this.features.length, 'color samples');
        } catch (error) {
            console.error('Error initializing color naming model:', error);
            throw error;
        }
    }

    /**
     * 计算两个RGB向量之间的欧氏距离
     * @param {Array} rgb1 - RGB值数组 [r, g, b]
     * @param {Array} rgb2 - RGB值数组 [r, g, b]
     * @returns {number} 距离值
     */
    calculateDistance(rgb1, rgb2) {
        const [r1, g1, b1] = rgb1;
        const [r2, g2, b2] = rgb2;
        return Math.sqrt(
            Math.pow(r1 - r2, 2) + 
            Math.pow(g1 - g2, 2) + 
            Math.pow(b1 - b2, 2)
        );
    }

    /**
     * 使用KNN算法预测颜色名称
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     * @returns {Object} {name: string, confidence: number} 颜色名称和置信度
     */
    predictColorName(r, g, b) {
        if (!this.isLoaded) {
            return { name: '未知颜色', confidence: 0 };
        }

        // 归一化RGB值
        const normalizedRgb = [r / 255, g / 255, b / 255];
        
        // 计算与所有训练样本的距离
        const distances = this.features.map((feature, index) => ({
            distance: this.calculateDistance(normalizedRgb, feature),
            name: this.labels[index]
        }));

        // 按距离排序，取前k个最近邻
        distances.sort((a, b) => a.distance - b.distance);
        const nearestNeighbors = distances.slice(0, this.k);

        // 统计最近邻中出现最多的颜色名称
        const nameCounts = {};
        nearestNeighbors.forEach(neighbor => {
            nameCounts[neighbor.name] = (nameCounts[neighbor.name] || 0) + 1;
        });

        // 找到出现次数最多的颜色名称
        let maxCount = 0;
        let predictedName = '未知颜色';
        Object.entries(nameCounts).forEach(([name, count]) => {
            if (count > maxCount) {
                maxCount = count;
                predictedName = name;
            }
        });

        // 计算置信度（基于最近邻的投票比例和距离）
        const confidence = Math.min(1, maxCount / this.k);
        const avgDistance = nearestNeighbors
            .filter(n => n.name === predictedName)
            .reduce((sum, n) => sum + n.distance, 0) / maxCount;
        
        // 距离越近，置信度越高（归一化到0-1）
        const distanceConfidence = Math.max(0, 1 - avgDistance * 2);
        const finalConfidence = (confidence * 0.7 + distanceConfidence * 0.3);

        return {
            name: predictedName,
            confidence: Math.round(finalConfidence * 100) / 100
        };
    }

    /**
     * 批量预测颜色名称
     * @param {Array} colors - RGB颜色数组 [{r, g, b}, ...]
     * @returns {Array} 预测结果数组
     */
    predictBatch(colors) {
        return colors.map(color => 
            this.predictColorName(color.r, color.g, color.b)
        );
    }

    /**
     * 清理资源
     */
    dispose() {
        this.features = null;
        this.labels = null;
        this.isLoaded = false;
    }
}

// 创建单例实例
let colorNamingModelInstance = null;

/**
 * 获取颜色命名模型实例（单例模式）
 * @returns {Promise<ColorNamingModel>} 模型实例
 */
export const getColorNamingModel = async () => {
    if (!colorNamingModelInstance) {
        colorNamingModelInstance = new ColorNamingModel();
        await colorNamingModelInstance.initialize();
    }
    return colorNamingModelInstance;
};

/**
 * 预测颜色名称（便捷函数）
 * 优先使用TensorFlow.js，如果不可用则回退到标准KNN
 * @param {number} r - 红色值 (0-255)
 * @param {number} g - 绿色值 (0-255)
 * @param {number} b - 蓝色值 (0-255)
 * @param {boolean} useTensorFlow - 是否使用TensorFlow.js（默认true）
 * @returns {Promise<Object>} {name: string, confidence: number}
 */
export const predictColorName = async (r, g, b, useTensorFlow = true) => {
    if (useTensorFlow) {
        try {
            const { predictColorNameWithTensorFlow } = await import('./tensorflowColorNaming');
            return await predictColorNameWithTensorFlow(r, g, b);
        } catch (error) {
            console.warn('TensorFlow.js not available, using standard KNN:', error);
            // 回退到标准KNN实现
        }
    }
    
    // 使用标准KNN实现
    const model = await getColorNamingModel();
    return model.predictColorName(r, g, b);
};
