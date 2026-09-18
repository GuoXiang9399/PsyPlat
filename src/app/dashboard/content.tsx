'use client'

import { useState } from 'react'
import {
  Users,
  FileText,
  AlertTriangle,
  Target,
  Activity,
  ChevronRight,
  Clock,
  ArrowRight,
  Pencil,
  Lock
} from 'lucide-react'
import { DEFAULT_STATION_NAME } from '@/lib/brand'
import { useT } from '@/lib/i18n'

const ADMIN_PWD_KEY = 'psyc_admin_pwd'

export function DashboardContent({
  stationName,
  onStationNameChange
}: {
  stationName?: string
  onStationNameChange?: (name: string) => void
}) {
  const { t } = useT()
  const displayName = stationName ?? DEFAULT_STATION_NAME
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const startEditName = () => {
    setNameDraft(displayName)
    setEditingName(true)
  }

  const confirmEditName = () => {
    const name = nameDraft.trim()
    if (name && onStationNameChange) onStationNameChange(name)
    setEditingName(false)
  }

  // —— 管理密码修改（进入管理端的访问密码） ——
  const [pwdForm, setPwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' })
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const handleChangePassword = () => {
    const current = (() => { try { return localStorage.getItem(ADMIN_PWD_KEY) || '123456' } catch { return '123456' } })()
    if (pwdForm.oldPwd !== current) {
      setPwdMsg({ type: 'error', text: t('dash_pwd_old_err') })
      return
    }
    if (pwdForm.newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: t('dash_pwd_short_err') })
      return
    }
    if (pwdForm.newPwd !== pwdForm.confirmPwd) {
      setPwdMsg({ type: 'error', text: t('dash_pwd_mismatch_err') })
      return
    }
    try { localStorage.setItem(ADMIN_PWD_KEY, pwdForm.newPwd) } catch {}
    setPwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' })
    setPwdMsg({ type: 'ok', text: t('dash_pwd_ok') })
  }

  const [stats] = useState({
    today: 12,
    monthly: 156,
    highRisk: 3,
    accuracy: 94.2
  })

const [recentActivities] = useState([
    { id: 'A001', studentId: '20230801', time: '2026-09-11 09:23', status: 'completed' as const },
    { id: 'A002', studentId: '20230815', time: '2026-09-11 10:45', status: 'incomplete' as const },
    { id: 'A003', studentId: '20230722', time: '2026-09-11 11:02', status: 'completed' as const },
    { id: 'A004', studentId: '20230905', time: '2026-09-11 13:18', status: 'completed' as const },
    { id: 'A005', studentId: '20230833', time: '2026-09-11 14:30', status: 'completed' as const },
  ])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return t('dash_status_completed')
      case 'incomplete': return t('dash_status_incomplete')
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400'
      case 'incomplete': return 'bg-warm-200 text-slate-400'
      default: return 'bg-warm-200 text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* 欢迎横幅：站点名称可编辑，与左侧栏联动 */}
      <div className="bg-gradient-to-r from-orange-700 via-orange-500 to-orange-400 rounded-lg p-6 text-white shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {editingName ? (
            <>
              <div className="flex-1 min-w-0">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEditName()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                  className="w-full bg-white/95 text-slate-800 rounded-lg px-3 py-2 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-white/70"
                  placeholder={t('dash_name_placeholder')}
                  autoFocus
                />
                <p className="text-xs text-white/85 mt-1.5">{t('dash_name_hint')}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingName(false)}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  onClick={confirmEditName}
                  className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t('btn_save')}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {onStationNameChange && (
                <button
                  onClick={startEditName}
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-sm transition-colors shrink-0"
                  title={t('dash_edit_name')}
                >
                  <Pencil className="w-4 h-4" />
                  {t('dash_edit_name')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 平台设置：站点名称 + 管理密码 */}
      <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-warm-100/60 border-b border-warm-300">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-500" />
            {t('dash_pwd_title')}
          </h2>
          <span className="text-xs text-slate-400">{t('dash_pwd_desc')}</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('dash_pwd_old')}</label>
            <input
              type="password"
              value={pwdForm.oldPwd}
              onChange={(e) => setPwdForm({ ...pwdForm, oldPwd: e.target.value })}
              className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
              placeholder={t('pwd_placeholder')}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('dash_pwd_new')}</label>
            <input
              type="password"
              value={pwdForm.newPwd}
              onChange={(e) => setPwdForm({ ...pwdForm, newPwd: e.target.value })}
              className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
              placeholder={t('dash_pwd_min')}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">{t('dash_pwd_confirm')}</label>
              <input
                type="password"
                value={pwdForm.confirmPwd}
                onChange={(e) => setPwdForm({ ...pwdForm, confirmPwd: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
                className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                placeholder={t('dash_pwd_confirm')}
              />
            </div>
            <button
              onClick={handleChangePassword}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
            >
              {t('dash_pwd_change')}
            </button>
          </div>
        </div>
        {pwdMsg && (
          <div className={`px-5 pb-4 text-xs ${pwdMsg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
            {pwdMsg.text}
          </div>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('stat_today')}</span>
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.today}</div>
          <div className="text-xs text-slate-500 mt-1">{t('stat_today_delta')}</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('stat_month')}</span>
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.monthly}</div>
          <div className="text-xs text-slate-500 mt-1">{t('stat_month_target')}</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('stat_high_risk')}</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
          <div className="text-xs text-slate-500 mt-1">{t('stat_high_risk_note')}</div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('stat_accuracy')}</span>
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.accuracy}%</div>
          <div className="text-xs text-slate-500 mt-1">{t('stat_accuracy_note')}</div>
        </div>
      </div>

      {/* 最近活动表格 */}
      <div className="bg-white rounded-lg border border-warm-300">
        <div className="p-4 border-b border-warm-300 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('dash_recent')}</h2>
          <button className="text-ink-soft text-sm flex items-center hover:text-[#E05A3C]">
            {t('dash_view_all')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
<table className="w-full">
            <thead>
              <tr className="border-b border-warm-300">
                <th className="text-left p-3 text-slate-400 text-sm font-medium">ID</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('dash_col_student')}</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('dash_col_time')}</th>
                <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('dash_col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="border-b border-warm-300/60 hover:bg-warm-200/50">
                  <td className="p-3 text-slate-500 text-sm">{activity.id}</td>
                  <td className="p-3 text-slate-500 text-sm">{activity.studentId}</td>
                  <td className="p-3 text-slate-500 text-sm">{activity.time}</td>
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
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors">
          <ArrowRight className="w-4 h-4" /> {t('dash_start_assess')}
        </button>
        <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
          <Activity className="w-4 h-4" /> {t('dash_view_stats')}
        </button>
        <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
          <Clock className="w-4 h-4" /> {t('dash_history')}
        </button>
      </div>
    </div>
  )
}

