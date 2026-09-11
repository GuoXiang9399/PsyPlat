'use client'

import { useState } from 'react'
import {
  Database,
  LayoutDashboard,
  FileText,
  Settings,
  Info,
  Brain,
  Wifi,
  Monitor,
  CheckCircle,
  Search,
  Download,
  Filter,
  Users,
  AlertTriangle,
  Target,
  FileCheck
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

export function DataContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')

  const [records] = useState([
    { id: 'A001', studentId: '20230801', time: '2026-09-11 09:23', phq9: 8, gad7: 6, risk: '轻度风险' as const, status: 'completed' as const },
    { id: 'A002', studentId: '20230815', time: '2026-09-11 10:45', phq9: 15, gad7: 12, risk: '中度风险' as const, status: 'pending_review' as const },
    { id: 'A003', studentId: '20230722', time: '2026-09-11 11:02', phq9: 4, gad7: 3, risk: '低风险' as const, status: 'completed' as const },
    { id: 'A004', studentId: '20230905', time: '2026-09-11 13:18', phq9: 18, gad7: 16, risk: '高风险' as const, status: 'intervened' as const },
    { id: 'A005', studentId: '20230833', time: '2026-09-11 14:30', phq9: 7, gad7: 5, risk: '低风险' as const, status: 'completed' as const },
    { id: 'A006', studentId: '20230789', time: '2026-09-11 15:12', phq9: 12, gad7: 9, risk: '中度风险' as const, status: 'completed' as const },
    { id: 'A007', studentId: '20230912', time: '2026-09-11 16:45', phq9: 3, gad7: 2, risk: '低风险' as const, status: 'completed' as const },
    { id: 'A008', studentId: '20230877', time: '2026-09-11 17:20', phq9: 20, gad7: 18, risk: '高风险' as const, status: 'pending_review' as const },
  ])

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.studentId.includes(searchQuery) || record.id.includes(searchQuery)
    const matchesRisk = filterRisk === 'all' || record.risk === filterRisk
    return matchesSearch && matchesRisk
  })

  const stats = {
    total: records.length,
    highRisk: records.filter(r => r.risk === '高风险').length,
    pending: records.filter(r => r.status === 'pending_review').length,
    completed: records.filter(r => r.status === 'completed').length
  }

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

  const handleExportCSV = () => {
    const headers = ['ID', '学号', '时间', 'PHQ-9', 'GAD-7', '风险等级', '状态']
    const rows = filteredRecords.map(r => [
      r.id, r.studentId, r.time, r.phq9, r.gad7, r.risk, getStatusText(r.status)
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `assessment_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">数据管理</h1>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4" />
          共 {records.length} 条记录
        </div>
      </div>

      {/* 统计面板 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">总记录数</span>
            <FileCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">高风险</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">待审核</span>
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">已完成</span>
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索学号或ID..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">全部风险等级</option>
            <option value="低风险">低风险</option>
            <option value="轻度风险">轻度风险</option>
            <option value="中度风险">中度风险</option>
            <option value="高风险">高风险</option>
          </select>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Download className="w-4 h-4" /> 导出CSV
        </button>
      </div>

      {/* 数据表格 */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
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
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-3 text-slate-300 text-sm">{record.id}</td>
                  <td className="p-3 text-slate-300 text-sm">{record.studentId}</td>
                  <td className="p-3 text-slate-300 text-sm">{record.time}</td>
                  <td className="p-3 text-slate-300 text-sm">{record.phq9}</td>
                  <td className="p-3 text-slate-300 text-sm">{record.gad7}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskClass(record.risk)}`}>
                      {record.risk}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClass(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            没有找到匹配的记录
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <Sidebar activeTab="data" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <DataContent />
      </main>
    </div>
  )
}
