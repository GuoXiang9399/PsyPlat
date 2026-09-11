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
  Wifi,
  Monitor,
  CheckCircle,
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
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">心理预警系统</h1>
            <p className="text-xs text-slate-500">Psych Warning System</p>
          </div>
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
      <div className="p-3 border-t border-slate-700">
        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-slate-500 mb-2">系统状态</div>
          <div className="flex items-center gap-2 text-xs">
            <Monitor className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400">摄像头:</span>
            <span className="text-green-400">正常</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400">鼠标追踪:</span>
            <span className="text-green-400">正常</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">模型状态:</span>
            <span className="text-blue-400">已加载</span>
          </div>
        </div>
      </div>
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
    { id: 'A001', studentId: '20230801', time: '2026-09-11 09:23', phq9: 8, gad7: 6, risk: '轻度风险', status: 'completed' as const },
    { id: 'A002', studentId: '20230815', time: '2026-09-11 10:45', phq9: 15, gad7: 12, risk: '中度风险', status: 'pending_review' as const },
    { id: 'A003', studentId: '20230722', time: '2026-09-11 11:02', phq9: 4, gad7: 3, risk: '低风险', status: 'completed' as const },
    { id: 'A004', studentId: '20230905', time: '2026-09-11 13:18', phq9: 18, gad7: 16, risk: '高风险', status: 'intervened' as const },
    { id: 'A005', studentId: '20230833', time: '2026-09-11 14:30', phq9: 7, gad7: 5, risk: '低风险', status: 'completed' as const },
  ])

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case '高风险': return 'bg-red-500/20 text-red-400'
      case '中度风险': return 'bg-orange-500/20 text-orange-400'
      case '轻度风险': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-green-500/20 text-green-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'pending_review': return '待审核'
      case 'intervened': return '已干预'
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-blue-500/20 text-blue-400'
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-400'
      case 'intervened': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">欢迎使用多模态无接触式心理问题早期预警系统</h1>
            <p className="text-blue-100">基于行为特征与生理信号的智能心理评估平台</p>
          </div>
          <Brain className="w-16 h-16 text-blue-200 opacity-50" />
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">今日测评</span>
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.today}</div>
          <div className="text-xs text-slate-500 mt-1">较昨日 +3</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">本月累计</span>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.monthly}</div>
          <div className="text-xs text-slate-500 mt-1">目标完成 78%</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">高风险预警</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
          <div className="text-xs text-slate-500 mt-1">需关注人数</div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">准确率</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.accuracy}%</div>
          <div className="text-xs text-slate-500 mt-1">模型评估</div>
        </div>
      </div>

      {/* 最近活动表格 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">最近活动</h2>
          <button className="text-blue-400 text-sm flex items-center hover:text-blue-300">
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-3 text-slate-400 text-sm font-medium">ID</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">学号</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">时间</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">PHQ-9</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">GAD-7</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">风险等级</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-3 text-slate-300 text-sm">{activity.id}</td>
                  <td className="p-3 text-slate-300 text-sm">{activity.studentId}</td>
                  <td className="p-3 text-slate-300 text-sm">{activity.time}</td>
                  <td className="p-3 text-slate-300 text-sm">{activity.phq9}</td>
                  <td className="p-3 text-slate-300 text-sm">{activity.gad7}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskClass(activity.risk)}`}>
                      {activity.risk}
                    </span>
                  </td>
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
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors">
          <ArrowRight className="w-4 h-4" /> 开始新测评
        </button>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors">
          <Activity className="w-4 h-4" /> 查看统计
        </button>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors">
          <Clock className="w-4 h-4" /> 历史记录
        </button>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <Sidebar activeTab="dashboard" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <DashboardContent />
      </main>
    </div>
  )
}
