import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '心理测评服务平台',
  description: '高校心理健康测评与数据管理平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
<html lang="zh-CN">
      <body className="bg-warm-100 text-slate-600 antialiased">
        {children}
      </body>
    </html>
  )
}
