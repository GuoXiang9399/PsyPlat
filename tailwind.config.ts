import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色跟随品牌 logo「心之芽」：珊瑚暖色系
        primary: {
          DEFAULT: '#E05A3C',
          hover: '#C74A2F',
          light: '#FDEEE8',
        },
        // 辅助色取 logo 新芽的暖绿，与主色形成层次
        secondary: {
          DEFAULT: '#8CAF50',
          hover: '#7A9C45',
        },
        success: { DEFAULT: '#2BA344', light: '#E8F8EE' },
        // 警示用琥珀黄，避免与主色（珊瑚橙红）混淆
        warning: { DEFAULT: '#D48806', light: '#FFF4E0' },
        danger: { DEFAULT: '#D54941', light: '#FDECEC' },
        info: { DEFAULT: '#4787C0', light: '#E9F2FA' },
        // 文字色阶：WorkBuddy 风格的深字（带暖调，与整体协调）
        ink: {
          DEFAULT: '#1F1D1A', // 主文字 / 标题
          soft: '#524E48',    // 正文、次要文字
          muted: '#86817A',   // 辅助说明、图标默认色
          faint: '#C5C0B8',   // 占位符、禁用
        },
        warm: {
          50: '#FBFAF9',
          100: '#F7F6F4',
          200: '#F1EFEC',
          300: '#E6E3DE',
          400: '#D3CEC7',
          500: '#A9A39B',
          600: '#8A847C',
          700: '#6B665F',
          800: '#4E4A44',
          900: '#1F1D1A',
        },
        // 覆盖 orange 色板：品牌珊瑚色系（所有 orange-* 类名整体生效，页面无需逐个修改）
        orange: {
          50: '#FDEEE8',
          100: '#FADDD2',
          200: '#F6C0AC',
          300: '#F0997B',
          400: '#E87A5D',
          500: '#E05A3C',
          600: '#C74A2F',
          700: '#A83C24',
          800: '#852E1B',
          900: '#622112',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
