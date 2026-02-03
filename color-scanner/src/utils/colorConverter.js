/**
 * 颜色转换工具模块
 * 支持 HEX、RGB、HSL 三种格式之间的实时同步转换
 */

/**
 * RGB转HEX
 * @param {number} r - 红色值 (0-255)
 * @param {number} g - 绿色值 (0-255)
 * @param {number} b - 蓝色值 (0-255)
 * @returns {string} HEX颜色值 (如: #ff0000)
 */
export const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
        const hex = Math.round(n).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

/**
 * HEX转RGB
 * @param {string} hex - HEX颜色值 (如: #ff0000 或 ff0000)
 * @returns {{r: number, g: number, b: number}} RGB对象
 */
export const hexToRgb = (hex) => {
    // 移除 # 号
    const cleanHex = hex.replace('#', '');
    
    // 处理3位HEX值 (如: #f00 -> #ff0000)
    const fullHex = cleanHex.length === 3
        ? cleanHex.split('').map(char => char + char).join('')
        : cleanHex;
    
    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    
    return { r, g, b };
};

/**
 * RGB转HSL
 * @param {number} r - 红色值 (0-255)
 * @param {number} g - 绿色值 (0-255)
 * @param {number} b - 蓝色值 (0-255)
 * @returns {{h: number, s: number, l: number}} HSL对象
 */
export const rgbToHsl = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // 无色彩
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
            default:
                h = 0;
        }
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

/**
 * HSL转RGB
 * @param {number} h - 色相 (0-360)
 * @param {number} s - 饱和度 (0-100)
 * @param {number} l - 亮度 (0-100)
 * @returns {{r: number, g: number, b: number}} RGB对象
 */
export const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // 无色彩
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};

/**
 * HEX转HSL
 * @param {string} hex - HEX颜色值
 * @returns {{h: number, s: number, l: number}} HSL对象
 */
export const hexToHsl = (hex) => {
    const rgb = hexToRgb(hex);
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
};

/**
 * HSL转HEX
 * @param {number} h - 色相 (0-360)
 * @param {number} s - 饱和度 (0-100)
 * @param {number} l - 亮度 (0-100)
 * @returns {string} HEX颜色值
 */
export const hslToHex = (h, s, l) => {
    const rgb = hslToRgb(h, s, l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
};

/**
 * 统一的颜色转换函数
 * 根据输入格式自动转换为所有格式
 * @param {string|Object} color - 颜色值，可以是:
 *   - HEX字符串: "#ff0000" 或 "ff0000"
 *   - RGB对象: {r: 255, g: 0, b: 0}
 *   - HSL对象: {h: 0, s: 100, l: 50}
 * @returns {{hex: string, rgb: Object, hsl: Object}} 包含所有格式的颜色对象
 */
export const convertColor = (color) => {
    let rgb, hex, hsl;
    
    // 判断输入格式
    if (typeof color === 'string') {
        // HEX格式
        hex = color.startsWith('#') ? color : `#${color}`;
        rgb = hexToRgb(hex);
        hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    } else if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
        // RGB格式
        rgb = color;
        hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    } else if (color.h !== undefined && color.s !== undefined && color.l !== undefined) {
        // HSL格式
        hsl = color;
        rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
        hex = hslToHex(hsl.h, hsl.s, hsl.l);
    } else {
        throw new Error('Invalid color format');
    }
    
    return {
        hex,
        rgb,
        hsl,
        // 提供格式化的字符串输出
        rgbString: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        hslString: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    };
};

/**
 * 验证颜色值是否有效
 * @param {string|Object} color - 颜色值
 * @returns {boolean} 是否有效
 */
export const isValidColor = (color) => {
    try {
        convertColor(color);
        return true;
    } catch (e) {
        return false;
    }
};
