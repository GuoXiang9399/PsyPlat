'use client'

import { BarChart3, LayoutDashboard, FileText, Database, Settings, Info } from 'lucide-react'
import { ShellSidebar, type ShellTabKey } from '@/components/ShellSidebar'
import { AnalysisContent } from './content'

const tabs = [
  { key: 'dashboard' as ShellTabKey, labelKey: 'nav_home', icon: LayoutDashboard },
  { key: 'assessment' as ShellTabKey, labelKey: 'nav_assessment', icon: FileText },
  { key: 'data' as ShellTabKey, labelKey: 'nav_data', icon: Database },
  { key: 'analysis' as ShellTabKey, labelKey: 'nav_analysis', icon: BarChart3 },
  { key: 'settings' as ShellTabKey, labelKey: 'nav_settings', icon: Settings },
  { key: 'about' as ShellTabKey, labelKey: 'nav_about', icon: Info },
]

export default function AnalysisPage() {
  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      <ShellSidebar activeTab="analysis" onTabChange={() => {}} tabs={tabs} />
      <main className="flex-1 overflow-auto p-6">
        <AnalysisContent />
      </main>
    </div>
  )
}
