'use client'

import { useState } from 'react'
import {
  Info,
  LayoutDashboard,
  FileText,
  Database,
  Settings,
  Brain,
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
import { BrandLogo } from '@/components/BrandLogo'
import { useT } from '@/lib/i18n'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

function Sidebar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const { t } = useT()
  const tabs = [
    { key: 'dashboard' as TabKey, label: t('nav_home'), icon: LayoutDashboard },
    { key: 'assessment' as TabKey, label: t('nav_assessment'), icon: FileText },
    { key: 'data' as TabKey, label: t('nav_data'), icon: Database },
    { key: 'settings' as TabKey, label: t('nav_settings'), icon: Settings },
    { key: 'about' as TabKey, label: t('nav_about'), icon: Info },
  ]

  return (
    <aside className="w-64 bg-white border-r border-warm-300 flex flex-col">
      <div className="p-4 border-b border-warm-300">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-orange-500" />
          <h1 className="text-sm font-bold text-slate-800 leading-tight">{t('about_brand')}</h1>
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

export function AboutContent() {
  const { t } = useT()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  const techTree: TreeNode[] = [
    {
      label: t('tech_front'),
      icon: Layers,
      children: [
        { label: 'Tauri 2 (Rust + WebView)', icon: Cpu },
        { label: 'Next.js 14', icon: Layers },
        { label: 'TailwindCSS', icon: Layers },
        { label: 'TypeScript', icon: Tag },
        { label: t('tech_lucide'), icon: Eye },
      ]
    },
    {
      label: t('tech_back'),
      icon: Cpu,
      children: [
        { label: 'Rust + Tokio', icon: Cpu },
        { label: 'Tauri IPC', icon: GitBranch },
        { label: t('tech_sqlite'), icon: DBIcon },
      ]
    },
    {
      label: t('tech_data'),
      icon: Eye,
      children: [
        { label: t('tech_mouse'), icon: Eye },
        { label: t('tech_opencv'), icon: Eye },
        { label: t('tech_hrv'), icon: Eye },
      ]
    },
    {
      label: t('tech_ai'),
      icon: Brain,
      children: [
        { label: t('tech_multimodal'), icon: Brain },
        { label: t('tech_scales'), icon: FileText },
        { label: t('tech_behavior'), icon: Cpu },
      ]
    }
  ]

  const steps = [
    { title: t('about_step1'), desc: t('about_step1_desc') },
    { title: t('about_step2'), desc: t('about_step2_desc') },
    { title: t('about_step3'), desc: t('about_step3_desc') },
    { title: t('about_step4'), desc: t('about_step4_desc') }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">{t('about_title')}</h1>

      {/* 系统概述 */}
      <div className="bg-white rounded-lg p-6 border border-warm-300">
        <div className="flex items-start gap-4">
          <BrandLogo className="w-16 h-16 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-ink mb-2">{t('about_system_name')}</h2>
            <p className="text-sm text-ink-soft leading-relaxed">
              {t('about_intro')}
            </p>
          </div>
        </div>
      </div>

      {/* 隐私保护声明 */}
      <div className="bg-yellow-500/10 rounded-lg p-6 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">{t('about_privacy_title')}</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>{t('about_privacy_1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>{t('about_privacy_2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>{t('about_privacy_3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Cpu className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>{t('about_privacy_4')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 技术架构 */}
      <div className="bg-white rounded-lg p-6 border border-warm-300">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-orange-500" />
          {t('about_arch')}
        </h2>
        <div className="space-y-1">
          {techTree.map((node, index) => (
            <TreeItem key={index} node={node} />
          ))}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="bg-white rounded-lg p-6 border border-warm-300">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          {t('about_guide')}
        </h2>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-[#FDEEE8] rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-ink">
                {index + 1}
              </div>
              <div className="flex-1 pb-3 border-b border-warm-300/60 last:border-0">
                <div className="text-sm font-medium text-slate-700">{step.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 版本信息 */}
      <div className="bg-white rounded-lg p-6 border border-warm-300">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-orange-500" />
          {t('about_version')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">{t('about_ver')}</div>
              <div className="text-sm text-slate-500 font-medium">v2.1.0</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">{t('about_date')}</div>
              <div className="text-sm text-slate-500 font-medium">2026-09-01</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">{t('about_dev')}</div>
              <div className="text-sm text-slate-500 font-medium">Xiang Guo</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500">{t('about_mail')}</div>
              <div className="text-sm text-slate-500 font-medium">guoxiang@henu.edu.cn</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

