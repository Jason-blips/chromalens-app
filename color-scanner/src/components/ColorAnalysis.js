import React from 'react';
import { colorMapper, colorAnalyzer } from '../utils/colorUtils';
import styles from './ColorAnalysis.module.css';

/**
 * 颜色分析组件
 * 显示颜色的详细分析信息：色系、冷暖、亮度、对比度等
 */
const ColorAnalysis = ({ color }) => {
    if (!color || !color.rgb) {
        return null;
    }

    const { r, g, b } = color.rgb;
    
    // 获取颜色分析信息
    const colorFamily = colorMapper.getColorFamily(r, g, b);
    const isWarm = colorMapper.isWarmColor(r, g, b);
    const isCool = colorMapper.isCoolColor(r, g, b);
    const brightnessLevel = colorMapper.getBrightnessLevel(r, g, b);
    
    // 计算与标准颜色的对比度
    const whiteContrast = colorAnalyzer.calculateContrast({ r, g, b }, { r: 255, g: 255, b: 255 });
    const blackContrast = colorAnalyzer.calculateContrast({ r, g, b }, { r: 0, g: 0, b: 0 });
    const meetsAA = colorAnalyzer.meetsContrastStandard({ r, g, b }, { r: 255, g: 255, b: 255 }, 'AA');
    const meetsAAA = colorAnalyzer.meetsContrastStandard({ r, g, b }, { r: 255, g: 255, b: 255 }, 'AAA');
    
    const brightnessLabels = {
        'very-dark': '非常暗',
        'dark': '暗',
        'medium': '中等',
        'light': '亮',
        'very-light': '非常亮'
    };

    return (
        <div className={styles.analysisContainer}>
            <h3 className={styles.analysisTitle}>颜色分析</h3>
            
            <div className={styles.analysisGrid}>
                {/* 色系 */}
                <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>色系</span>
                    <span className={styles.analysisValue}>{colorFamily}</span>
                </div>

                {/* 色调 */}
                <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>色调</span>
                    <span className={styles.analysisValue}>
                        {isWarm ? '暖色调' : isCool ? '冷色调' : '中性'}
                    </span>
                </div>

                {/* 亮度 */}
                <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>亮度</span>
                    <span className={styles.analysisValue}>{brightnessLabels[brightnessLevel]}</span>
                </div>

                {/* 对比度 */}
                <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>白色对比度</span>
                    <span className={styles.analysisValue}>
                        {whiteContrast.toFixed(2)}:1
                        {meetsAA && <span className={styles.badge}>AA</span>}
                        {meetsAAA && <span className={styles.badgeAAA}>AAA</span>}
                    </span>
                </div>

                <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>黑色对比度</span>
                    <span className={styles.analysisValue}>
                        {blackContrast.toFixed(2)}:1
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ColorAnalysis;
