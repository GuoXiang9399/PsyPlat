'use client'

import { useState } from 'react'
import {
  Info,
  LayoutDashboard,
  FileText,
  Database,
  Settings,
  Brain,
  Wifi,
  Monitor,
  CheckCircle,
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
  AlertTriangle
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
        className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-blue-400 transition-colors"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren && (
          expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        {!hasChildren && <div className="w-3.5" />}
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-300">{node.label}</span>
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

export function AboutContent() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  const techTree: TreeNode[] = [
    {
      label: '前端层',
      icon: Layers,
      children: [
        { label: 'Tauri 2 (Rust + WebView)', icon: Cpu },
        { label: 'Next.js 14', icon: Layers },
        { label: 'TailwindCSS', icon: Layers },
        { label: 'TypeScript', icon: Tag },
        { label: 'Lucide 图标', icon: Eye },
      ]
    },
    {
      label: '后端层',
      icon: Cpu,
      children: [
        { label: 'Rust + Tokio', icon: Cpu },
        { label: 'Tauri IPC', icon: GitBranch },
        { label: 'SQLite 本地存储', icon: DBIcon },
      ]
    },
    {
      label: '数据采集层',
      icon: Eye,
      children: [
        { label: '鼠标轨迹追踪', icon: Eye },
        { label: 'OpenCV 面部检测', icon: Eye },
        { label: '心率变异性分析', icon: Eye },
      ]
    },
    {
      label: 'AI 模型层',
      icon: Brain,
      children: [
        { label: '多模态融合模型', icon: Brain },
        { label: 'PHQ-9 / GAD-7 量表', icon: FileText },
        { label: '行为特征提取', icon: Cpu },
      ]
    }
  ]

  const steps = [
    { title: '知情同意', desc: '阅读并同意隐私声明和知情同意书' },
    { title: '填写信息', desc: '输入学号、年龄、性别等基本信息' },
    { title: '量表测评', desc: '完成 PHQ-9 和 GAD-7 心理量表' },
    { title: '行为采集', desc: '在指定区域移动鼠标，系统自动追踪轨迹' },
    { title: '视频采集', desc: '摄像头采集面部微表情数据（不保存视频）' },
    { title: '查看结果', desc: '查看风险评估结果和建议' }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">关于系统</h1>

      {/* 系统概述 */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
            <Brain className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-2">多模态无接触式心理问题早期预警系统</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              本系统通过整合量表评估、鼠标行为分析和面部微表情识别三种模态数据，利用深度学习模型进行心理问题早期预警。
              系统设计注重隐私保护，所有数据处理均在本地完成，不依赖网络连接，适合在高校等场景部署使用。
            </p>
          </div>
        </div>
      </div>

      {/* 隐私保护声明 */}
      <div className="bg-yellow-500/10 rounded-lg p-6 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">隐私保护声明</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>所有测评数据采用 AES-256 加密存储，密钥由用户本地管理</span>
              </li>
              <li className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>视频采集仅提取特征向量，不保存任何原始图像数据</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>学号等个人信息经过单向哈希处理，无法逆向还原</span>
              </li>
              <li className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>AI 模型推理完全在本地运行，不涉及任何云端传输</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 技术架构 */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          技术架构
        </h2>
        <div className="space-y-1">
          {techTree.map((node, index) => (
            <TreeItem key={index} node={node} />
          ))}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          使用说明
        </h2>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-blue-400">
                {index + 1}
              </div>
              <div className="flex-1 pb-3 border-b border-slate-700/50 last:border-0">
                <div className="text-sm font-medium text-slate-200">{step.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 版本信息 */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-400" />
          版本信息
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">系统版本</div>
              <div className="text-sm text-slate-300 font-medium">v2.1.0</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">发布日期</div>
              <div className="text-sm text-slate-300 font-medium">2026-09-01</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">开发者</div>
              <div className="text-sm text-slate-300 font-medium">心理预警系统开发团队</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">联系邮箱</div>
              <div className="text-sm text-slate-300 font-medium">support@psych-warning.dev</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <Sidebar activeTab="about" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <AboutContent />
      </main>
    </div>
  )
}
