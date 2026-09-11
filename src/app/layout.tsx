import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '多模态心理预警系统',
  description: '多模态无接触式心理问题早期预警系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-dark-bg text-slate-300 antialiased">
        {children}
      </body>
    </html>
  )
}
