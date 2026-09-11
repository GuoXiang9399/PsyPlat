'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Database,
  BarChart3,
  Settings,
  Info,
  Lock,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { DashboardContent } from './dashboard/content'
import { AssessmentContent } from './assessment/content'
import { DataContent } from './data/content'
import { AnalysisContent } from './analysis/content'
import { SettingsContent } from './settings/content'
import { AboutContent } from './about/content'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'analysis' | 'settings' | 'about'

const tabs = [
  { key: 'dashboard' as TabKey, label: '首页概览', icon: LayoutDashboard },
  { key: 'assessment' as TabKey, label: '心理测评', icon: FileText },
  { key: 'data' as TabKey, label: '数据管理', icon: Database },
  { key: 'analysis' as TabKey, label: '数据分析', icon: BarChart3 },
  { key: 'settings' as TabKey, label: '系统设置', icon: Settings },
  { key: 'about' as TabKey, label: '关于系统', icon: Info },
]

const PROTECTED_TABS: TabKey[] = ['data', 'analysis', 'settings', 'about']
const ADMIN_PWD_KEY = 'psyc_admin_pwd'
const ADMIN_AUTH_KEY = 'psyc_admin_auth'

function getAdminPassword(): string {
  try { return localStorage.getItem(ADMIN_PWD_KEY) || '123456' } catch { return '123456' }
}

function isAdminAuthed(): boolean {
  try { return sessionStorage.getItem(ADMIN_AUTH_KEY) === '1' } catch { return false }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('psyc_sidebar_collapsed') === '1' } catch { return false }
  })

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('psyc_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  const handleTabChange = (key: TabKey) => {
    if (PROTECTED_TABS.includes(key) && !isAdminAuthed()) {
      setPendingTab(key)
      setPasswordInput('')
      setPasswordError(false)
      return
    }
    setActiveTab(key)
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === getAdminPassword()) {
      try { sessionStorage.setItem(ADMIN_AUTH_KEY, '1') } catch {}
      setActiveTab(pendingTab as TabKey)
      setPendingTab(null)
      setPasswordInput('')
    } else {
      setPasswordError(true)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent />
      case 'assessment': return <AssessmentContent />
      case 'data': return <DataContent />
      case 'analysis': return <AnalysisContent />
      case 'settings': return <SettingsContent />
      case 'about': return <AboutContent />
      default: return <DashboardContent />
    }
  }

  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      {/* 侧边栏 */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-warm-300 flex flex-col transition-all duration-200`}>
        {/* 顶部：折叠按钮，无 Logo */}
        <div className="p-3 border-b border-warm-300">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <h1 className="text-sm font-bold text-slate-800 leading-tight">河南大学基础医学院心理站</h1>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-warm-200/70 transition-colors"
              aria-label={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
              title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                title={sidebarCollapsed ? tab.label : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                    : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>

      {/* 管理密码验证弹窗 */}
      {pendingTab && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-500" />
                管理密码验证
              </h2>
              <button
                onClick={() => setPendingTab(null)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              访问「{tabs.find(t => t.key === pendingTab)?.label}」需要管理权限，请输入管理密码。
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
              className={`w-full bg-warm-100 border rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500 ${
                passwordError ? 'border-red-400' : 'border-warm-300'
              }`}
              placeholder="请输入管理密码"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-2">密码错误，请重新输入</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setPendingTab(null)}
                className="flex-1 bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}