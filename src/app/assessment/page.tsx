'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  LayoutDashboard,
  Database,
  Settings,
  Info,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User,
  MousePointer,
  Camera,
  Shield,
  RotateCcw,
  Play,
  Maximize,
  Minimize,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

function Sidebar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('psyc_sidebar_collapsed') === '1' } catch { return false }
  })

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('psyc_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  const tabs = [
    { key: 'dashboard' as TabKey, label: '首页概览', icon: LayoutDashboard },
    { key: 'assessment' as TabKey, label: '心理测评', icon: FileText },
    { key: 'data' as TabKey, label: '数据管理', icon: Database },
    { key: 'settings' as TabKey, label: '系统设置', icon: Settings },
    { key: 'about' as TabKey, label: '关于系统', icon: Info },
  ]

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-warm-300 flex flex-col transition-all duration-200`}>
      <div className="p-3 border-b border-warm-300">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <h1 className="text-sm font-bold text-slate-800 leading-tight">河南大学基础医学院心理站</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-warm-200/70 transition-colors"
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              title={collapsed ? tab.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                  : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && tab.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

const stepLabels = ['基本信息', '知情同意', '心理测评', '结束']

const phq9Questions = [
  '对事物几乎没有兴趣或愉悦感',
  '感到心情低落、沮丧或绝望',
  '入睡困难、睡不安稳或睡眠过多',
  '感到疲倦或没有活力',
  '食欲不振或吃太多',
  '觉得自己很糟糕、或觉得自己很失败、或让自己或家人失望',
  '难以集中注意力',
  '动作或说话速度缓慢到别人已经察觉，或相反地，烦躁不安',
  '有不如死掉或用某种方式伤害自己的念头'
]

const gad7Questions = [
  '感到紧张、焦虑或急切',
  '无法停止或控制担忧',
  '对各种事情担忧过多',
  '很难放松下来',
  '烦躁不安，坐立不宁',
  '容易烦恼或急躁',
  '感到好像有可怕的事要发生'
]

const riskOptions = ['完全不会', '好几天', '一半以上天数', '几乎每天']

import { AssessmentContent } from './content'

export default function AssessmentPage() {
  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      <Sidebar activeTab="assessment" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <AssessmentContent />
      </main>
    </div>
  )
}