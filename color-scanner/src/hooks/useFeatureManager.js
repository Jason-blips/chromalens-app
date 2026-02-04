import { useCallback, useRef } from 'react';

/**
 * 功能管理Hook
 * 确保各个功能之间互不干扰，正确清理资源
 */
export const useFeatureManager = () => {
    const activeFeatures = useRef(new Set());

    /**
     * 激活功能
     * @param {string} featureName - 功能名称
     */
    const activateFeature = useCallback((featureName) => {
        activeFeatures.current.add(featureName);
        console.log(`[FeatureManager] 激活功能: ${featureName}`);
    }, []);

    /**
     * 停用功能
     * @param {string} featureName - 功能名称
     */
    const deactivateFeature = useCallback((featureName) => {
        activeFeatures.current.delete(featureName);
        console.log(`[FeatureManager] 停用功能: ${featureName}`);
    }, []);

    /**
     * 检查功能是否激活
     * @param {string} featureName - 功能名称
     * @returns {boolean}
     */
    const isFeatureActive = useCallback((featureName) => {
        return activeFeatures.current.has(featureName);
    }, []);

    /**
     * 停用所有功能
     */
    const deactivateAll = useCallback(() => {
        activeFeatures.current.clear();
        console.log('[FeatureManager] 停用所有功能');
    }, []);

    /**
     * 停用互斥功能（例如：摄像头和图片上传互斥）
     * @param {string} currentFeature - 当前要激活的功能
     * @param {Array<string>} exclusiveFeatures - 需要停用的互斥功能列表
     */
    const activateExclusive = useCallback((currentFeature, exclusiveFeatures = []) => {
        // 停用互斥功能
        exclusiveFeatures.forEach(feature => {
            if (activeFeatures.current.has(feature)) {
                deactivateFeature(feature);
            }
        });
        // 激活当前功能
        activateFeature(currentFeature);
    }, [activateFeature, deactivateFeature]);

    return {
        activateFeature,
        deactivateFeature,
        isFeatureActive,
        deactivateAll,
        activateExclusive
    };
};
