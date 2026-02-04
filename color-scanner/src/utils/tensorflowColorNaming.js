import * as tf from '@tensorflow/tfjs';

/**
 * 基于TensorFlow.js的KNN颜色命名模型
 * 使用TensorFlow.js实现轻量级KNN算法，用于智能颜色命名
 */
class TensorFlowColorNamingModel {
    constructor() {
        this.isLoaded = false;
        this.features = null;
        this.labels = null;
        this.k = 3; // KNN的k值
    }

    /**
     * 初始化模型，准备训练数据
     */
    async initialize() {
        if (this.isLoaded) {
            return;
        }

        try {
            // 确保TensorFlow.js已加载
            await tf.ready();
            
            // 从colorNames数据集加载数据
            const { colorNamesDataset } = await import('./colorNames');
            
            // 准备特征数据（RGB值归一化）和标签（颜色名称）
            const features = [];
            const labels = [];

            colorNamesDataset.forEach(item => {
                // 将RGB值归一化到0-1范围
                features.push([item.r / 255, item.g / 255, item.b / 255]);
                labels.push(item.name);
            });

            // 转换为TensorFlow张量
            this.features = tf.tensor2d(features);
            this.labels = labels;
            this.isLoaded = true;
            
            console.log('TensorFlow color naming model initialized with', features.length, 'color samples');
        } catch (error) {
            console.error('Error initializing TensorFlow color naming model:', error);
            // 如果TensorFlow.js加载失败，回退到普通KNN
            throw error;
        }
    }

    /**
     * 使用TensorFlow.js KNN算法预测颜色名称
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     * @returns {Object} {name: string, confidence: number} 颜色名称和置信度
     */
    predictColorName(r, g, b) {
        if (!this.isLoaded || !this.features) {
            return { name: '未知颜色', confidence: 0 };
        }

        try {
            // 归一化RGB值
            const normalizedRgb = [r / 255, g / 255, b / 255];
            const queryPoint = tf.tensor1d(normalizedRgb);
            
            // 计算与所有训练样本的欧氏距离
            // distance = sqrt(sum((query - feature)^2))
            const diff = this.features.sub(queryPoint);
            const squaredDiff = diff.square();
            const distances = squaredDiff.sum(1).sqrt();
            
            // 获取距离值（同步执行）
            const distancesArray = distances.arraySync();
            
            // 找到k个最近邻的索引
            const indexedDistances = distancesArray.map((dist, idx) => ({ dist, idx }));
            indexedDistances.sort((a, b) => a.dist - b.dist);
            const nearestNeighbors = indexedDistances.slice(0, this.k);
            
            // 统计最近邻中出现最多的颜色名称
            const nameCounts = {};
            nearestNeighbors.forEach(({ idx }) => {
                const name = this.labels[idx];
                nameCounts[name] = (nameCounts[name] || 0) + 1;
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
            
            // 计算置信度
            const confidence = Math.min(1, maxCount / this.k);
            const avgDistance = nearestNeighbors
                .filter(({ idx }) => this.labels[idx] === predictedName)
                .reduce((sum, { dist }) => sum + dist, 0) / maxCount;
            
            // 距离越近，置信度越高
            const distanceConfidence = Math.max(0, 1 - avgDistance * 2);
            const finalConfidence = (confidence * 0.7 + distanceConfidence * 0.3);
            
            // 清理张量
            queryPoint.dispose();
            diff.dispose();
            squaredDiff.dispose();
            distances.dispose();
            
            return {
                name: predictedName,
                confidence: Math.round(finalConfidence * 100) / 100
            };
        } catch (error) {
            console.error('Error predicting color name with TensorFlow:', error);
            return { name: '未知颜色', confidence: 0 };
        }
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
        if (this.features) {
            this.features.dispose();
            this.features = null;
        }
        this.labels = null;
        this.isLoaded = false;
    }
}

// 创建单例实例
let tensorFlowModelInstance = null;

/**
 * 获取TensorFlow颜色命名模型实例（单例模式）
 * @returns {Promise<TensorFlowColorNamingModel>} 模型实例
 */
export const getTensorFlowColorNamingModel = async () => {
    if (!tensorFlowModelInstance) {
        tensorFlowModelInstance = new TensorFlowColorNamingModel();
        await tensorFlowModelInstance.initialize();
    }
    return tensorFlowModelInstance;
};

/**
 * 预测颜色名称（使用TensorFlow.js，便捷函数）
 * @param {number} r - 红色值 (0-255)
 * @param {number} g - 绿色值 (0-255)
 * @param {number} b - 蓝色值 (0-255)
 * @returns {Promise<Object>} {name: string, confidence: number}
 */
export const predictColorNameWithTensorFlow = async (r, g, b) => {
    try {
        const model = await getTensorFlowColorNamingModel();
        return model.predictColorName(r, g, b);
    } catch (error) {
        console.warn('TensorFlow.js not available, falling back to standard KNN:', error);
        // 回退到标准KNN实现
        const { predictColorName } = await import('./colorNaming');
        return predictColorName(r, g, b);
    }
};
