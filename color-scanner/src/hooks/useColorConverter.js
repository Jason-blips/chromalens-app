import { useState, useEffect, useCallback } from 'react';
import { convertColor } from '../utils/colorConverter';

/**
 * 颜色转换自定义Hook
 * 提供颜色格式转换和实时同步功能
 */
export const useColorConverter = (initialColor = null) => {
    const [colorFormats, setColorFormats] = useState({
        hex: null,
        rgb: null,
        hsl: null,
        rgbString: null,
        hslString: null
    });

    /**
     * 更新颜色并自动转换所有格式
     * @param {string|Object} color - 颜色值（HEX字符串、RGB对象或HSL对象）
     */
    const updateColor = useCallback((color) => {
        if (!color) {
            setColorFormats({
                hex: null,
                rgb: null,
                hsl: null,
                rgbString: null,
                hslString: null
            });
            return;
        }

        try {
            const converted = convertColor(color);
            setColorFormats({
                hex: converted.hex,
                rgb: converted.rgb,
                hsl: converted.hsl,
                rgbString: converted.rgbString,
                hslString: converted.hslString
            });
        } catch (err) {
            console.error('Error converting color:', err);
        }
    }, []);

    /**
     * 从RGB值更新颜色
     * @param {number} r - 红色值 (0-255)
     * @param {number} g - 绿色值 (0-255)
     * @param {number} b - 蓝色值 (0-255)
     */
    const updateFromRgb = useCallback((r, g, b) => {
        updateColor({ r, g, b });
    }, [updateColor]);

    /**
     * 从HEX值更新颜色
     * @param {string} hex - HEX颜色值
     */
    const updateFromHex = useCallback((hex) => {
        updateColor(hex);
    }, [updateColor]);

    /**
     * 从HSL值更新颜色
     * @param {number} h - 色相 (0-360)
     * @param {number} s - 饱和度 (0-100)
     * @param {number} l - 亮度 (0-100)
     */
    const updateFromHsl = useCallback((h, s, l) => {
        updateColor({ h, s, l });
    }, [updateColor]);

    // 初始化颜色（如果提供了初始值）
    useEffect(() => {
        if (initialColor) {
            updateColor(initialColor);
        }
    }, [initialColor, updateColor]);

    return {
        colorFormats,
        updateColor,
        updateFromRgb,
        updateFromHex,
        updateFromHsl
    };
};
