'use client'

import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Database,
  BarChart3,
  Settings,
  Info,
  User,
  ShieldCheck,
  Lock,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Languages
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { DEFAULT_STATION_NAME, loadStationName, saveStationName } from '@/lib/brand'
import { initLang, setLang, useLang, t, tFmt } from '@/lib/i18n'
import { DashboardContent } from './dashboard/content'
import { AssessmentContent } from './assessment/content'
import { AssessmentSettingsContent } from './assessment-settings/content'
import { DataContent } from './data/content'
import { AnalysisContent } from './analysis/content'
import { SettingsContent } from './settings/content'
import { AboutContent } from './about/content'

type Mode = 'user' | 'admin'
type TabKey = 'dashboard' | 'assessment' | 'assess-settings' | 'data' | 'analysis' | 'settings' | 'about'

const userTabs = [
  { key: 'assessment' as TabKey, labelKey: 'nav_assessment', icon: FileText },
]

const adminTabs = [
  { key: 'dashboard' as TabKey, labelKey: 'nav_home', icon: LayoutDashboard },
  { key: 'assess-settings' as TabKey, labelKey: 'nav_assess_settings', icon: SlidersHorizontal },
  { key: 'data' as TabKey, labelKey: 'nav_data', icon: Database },
  { key: 'analysis' as TabKey, labelKey: 'nav_analysis', icon: BarChart3 },
  { key: 'settings' as TabKey, labelKey: 'nav_settings', icon: Settings },
  { key: 'about' as TabKey, labelKey: 'nav_about', icon: Info },
]

const ADMIN_PWD_KEY = 'psyc_admin_pwd'
const ADMIN_AUTH_KEY = 'psyc_admin_auth'

function getAdminPassword(): string {
  try { return localStorage.getItem(ADMIN_PWD_KEY) || '123456' } catch { return '123456' }
}

function isAdminAuthed(): boolean {
  try { return sessionStorage.getItem(ADMIN_AUTH_KEY) === '1' } catch { return false }
}

