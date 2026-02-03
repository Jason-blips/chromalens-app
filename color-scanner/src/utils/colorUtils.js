/**
 * 通用颜色工具模块
 * 提供颜色映射、数据转码、颜色分析等通用逻辑
 */

import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from './colorConverter';

/**
 * 颜色数据转码工具
 * 在不同格式之间进行数据转码
 */
export const colorTranscoder = {
    /**
     * 将颜色对象转换为不同格式的字符串
     * @param {Object} color - 颜色对象 {r, g, b} 或 {h, s, l}
     * @param {string} format - 目标格式: 'hex' | 'rgb' | 'hsl' | 'css'
     * @returns {string} 格式化后的颜色字符串
     */
    encode: (color, format = 'hex') => {
        if (!color) return '';

        switch (format.toLowerCase()) {
            case 'hex':
                if (color.r !== undefined) {
                    return rgbToHex(color.r, color.g, color.b);
                }
                if (color.h !== undefined) {
                    const rgb = hslToRgb(color.h, color.s, color.l);
                    return rgbToHex(rgb.r, rgb.g, rgb.b);
                }
                return '';
            
            case 'rgb':
            case 'css':
                if (color.r !== undefined) {
                    return `rgb(${color.r}, ${color.g}, ${color.b})`;
                }
                if (color.h !== undefined) {
                    const rgb = hslToRgb(color.h, color.s, color.l);
                    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                }
                return '';
            
            case 'hsl':
                if (color.h !== undefined) {
                    return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
                }
                if (color.r !== undefined) {
                    const hsl = rgbToHsl(color.r, color.g, color.b);
                    return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
                }
                return '';
            
            default:
                return '';
        }
    },

    /**
     * 解析颜色字符串为颜色对象
     * @param {string} colorString - 颜色字符串 (hex, rgb, hsl格式)
     * @returns {Object|null} 颜色对象或null
     */
    decode: (colorString) => {
        if (!colorString || typeof colorString !== 'string') {
            return null;
        }

        const trimmed = colorString.trim();

        // HEX格式
        if (trimmed.startsWith('#')) {
            return hexToRgb(trimmed);
        }

        // RGB格式: rgb(255, 0, 0) 或 rgba(255, 0, 0, 1)
        const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1], 10),
                g: parseInt(rgbMatch[2], 10),
                b: parseInt(rgbMatch[3], 10)
            };
        }

        // HSL格式: hsl(0, 100%, 50%)
        const hslMatch = trimmed.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (hslMatch) {
            return {
                h: parseInt(hslMatch[1], 10),
                s: parseInt(hslMatch[2], 10),
                l: parseInt(hslMatch[3], 10)
            };
        }

        return null;
    }
};

/**
 * 颜色映射工具
 * 提供颜色分类、色系映射等功能
 */
export const colorMapper = {
    /**
     * 根据RGB值判断颜色色系
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     * @returns {string} 色系名称
     */
    getColorFamily: (r, g, b) => {
        const hsl = rgbToHsl(r, g, b);
        const { h, s, l } = hsl;

        // 低饱和度或高/低亮度 -> 无彩色系
        if (s < 20) {
            if (l < 20) return '黑色系';
            if (l > 80) return '白色系';
            return '灰色系';
        }

        // 根据色相判断色系
        if (h >= 0 && h < 15) return '红色系';
        if (h >= 15 && h < 30) return '橙红色系';
        if (h >= 30 && h < 60) return '橙色系';
        if (h >= 60 && h < 90) return '黄色系';
        if (h >= 90 && h < 150) return '绿色系';
        if (h >= 150 && h < 210) return '青色系';
        if (h >= 210 && h < 270) return '蓝色系';
        if (h >= 270 && h < 330) return '紫色系';
        return '红色系'; // 330-360
    },

    /**
     * 判断颜色是否为暖色调
     * @param {number} r - 红色值
     * @param {number} g - 绿色值
     * @param {number} b - 蓝色值
     * @returns {boolean} 是否为暖色调
     */
    isWarmColor: (r, g, b) => {
        const hsl = rgbToHsl(r, g, b);
        const { h } = hsl;
        // 红色、橙色、黄色为暖色调 (0-90度)
        return (h >= 0 && h < 90) || (h >= 330);
    },

    /**
     * 判断颜色是否为冷色调
     * @param {number} r - 红色值
     * @param {number} g - 绿色值
     * @param {number} b - 蓝色值
     * @returns {boolean} 是否为冷色调
     */
    isCoolColor: (r, g, b) => {
        const hsl = rgbToHsl(r, g, b);
        const { h } = hsl;
        // 绿色、青色、蓝色、紫色为冷色调 (90-330度)
        return h >= 90 && h < 330;
    },

    /**
     * 获取颜色的亮度等级
     * @param {number} r - 红色值
     * @param {number} g - 绿色值
     * @param {number} b - 蓝色值
     * @returns {string} 亮度等级: 'very-dark' | 'dark' | 'medium' | 'light' | 'very-light'
     */
    getBrightnessLevel: (r, g, b) => {
        // 使用相对亮度公式 (ITU-R BT.709)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        if (luminance < 0.2) return 'very-dark';
        if (luminance < 0.4) return 'dark';
        if (luminance < 0.6) return 'medium';
        if (luminance < 0.8) return 'light';
        return 'very-light';
    }
};

