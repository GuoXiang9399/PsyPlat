'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  FileText,
  Database,
  Settings,
  Info,
  Brain,
  Wifi,
  Monitor,
  CheckCircle
} from 'lucide-react'
import { DashboardContent } from './dashboard/page'
import { AssessmentContent } from './assessment/page'
import { DataContent } from './data/page'
import { SettingsContent } from './settings/page'
import { AboutContent } from './about/page'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

const tabs = [
  { key: 'dashboard' as TabKey, label: '首页概览', icon: LayoutDashboard },
  { key: 'assessment' as TabKey, label: '心理测评', icon: FileText },
  { key: 'data' as TabKey, label: '数据管理', icon: Database },
  { key: 'settings' as TabKey, label: '系统设置', icon: Settings },
  { key: 'about' as TabKey, label: '关于系统', icon: Info },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [systemStatus, setSystemStatus] = useState({
    camera: '正常',
    mouse: '正常',
    model: '已加载',
    connection: '在线'
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemStatus(prev => ({
        ...prev,
        connection: Math.random() > 0.9 ? '连接中...' : '在线'
      }))
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent />
      case 'assessment': return <AssessmentContent />
      case 'data': return <DataContent />
      case 'settings': return <SettingsContent />
      case 'about': return <AboutContent />
      default: return <DashboardContent />
    }
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      {/* 侧边栏 */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">心理预警系统</h1>
              <p className="text-xs text-slate-500">Psych Warning System</p>
            </div>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* 系统状态 */}
        <div className="p-3 border-t border-slate-700">
          <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-slate-500 mb-2">系统状态</div>
            <div className="flex items-center gap-2 text-xs">
              <Monitor className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-400">摄像头:</span>
              <span className="text-green-400">{systemStatus.camera}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-slate-400">鼠标追踪:</span>
              <span className="text-green-400">{systemStatus.mouse}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">模型状态:</span>
              <span className="text-blue-400">{systemStatus.model}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Wifi className={`w-3.5 h-3.5 ${systemStatus.connection === '在线' ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-slate-400">网络:</span>
              <span className={systemStatus.connection === '在线' ? 'text-green-400' : 'text-yellow-400'}>{systemStatus.connection}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>
    </div>
  )
}