export default function HomePage() {
  const lang = useLang()
  const [mode, setMode] = useState<Mode>('user')
  const [activeTab, setActiveTab] = useState<TabKey>('assessment')
  const [showAdminPwd, setShowAdminPwd] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [stationName, setStationName] = useState(DEFAULT_STATION_NAME)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('psyc_sidebar_collapsed') === '1' } catch { return false }
  })

  useEffect(() => {
    initLang()
    setStationName(loadStationName())
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('psyc_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  const handleModeSwitch = (target: Mode) => {
    if (target === mode) return
    if (target === 'admin') {
      if (isAdminAuthed()) {
        setMode('admin')
        setActiveTab('dashboard')
      } else {
        setPasswordInput('')
        setPasswordError(false)
        setShowAdminPwd(true)
      }
      return
    }
    setMode('user')
    setActiveTab('assessment')
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === getAdminPassword()) {
      try { sessionStorage.setItem(ADMIN_AUTH_KEY, '1') } catch {}
      setMode('admin')
      setActiveTab('dashboard')
      setShowAdminPwd(false)
      setPasswordInput('')
    } else {
      setPasswordError(true)
    }
  }

  const handleStationNameChange = (name: string) => {
    setStationName(name)
    saveStationName(name)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardContent stationName={stationName} onStationNameChange={handleStationNameChange} />
      case 'assessment': return <AssessmentContent />
      case 'assess-settings': return <AssessmentSettingsContent />
      case 'data': return <DataContent />
      case 'analysis': return <AnalysisContent />
      case 'settings': return <SettingsContent />
      case 'about': return <AboutContent />
      default: return <AssessmentContent />
    }
  }

  const segBase = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-colors'
  const segActive = `${segBase} bg-white text-ink font-medium shadow-sm`
  const segIdle = `${segBase} text-ink-muted hover:text-ink`

  const iconSegBase = 'w-full flex items-center justify-center py-1.5 rounded-md transition-colors'
  const iconSegActive = `${iconSegBase} bg-white text-ink shadow-sm`
  const iconSegIdle = `${iconSegBase} text-ink-muted hover:text-ink`

  return (
    <div className="flex h-screen bg-warm-100 text-slate-500">
      {/* 侧边栏 */}
      <aside className={`${sidebarCollapsed ? 'w-[68px]' : 'w-[252px]'} bg-[#F7F6F4] border-r border-warm-300 flex flex-col shrink-0 transition-all duration-200`}>
        {/* 品牌区 */}
        <div className={`h-14 flex items-center border-b border-warm-300 ${sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-2.5'}`}>
          <BrandLogo className="w-8 h-8 shrink-0" title={stationName} />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink truncate leading-tight">{stationName}</div>
            </div>
          )}
        </div>

        {/* 端切换：用户端 / 管理端 */}
        <div className="px-2 pt-3">
          {sidebarCollapsed ? (
            <div className="flex flex-col gap-1 bg-warm-200/60 rounded-lg p-1">
              <button
                onClick={() => handleModeSwitch('user')}
                className={mode === 'user' ? iconSegActive : iconSegIdle}
                title={t('mode_user')}
                aria-label={t('mode_user')}
              >
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleModeSwitch('admin')}
                className={mode === 'admin' ? iconSegActive : iconSegIdle}
                title={t('mode_admin')}
                aria-label={t('mode_admin')}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-1 bg-warm-200/60 rounded-lg p-1">
              <button
                onClick={() => handleModeSwitch('user')}
                className={mode === 'user' ? segActive : segIdle}
              >
                <User className="w-3.5 h-3.5" />
                {t('mode_user')}
              </button>
              <button
                onClick={() => handleModeSwitch('admin')}
                className={mode === 'admin' ? segActive : segIdle}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('mode_admin')}
              </button>
            </div>
          )}
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-medium text-ink-muted">
              {mode === 'admin' ? t('nav_group_admin') : t('nav_group_user')}
            </div>
          )}
          <div className="space-y-0.5">
            {(mode === 'admin' ? adminTabs : userTabs).map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  title={sidebarCollapsed ? t(tab.labelKey) : undefined}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-2.5 py-2 rounded-lg text-[13px] transition-colors ${
                    active
                      ? 'bg-[#FDEEE8] text-ink font-medium'
                      : 'text-ink-soft hover:bg-warm-200 hover:text-ink'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-[#E05A3C]' : 'text-ink-muted'}`} />
                  {!sidebarCollapsed && <span className="truncate">{t(tab.labelKey)}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        {/* 底部：语言选择 */}
        <div className="px-2 pb-2 border-t border-warm-300 pt-2">
          {sidebarCollapsed ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="w-full flex items-center justify-center py-2 rounded-lg text-ink-soft hover:bg-warm-200 hover:text-ink transition-colors"
                title={lang === 'zh' ? '切换为 English' : 'Switch to 中文'}
              >
                <Languages className="w-[18px] h-[18px] text-ink-muted" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 px-3 pb-1.5 text-[11px] font-medium text-ink-muted">
                <Languages className="w-3.5 h-3.5" />
                {t('language')}
              </div>
              <div className="flex gap-1 bg-warm-200/60 rounded-lg p-1">
                <button
                  onClick={() => setLang('zh')}
                  className={lang === 'zh' ? segActive : segIdle}
                >
                  中文
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={lang === 'en' ? segActive : segIdle}
                >
                  English
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 底部：收起 */}
        <div className="p-2 border-t border-warm-300">
          <button
            onClick={toggleSidebar}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'px-3'} gap-2.5 py-2 rounded-lg text-[13px] text-ink-soft hover:bg-warm-200 hover:text-ink transition-colors`}
            aria-label={sidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            title={sidebarCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-[18px] h-[18px] text-ink-muted" />
            ) : (
              <>
                <PanelLeftClose className="w-[18px] h-[18px] text-ink-muted" />
                <span>{t('sidebar_collapse')}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto p-6">
        {renderContent()}
      </main>

      {/* 管理端密码验证弹窗 */}
      {showAdminPwd && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-96 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-500" />
                {t('pwd_title')}
              </h2>
              <button
                onClick={() => setShowAdminPwd(false)}
                className="text-ink-muted hover:text-ink"
                aria-label={t('btn_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-ink-soft mb-4">
              {t('pwd_desc')}
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
              className={`w-full bg-warm-100 border rounded-lg px-3 py-2 text-ink-soft text-sm focus:outline-none focus:border-orange-500 ${
                passwordError ? 'border-red-400' : 'border-warm-300'
              }`}
              placeholder={t('pwd_placeholder')}
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-red-500 mt-2">{t('pwd_error')}</p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAdminPwd(false)}
                className="flex-1 bg-white hover:bg-warm-200 text-ink-soft px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {t('btn_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
