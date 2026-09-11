'use client'

import { useState } from 'react'
import {
  Info,
  LayoutDashboard,
  FileText,
  Database,
  Settings,
  Shield,
  Cpu,
  Layers,
  Database as DBIcon,
  Eye,
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Tag,
  Calendar,
  User,
  Mail,
  AlertTriangle,
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

interface TreeNode {
  label: string
  icon: React.ElementType
  children?: TreeNode[]
}

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const Icon = node.icon

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-orange-500 transition-colors"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        {!hasChildren && <div className="w-3.5" />}
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">{node.label}</span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child, index) => (
            <TreeItem key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

import { AboutContent } from './content'

export default function AboutPage() {
  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      <Sidebar activeTab="about" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <AboutContent />
      </main>
    </div>
  )
}