/**
 * 颜色分析工具
 * 提供颜色对比度、相似度等分析功能
 */
export const colorAnalyzer = {
    /**
     * 计算两个颜色之间的欧氏距离
     * @param {Object} color1 - 颜色1 {r, g, b}
     * @param {Object} color2 - 颜色2 {r, g, b}
     * @returns {number} 距离值 (0-441.67，越小越相似)
     */
    calculateDistance: (color1, color2) => {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    },

    /**
     * 计算颜色相似度 (0-1，1表示完全相同)
     * @param {Object} color1 - 颜色1
     * @param {Object} color2 - 颜色2
     * @returns {number} 相似度 (0-1)
     */
    calculateSimilarity: (color1, color2) => {
        const distance = colorAnalyzer.calculateDistance(color1, color2);
        const maxDistance = Math.sqrt(255 * 255 * 3); // 最大可能距离
        return 1 - (distance / maxDistance);
    },

    /**
     * 计算两个颜色的对比度 (WCAG标准)
     * @param {Object} color1 - 颜色1 {r, g, b}
     * @param {Object} color2 - 颜色2 {r, g, b}
     * @returns {number} 对比度比值 (1-21)
     */
    calculateContrast: (color1, color2) => {
        const getLuminance = (r, g, b) => {
            const [rs, gs, bs] = [r, g, b].map(val => {
                val = val / 255;
                return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const lum1 = getLuminance(color1.r, color1.g, color1.b);
        const lum2 = getLuminance(color2.r, color2.g, color2.b);
        
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        
        return (lighter + 0.05) / (darker + 0.05);
    },

    /**
     * 判断对比度是否满足WCAG AA标准
     * @param {Object} color1 - 颜色1
     * @param {Object} color2 - 颜色2
     * @param {string} level - 标准级别: 'AA' | 'AAA'
     * @returns {boolean} 是否满足标准
     */
    meetsContrastStandard: (color1, color2, level = 'AA') => {
        const contrast = colorAnalyzer.calculateContrast(color1, color2);
        // AA标准: 普通文本4.5:1，大文本3:1
        // AAA标准: 普通文本7:1，大文本4.5:1
        const threshold = level === 'AAA' ? 7 : 4.5;
        return contrast >= threshold;
    }
};

/**
 * 颜色格式化工具
 * 提供颜色值的格式化和验证
 */
export const colorFormatter = {
    /**
     * 格式化RGB值，确保在有效范围内
     * @param {number} r - 红色值
     * @param {number} g - 绿色值
     * @param {number} b - 蓝色值
     * @returns {{r: number, g: number, b: number}} 格式化后的RGB对象
     */
    normalizeRgb: (r, g, b) => {
        return {
            r: Math.max(0, Math.min(255, Math.round(r))),
            g: Math.max(0, Math.min(255, Math.round(g))),
            b: Math.max(0, Math.min(255, Math.round(b)))
        };
    },

    /**
     * 格式化HSL值，确保在有效范围内
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 饱和度 (0-100)
     * @param {number} l - 亮度 (0-100)
     * @returns {{h: number, s: number, l: number}} 格式化后的HSL对象
     */
    normalizeHsl: (h, s, l) => {
        return {
            h: ((h % 360) + 360) % 360, // 确保在0-360范围内
            s: Math.max(0, Math.min(100, Math.round(s))),
            l: Math.max(0, Math.min(100, Math.round(l)))
        };
    },

    /**
     * 验证颜色值是否有效
     * @param {Object} color - 颜色对象
     * @returns {boolean} 是否有效
     */
    isValid: (color) => {
        if (!color || typeof color !== 'object') return false;

        if (color.r !== undefined) {
            return (
                typeof color.r === 'number' && color.r >= 0 && color.r <= 255 &&
                typeof color.g === 'number' && color.g >= 0 && color.g <= 255 &&
                typeof color.b === 'number' && color.b >= 0 && color.b <= 255
            );
        }

        if (color.h !== undefined) {
            return (
                typeof color.h === 'number' && color.h >= 0 && color.h <= 360 &&
                typeof color.s === 'number' && color.s >= 0 && color.s <= 100 &&
                typeof color.l === 'number' && color.l >= 0 && color.l <= 100
            );
        }

        return false;
    }
};

/**
 * 导出所有工具的便捷对象
 */
export default {
    transcoder: colorTranscoder,
    mapper: colorMapper,
    analyzer: colorAnalyzer,
    formatter: colorFormatter
};
