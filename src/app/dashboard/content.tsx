'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  AlertTriangle,
  Target,
  Activity,
  ChevronRight,
  Clock,
  ArrowRight,
  Brain,
  Settings,
  Database,
  Info
} from 'lucide-react'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

function Sidebar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const tabs = [
    { key: 'dashboard' as TabKey, label: '首页概览', icon: LayoutDashboard },
    { key: 'assessment' as TabKey, label: '心理测评', icon: FileText },
    { key: 'data' as TabKey, label: '数据管理', icon: Database },
    { key: 'settings' as TabKey, label: '系统设置', icon: Settings },
    { key: 'about' as TabKey, label: '关于系统', icon: Info },
  ]

  return (
    <aside className="w-64 bg-white border-r border-warm-300 flex flex-col">
      <div className="p-4 border-b border-warm-300">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-orange-500" />
          <h1 className="text-sm font-bold text-slate-800 leading-tight">河南大学基础医学院心理站</h1>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#FDEEE8] text-ink font-medium'
                  : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export function DashboardContent() {
  const [stats] = useState({
    today: 12,
    monthly: 156,
    highRisk: 3,
    accuracy: 94.2
  })

const [recentActivities] = useState([
    { id: 'A001', studentId: '20230801', time: '2026-09-11 09:23', status: 'completed' as const },
    { id: 'A002', studentId: '20230815', time: '2026-09-11 10:45', status: 'incomplete' as const },
    { id: 'A003', studentId: '20230722', time: '2026-09-11 11:02', status: 'completed' as const },
    { id: 'A004', studentId: '20230905', time: '2026-09-11 13:18', status: 'completed' as const },
    { id: 'A005', studentId: '20230833', time: '2026-09-11 14:30', status: 'completed' as const },
  ])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'incomplete': return '未完成'
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'incomplete': return 'bg-warm-200 text-slate-400'
      default: return 'bg-warm-200 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-orange-700 via-orange-500 to-orange-400 rounded-lg p-6 text-white shadow-sm">
<div className="flex items-center justify-between">
<div>
            <h1 className="text-2xl font-bold mb-2">河南大学基础医学院心理站</h1>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">今日测评</span>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.today}</div>
          <div className="text-xs text-slate-500 mt-1">较昨日 +3</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">本月累计</span>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.monthly}</div>
          <div className="text-xs text-slate-500 mt-1">目标完成 78%</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">高风险预警</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
          <div className="text-xs text-slate-500 mt-1">需关注人数</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">准确率</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.accuracy}%</div>
          <div className="text-xs text-slate-500 mt-1">模型评估</div>
        </div>
      </div>

      {/* 最近活动表格 */}
      <div className="bg-white rounded-lg border border-warm-300">
        <div className="p-4 border-b border-warm-300 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">最近活动</h2>
          <button className="text-ink-soft text-sm flex items-center hover:text-[#E05A3C]">
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
<table className="w-full">
            <thead>
              <tr className="border-b border-warm-300">
                <th className="text-left p-3 text-slate-400 text-sm font-medium">ID</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">学号</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">时间</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">完成状态</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-warm-300/60 hover:bg-warm-200/50">
                  <td className="p-3 text-slate-500 text-sm">{activity.id}</td>
                  <td className="p-3 text-slate-500 text-sm">{activity.studentId}</td>
                  <td className="p-3 text-slate-500 text-sm">{activity.time}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClass(activity.status)}`}>
                      {getStatusText(activity.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="flex gap-3">
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors">
          <ArrowRight className="w-4 h-4" /> 开始新测评
        </button>
        <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
          <Activity className="w-4 h-4" /> 查看统计
        </button>
        <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
          <Clock className="w-4 h-4" /> 历史记录
        </button>
      </div>
    </div>
  )
}

