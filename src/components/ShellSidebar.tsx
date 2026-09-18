'use client'

import { useEffect, useState } from 'react'
import {
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon
} from 'lucide-react'
import { initLang, setLang, useLang, t } from '@/lib/i18n'

export type ShellTabKey = 'dashboard' | 'assessment' | 'assess-settings' | 'data' | 'analysis' | 'settings' | 'about'

export function ShellSidebar({ activeTab, onTabChange, tabs }: {
  activeTab: ShellTabKey
  onTabChange: (tab: ShellTabKey) => void
  tabs: { key: ShellTabKey; labelKey: string; icon: LucideIcon }[]
}) {
  const lang = useLang()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('psyc_sidebar_collapsed') === '1' } catch { return false }
  })

  useEffect(() => {
    initLang()
  }, [])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('psyc_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-warm-300 flex flex-col transition-all duration-200`}>
      <div className="p-3 border-b border-warm-300">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <h1 className="text-sm font-bold text-slate-800 leading-tight">{t('about_brand')}</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-warm-200/70 transition-colors"
            aria-label={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            title={collapsed ? t('sidebar_expand') : t('sidebar_collapse')}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const label = t(tab.labelKey)
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-3'} gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.key
                  ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                  : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && label}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-warm-300">
        <div className="flex items-center gap-1 bg-warm-200/60 rounded-lg p-1">
          <Languages className="w-3.5 h-3.5 text-ink-muted shrink-0 ml-1" />
          <button
            onClick={() => setLang('zh')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors ${
              lang === 'zh' ? 'bg-white text-ink font-medium shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-colors ${
              lang === 'en' ? 'bg-white text-ink font-medium shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </aside>
  )
}
