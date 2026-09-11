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
        // 奶油风主色：主背景 EAE3D5，强调色为同族奶油棕（非橙、柔和不刺眼）
        primary: {
          DEFAULT: '#A8905F',
          hover: '#8F7A4E',
          light: '#F2EBDD',
        },
        secondary: {
          DEFAULT: '#B29B71',
          hover: '#95805A',
        },
        success: { DEFAULT: '#10B981', light: '#D1FAE5' },
        warning: { DEFAULT: '#C9962E', light: '#FBF0D6' },
        danger: { DEFAULT: '#C96A5A', light: '#FBE9E5' },
        info: { DEFAULT: '#7C9AAC', light: '#E4ECF1' },
        warm: {
          50: '#F7F2E8',
          100: '#EAE3D5',
          200: '#E2D8C4',
          300: '#D6C9B0',
          400: '#C4B697',
          500: '#A89672',
          600: '#8A7A5C',
          700: '#6B5F47',
          800: '#4E4534',
          900: '#383123',
        },
        // 覆盖 orange 色板：奶油米色系（所有 orange-* 类名整体生效，页面无需逐个修改）
        orange: {
          50: '#FAF6EF',
          100: '#F3ECE0',
          200: '#EAE3D5',
          300: '#DCCFB5',
          400: '#C9B895',
          500: '#A8905F',
          600: '#8F7A4E',
          700: '#72603C',
          800: '#55472C',
          900: '#3B321F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
