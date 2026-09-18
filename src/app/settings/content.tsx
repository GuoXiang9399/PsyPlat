'use client'

import { useState } from 'react'
import {
  Shield,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Lock,
  Eye,
  Cpu,
  FolderOpen
} from 'lucide-react'
import { useT } from '@/lib/i18n'

type SettingsTab = 'privacy' | 'system'

export function SettingsContent() {
  const { t } = useT()
  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy')
  const [saved, setSaved] = useState(false)

  const [privacySettings, setPrivacySettings] = useState({
    localProcessing: true,
    deleteRaw: true,
    encryptStorage: true,
    anonymize: true
  })

  const [systemSettings, setSystemSettings] = useState({
    dataPath: '/data/assessments',
    theme: 'light',
    autoSave: true,
    debugMode: false
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { key: 'privacy' as SettingsTab, label: t('set_tab_privacy'), icon: Shield },
    { key: 'system' as SettingsTab, label: t('set_tab_system'), icon: SlidersHorizontal },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('set_title')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('set_desc')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> {saved ? t('btn_saved') : t('btn_save')}
          </button>
          <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
            <RotateCcw className="w-4 h-4" /> {t('btn_reset')}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 标签页导航 */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#FDEEE8] text-ink font-medium'
                    : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 设置内容 */}
        <div className="flex-1 bg-white rounded-lg border border-warm-300 p-6">
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                {t('set_privacy_title')}
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'localProcessing', label: t('set_privacy_local'), desc: t('set_privacy_local_desc'), icon: Lock },
                  { key: 'deleteRaw', label: t('set_privacy_delete'), desc: t('set_privacy_delete_desc'), icon: Eye },
                  { key: 'encryptStorage', label: t('set_privacy_encrypt'), desc: t('set_privacy_encrypt_desc'), icon: Lock },
                  { key: 'anonymize', label: t('set_privacy_anonym'), desc: t('set_privacy_anonym_desc'), icon: Eye },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.key} className="flex items-start gap-3 p-3 bg-warm-100 rounded-lg">
                      <input
                        type="checkbox"
                        checked={privacySettings[item.key as keyof typeof privacySettings]}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, [item.key]: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-orange-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                {t('set_tab_system')}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('set_data_path')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={systemSettings.dataPath}
                      onChange={(e) => setSystemSettings({ ...systemSettings, dataPath: e.target.value })}
                      className="flex-1 bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
                    />
                    <button className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-2 rounded-lg border border-warm-300 transition-colors">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">{t('set_theme')}</label>
                  <select
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({ ...systemSettings, theme: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="light">{t('set_theme_light')}</option>
                    <option value="dark">{t('set_theme_dark')}</option>
                    <option value="auto">{t('set_theme_auto')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.autoSave}
                    onChange={(e) => setSystemSettings({ ...systemSettings, autoSave: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-700 font-medium">{t('set_auto_save')}</div>
                    <p className="text-xs text-slate-500">{t('set_auto_save_desc')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.debugMode}
                    onChange={(e) => setSystemSettings({ ...systemSettings, debugMode: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-700 font-medium">{t('set_debug')}</div>
                    <p className="text-xs text-slate-500">{t('set_debug_desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
