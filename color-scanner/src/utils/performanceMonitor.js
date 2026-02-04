/**
 * 性能监控工具
 * 用于监控和记录关键操作的性能指标
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            colorExtraction: [],
            colorNaming: [],
            paletteGeneration: []
        };
    }

    /**
     * 记录性能指标
     * @param {string} operation - 操作名称
     * @param {number} duration - 耗时（毫秒）
     * @param {Object} metadata - 元数据
     */
    record(operation, duration, metadata = {}) {
        if (!this.metrics[operation]) {
            this.metrics[operation] = [];
        }

        const record = {
            duration,
            timestamp: Date.now(),
            ...metadata
        };

        this.metrics[operation].push(record);

        // 只保留最近100条记录
        if (this.metrics[operation].length > 100) {
            this.metrics[operation].shift();
        }

        // 检查是否超过目标时间
        const target = this.getTarget(operation);
        if (target && duration > target) {
            console.warn(`⚠️ ${operation} took ${duration.toFixed(2)}ms (exceeds ${target}ms target)`);
        }
    }

    /**
     * 获取操作的目标时间
     * @param {string} operation - 操作名称
     * @returns {number|null} 目标时间（毫秒）
     */
    getTarget(operation) {
        const targets = {
            colorExtraction: 150,
            colorNaming: 50,
            paletteGeneration: 200
        };
        return targets[operation] || null;
    }

    /**
     * 获取性能统计
     * @param {string} operation - 操作名称
     * @returns {Object} 统计信息
     */
    getStats(operation) {
        const records = this.metrics[operation] || [];
        if (records.length === 0) {
            return null;
        }

        const durations = records.map(r => r.duration);
        const sum = durations.reduce((a, b) => a + b, 0);
        const avg = sum / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        const target = this.getTarget(operation);

        // 计算达标率
        const passRate = target 
            ? (durations.filter(d => d <= target).length / durations.length * 100).toFixed(1)
            : null;

        return {
            count: records.length,
            average: avg.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2),
            target: target,
            passRate: passRate ? `${passRate}%` : null
        };
    }

    /**
     * 获取所有性能统计
     * @returns {Object} 所有操作的统计信息
     */
    getAllStats() {
        const stats = {};
        Object.keys(this.metrics).forEach(operation => {
            stats[operation] = this.getStats(operation);
        });
        return stats;
    }

    /**
     * 清空所有记录
     */
    clear() {
        Object.keys(this.metrics).forEach(key => {
            this.metrics[key] = [];
        });
    }

    /**
     * 导出性能报告
     * @returns {Object} 性能报告
     */
    exportReport() {
        return {
            timestamp: new Date().toISOString(),
            stats: this.getAllStats(),
            rawData: this.metrics
        };
    }
}

// 创建单例
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
