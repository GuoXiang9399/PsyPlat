'use client'

import { LayoutDashboard, FileText, Database, Settings, Info } from 'lucide-react'
import { ShellSidebar, type ShellTabKey } from '@/components/ShellSidebar'
import { DashboardContent } from './content'

const tabs = [
  { key: 'dashboard' as ShellTabKey, labelKey: 'nav_home', icon: LayoutDashboard },
  { key: 'assessment' as ShellTabKey, labelKey: 'nav_assessment', icon: FileText },
  { key: 'data' as ShellTabKey, labelKey: 'nav_data', icon: Database },
  { key: 'settings' as ShellTabKey, labelKey: 'nav_settings', icon: Settings },
  { key: 'about' as ShellTabKey, labelKey: 'nav_about', icon: Info },
]

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      <ShellSidebar activeTab="dashboard" onTabChange={() => {}} tabs={tabs} />
      <main className="flex-1 overflow-auto p-6">
        <DashboardContent />
      </main>
    </div>
  )
}
