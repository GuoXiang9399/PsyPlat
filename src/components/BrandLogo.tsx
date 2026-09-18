'use client'

/**
 * 品牌标识「心之芽」：心形承载情感，新芽表达成长与希望。
 * 暖色系扁平风格，与 WorkBuddy 浅色界面柔和共存。
 * 自带圆角方块底，直接按容器尺寸使用即可（如 w-8 h-8）。
 */
export function BrandLogo({
  className = 'w-8 h-8',
  title = '迹心',
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="#FDEEE8" />
      <path
        d="M16 25C16 25 8 19.5 8 15.5C8 13 10 11.5 12 11.5C14 11.5 16 13.5 16 13.5C16 13.5 18 11.5 20 11.5C22 11.5 24 13 24 15.5C24 19.5 16 25 16 25Z"
        fill="#E05A3C"
      />
      <path d="M16 14L16 7.5" stroke="#8CAF50" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16 11.5C13 11.5 11.5 9.5 11.5 7.5C14 7 16 9 16 11.5Z"
        fill="#A8C46A"
      />
      <path
        d="M16 10.5C19 10.5 20.5 8.5 20.5 6.5C18 6 16 8 16 10.5Z"
        fill="#8CAF50"
      />
    </svg>
  )
}
