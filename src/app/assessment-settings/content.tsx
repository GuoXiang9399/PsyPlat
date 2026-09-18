'use client'

import { useState, useEffect, useRef } from 'react'
import {
  SlidersHorizontal,
  Save,
  ClipboardList,
  MousePointer,
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  Video,
  Wrench,
  CheckCircle2,
  Edit3,
  Upload,
  Pencil,
  Gauge,
  X
} from 'lucide-react'
import { useT } from '@/lib/i18n'
import {
  AssessmentSettings,
  CustomScale,
  ScaleKey,
  SCALE_DEFS,
  BINARY_SCALES,
  DEFAULT_ASSESS_SETTINGS,
  DEFAULT_THRESHOLDS,
  loadAssessSettings,
  saveAssessSettings,
  parseCustomScaleForm,
  parseCustomScaleUpload,
  thresholdOf
} from '@/lib/appSettings'
import {
  AssessmentRecord,
  loadRecords,
  persistRecords,
  computeMouseMetrics,
  behaviorSignalsOf,
  MouseMetrics,
  TrajectoryPoint
} from '@/lib/records'

// 鼠标轨迹调试：行为指标摘要（实时计算，依据调研文档；旧记录无存储指标时现场计算）
function MouseMetricsSummary({ traj, metrics }: { traj: TrajectoryPoint[]; metrics: MouseMetrics | null }) {
  const { t } = useT()
  const m = metrics || computeMouseMetrics(traj)
  if (!m) return null
  const signals = behaviorSignalsOf(m)
  const items: { label: string; value: string }[] = [
    { label: t('mm_duration'), value: (m.duration / 1000).toFixed(1) + ' s' },
    { label: t('mm_points'), value: String(m.points) },
    { label: t('mm_distance'), value: Math.round(m.distance) + ' px' },
    { label: t('mm_avg_speed'), value: m.avgSpeed.toFixed(4) },
    { label: t('mm_speed_cv'), value: m.speedCV.toFixed(3) },
    { label: t('mm_pauses'), value: m.pauseCount + t('mm_times') + ' / ' + (m.pauseRatio * 100).toFixed(1) + ' %' },
    { label: t('mm_flips'), value: m.xFlips + ' / ' + m.yFlips + t('mm_flips_hv') },
    { label: t('mm_curvature'), value: m.curvature.toFixed(2) },
    { label: t('mm_tremor'), value: String(m.tremorScore) },
    { label: t('mm_latency'), value: m.initLatency + ' ms' }
  ]
  return (
    <div className="bg-warm-100 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{t('mm_title')}</span>
        <span className="text-[11px] text-slate-400">{t('mm_note')}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {items.map(it => (
          <div key={it.label} className="flex items-baseline justify-between gap-2">
            <span>{it.label}</span>
            <b className="text-slate-700">{it.value}</b>
          </div>
        ))}
      </div>
      {signals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {signals.map(s => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t('signal_' + s)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// 鼠标轨迹调试画布：与数据管理页同款品牌蓝绘制（起点/终点标注 + 采样节点）
function DebugTrajCanvas({ traj }: { traj: { x: number; y: number; t: number }[] }) {
  const { t, lang } = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || traj.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#F7F6F4'
    ctx.fillRect(0, 0, W, H)
    const xs = traj.map(p => p.x)
    const ys = traj.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spanX = Math.max(1, maxX - minX)
    const spanY = Math.max(1, maxY - minY)
    const pad = 18
    const px = (x: number) => pad + ((x - minX) / spanX) * (W - pad * 2)
    const py = (y: number) => pad + ((y - minY) / spanY) * (H - pad * 2)
    ctx.strokeStyle = '#E05A3C'
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'
    ctx.beginPath()
    traj.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y))
      else ctx.lineTo(px(p.x), py(p.y))
    })
    ctx.stroke()
    traj.forEach((p, i) => {
      ctx.fillStyle = i === 0 || i === traj.length - 1 ? '#A83C24' : '#E05A3C'
      ctx.beginPath()
      ctx.arc(px(p.x), py(p.y), i === 0 || i === traj.length - 1 ? 3.2 : 1.6, 0, Math.PI * 2)
      ctx.fill()
    })
    const first = traj[0]
    const last = traj[traj.length - 1]
    ctx.fillStyle = '#A83C24'
    ctx.font = '10px sans-serif'
    ctx.fillText(t('traj_start'), px(first.x) - 14, py(first.y) - 6)
    ctx.fillText(t('traj_end') + ' ' + last.t + 'ms', px(last.x) - 18, py(last.y) + 14)
  }, [traj, t, lang])
  return (
    <canvas
      ref={ref}
      width={560}
      height={220}
      className="w-full rounded-lg"
      style={{ background: '#F7F6F4', maxHeight: 220 }}
      aria-label={t('traj_canvas_aria')}
    />
  )
}

// 采集开关行（鼠标轨迹 / 摄像头）
function CaptureToggle({ icon, title, desc, enabled, onToggle }: {
  icon: React.ReactNode
  title: string
  desc: string
  enabled: boolean
  onToggle: () => void
}) {
  const { t } = useT()
  return (
    <div className="flex items-start gap-3 p-3 bg-warm-100 rounded-lg">
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={enabled}
        className={`mt-0.5 relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${enabled ? 'bg-orange-500' : 'bg-warm-300'}`}
      >
        <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${enabled ? 'left-[20px]' : 'left-[2px]'}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-ink">{title}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded ${enabled ? 'bg-green-500/15 text-green-600' : 'bg-warm-200 text-ink-muted'}`}>
            {enabled ? t('toggle_on') : t('toggle_off')}
          </span>
        </div>
        <p className="text-xs text-ink-soft mt-1">{desc}</p>
      </div>
    </div>
  )
}

// 通用弹窗外壳
function ModalShell({ title, icon, onClose, children }: {
  title: string
  icon?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-300 sticky top-0 bg-white rounded-t-xl">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">{icon}{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" title={t('btn_close')}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// 阈值调整弹窗：设置轻度 / 中度 / 重度切分点（筛查量表不可调）
function ThresholdModal({ scale, settings, onSave, onClose }: {
  scale: (typeof SCALE_DEFS)[number]
  settings: AssessmentSettings
  onSave: (key: ScaleKey, thr: { mild: number; moderate: number; severe: number }) => void
  onClose: () => void
}) {
  const { t, tFmt } = useT()
  const current = thresholdOf(settings, scale.key)
  const [draft, setDraft] = useState({ ...current })
  const isBinary = BINARY_SCALES.includes(scale.key)
  const displayName = settings.scaleMeta[scale.key]?.name?.trim() || t('scale_name_' + scale.key)

  const save = () => {
    const raw = {
      mild: Math.max(0, draft.mild || 0),
      moderate: Math.max(0, draft.moderate || 0),
      severe: Math.max(0, draft.severe || 0),
    }
    // 保证切分点递增：轻度 ≤ 中度 ≤ 重度
    const ordered = {
      mild: Math.min(raw.mild, raw.moderate, raw.severe),
      moderate: Math.max(Math.min(raw.moderate, raw.severe), raw.mild),
      severe: Math.max(raw.mild, raw.moderate, raw.severe),
    }
    onSave(scale.key, ordered)
    onClose()
  }

  return (
    <ModalShell
      title={`${t('thr_title')} · ${displayName}`}
      icon={<Gauge className="w-4 h-4 text-orange-500" />}
      onClose={onClose}
    >
      {isBinary ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-700">
          {tFmt('thr_binary', { n: scale.count })}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-ink-soft">
            {t('thr_note')}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'mild' as const, label: t('thr_mild') },
              { key: 'moderate' as const, label: t('thr_moderate') },
              { key: 'severe' as const, label: t('thr_severe') },
            ]).map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                <input
                  type="number"
                  min={0}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: parseInt(e.target.value) || 0 })}
                  className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-600 text-sm text-center focus:outline-none focus:border-orange-500"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                const def = DEFAULT_THRESHOLDS[scale.key]
                if (def) setDraft({ ...def })
              }}
              className="text-xs text-slate-400 hover:text-orange-500 transition-colors"
            >
              {tFmt('thr_reset', {
                mild: DEFAULT_THRESHOLDS[scale.key]?.mild ?? 0,
                moderate: DEFAULT_THRESHOLDS[scale.key]?.moderate ?? 0,
                severe: DEFAULT_THRESHOLDS[scale.key]?.severe ?? 0,
              })}
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors">
                {t('btn_cancel')}
              </button>
              <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                {t('thr_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// 量表编辑弹窗（内置量表）：自定义显示名称与描述
function ScaleEditModal({ scale, settings, onSave, onClose }: {
  scale: (typeof SCALE_DEFS)[number]
  settings: AssessmentSettings
  onSave: (key: ScaleKey, meta: { name: string; desc: string } | null) => void
  onClose: () => void
}) {
  const { t } = useT()
  const hasCustom = Boolean(settings.scaleMeta[scale.key])
  const [name, setName] = useState(hasCustom ? settings.scaleMeta[scale.key]?.name ?? '' : t('scale_name_' + scale.key))
  const [desc, setDesc] = useState(hasCustom ? settings.scaleMeta[scale.key]?.desc ?? '' : t('scale_desc_' + scale.key))
  const displayName = hasCustom ? (settings.scaleMeta[scale.key]?.name?.trim() || t('scale_name_' + scale.key)) : t('scale_name_' + scale.key)

  const save = () => {
    const defName = t('scale_name_' + scale.key)
    const defDesc = t('scale_desc_' + scale.key)
    if (!hasCustom && name.trim() === defName && desc.trim() === defDesc) {
      // 未修改默认文案：不写入自定义覆盖，避免将当前语言的默认名固化
      onSave(scale.key, null)
    } else {
      onSave(scale.key, { name, desc })
    }
    onClose()
  }

  return (
    <ModalShell
      title={`${t('se_title')} · ${displayName}`}
      icon={<Edit3 className="w-4 h-4 text-orange-500" />}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-xs text-ink-soft">
          {t('se_desc')}
        </p>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t('se_name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t('se_desc_label')}</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          {hasCustom ? (
            <button
              onClick={() => { onSave(scale.key, null); onClose() }}
              className="text-xs text-slate-400 hover:text-orange-500 transition-colors"
            >
              {t('se_reset')}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors">
              {t('btn_cancel')}
            </button>
            <button
              onClick={save}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {t('btn_save')}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

// 自定义量表添加 / 编辑弹窗：支持手动录入与文件上传（JSON / TXT）
function CustomScaleModal({ title, initial, onSave, onClose }: {
  title: string
  initial?: CustomScale
  onSave: (data: { name: string; items: string; options: string }) => void
  onClose: () => void
}) {
  const { t, tFmt } = useT()
  const [name, setName] = useState(initial?.name ?? '')
  const [options, setOptions] = useState(initial?.options.join(' / ') ?? t('cs_default_options'))
  const [items, setItems] = useState(initial?.items.join('\n') ?? '')
  const [error, setError] = useState('')
  const [tip, setTip] = useState('')

  const handleFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCustomScaleUpload(f.name, String(reader.result ?? ''))
      if (!parsed) {
        setError(t('cs_err_parse'))
        setTip('')
        return
      }
      setError('')
      setTip(tFmt('cs_ok_read', { name: parsed.name, n: parsed.items.length }))
      setName(parsed.name)
      setOptions(parsed.options.join(' / '))
      setItems(parsed.items.join('\n'))
    }
    reader.onerror = () => setError(t('cs_err_read'))
    reader.readAsText(f)
  }

  const save = () => {
    const parsed = parseCustomScaleForm(name, items, options)
    if (!parsed) {
      setError(t('cs_err_form'))
      return
    }
    onSave({ name: parsed.name, items: parsed.items.join('\n'), options: parsed.options.join(' / ') })
    onClose()
  }

  return (
    <ModalShell title={title} icon={<Plus className="w-4 h-4 text-orange-500" />} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-warm-100 rounded-lg px-3 py-2.5">
          <span className="text-xs text-slate-500">{t('cs_upload_hint')}</span>
          <label className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-1.5 rounded-lg text-xs border border-warm-300 cursor-pointer flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5" /> {t('cs_choose_file')}
            <input
              type="file"
              accept=".json,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) handleFile(f)
              }}
            />
          </label>
        </div>
        {tip && <p className="text-xs text-green-600">{tip}</p>}
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t('as_custom_name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
            placeholder={t('cs_name_ph')}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t('as_custom_options')}</label>
          <input
            type="text"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
            placeholder={t('cs_options_ph')}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">{t('as_custom_items')}</label>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            rows={5}
            className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500 resize-y"
            placeholder={t('cs_items_ph')}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors">
            {t('btn_cancel')}
          </button>
          <button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            {t('btn_save')}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

export function AssessmentSettingsContent() {
  const { t, tFmt } = useT()
  const [settings, setSettings] = useState<AssessmentSettings>(() => loadAssessSettings())
  const [savedTip, setSavedTip] = useState(false)

  // —— 量表管理弹窗 ——
  const [thresholdKey, setThresholdKey] = useState<ScaleKey | null>(null)
  const [builtinEditKey, setBuiltinEditKey] = useState<ScaleKey | null>(null)
  const [customModal, setCustomModal] = useState<{ mode: 'add' } | { mode: 'edit'; scale: CustomScale } | null>(null)

  // —— 采集调试：鼠标轨迹 ——
  const [debugOpen, setDebugOpen] = useState(false)
  const [trajRecords, setTrajRecords] = useState<AssessmentRecord[]>(() =>
    loadRecords().filter(r => (r.mouseTrajectory?.length ?? 0) > 0)
  )
  const [selectedTrajId, setSelectedTrajId] = useState<string>('')
  const selectedTraj = trajRecords.find(r => r.id === selectedTrajId) ?? null

  // —— 采集调试：摄像头 ——
  const [camStatus, setCamStatus] = useState<'idle' | 'testing' | 'normal' | 'degraded'>('idle')
  const [camMsg, setCamMsg] = useState(t('cam_msg_idle'))
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const camTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshTraj = () => {
    setTrajRecords(loadRecords().filter(r => (r.mouseTrajectory?.length ?? 0) > 0))
    setSelectedTrajId('')
  }

  const clearTraj = () => {
    if (trajRecords.length === 0) return
    if (!window.confirm(t('traj_clear_confirm'))) return
    const all = loadRecords().map(r => ({ ...r, mouseTrajectory: [], mouseSamples: 0 }))
    persistRecords(all)
    setTrajRecords([])
    setSelectedTrajId('')
  }

  const stopCam = () => {
    if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => { stopCam() }, [])

  const testCamera = async () => {
    stopCam()
    setCamStatus('testing')
    setCamMsg(t('cam_msg_requesting'))
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCamStatus('degraded')
      setCamMsg(t('cam_msg_unsupported'))
      return
    }
    camTimerRef.current = setTimeout(() => {
      stopCam()
      setCamStatus('degraded')
      setCamMsg(t('cam_msg_timeout'))
    }, 8000)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamStatus('normal')
      setCamMsg(t('cam_msg_success'))
      camTimerRef.current = setTimeout(() => { stopCam() }, 2500)
    } catch (e) {
      if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
      stopCam()
      setCamStatus('degraded')
      setCamMsg(tFmt('cam_msg_failed', { msg: (e instanceof Error ? e.message : String(e)) }))
    }
  }

  const endCameraDebug = () => {
    stopCam()
    setCamStatus('idle')
    setCamMsg(t('cam_msg_ended'))
  }

  const handleSave = () => {
    saveAssessSettings(settings)
    setSavedTip(true)
    setTimeout(() => setSavedTip(false), 2000)
  }

  const toggleScale = (key: string) => {
    setSettings(prev => ({
      ...prev,
      enabledScales: { ...prev.enabledScales, [key]: !prev.enabledScales[key as keyof typeof prev.enabledScales] }
    }))
  }

  const addCustomScale = (data: { name: string; items: string; options: string }) => {
    const parsed = parseCustomScaleForm(data.name, data.items, data.options)
    if (!parsed) return
    setSettings(prev => ({ ...prev, customScales: [...prev.customScales, parsed] }))
  }

  const updateCustomScale = (id: string, data: { name: string; items: string; options: string }) => {
    const parsed = parseCustomScaleForm(data.name, data.items, data.options)
    if (!parsed) return
    setSettings(prev => ({
      ...prev,
      customScales: prev.customScales.map(s => (s.id === id ? { ...s, name: parsed.name, items: parsed.items, options: parsed.options } : s)),
    }))
  }

  const removeCustomScale = (id: string) => {
    if (!window.confirm(t('cs_delete_confirm'))) return
    setSettings(prev => ({ ...prev, customScales: prev.customScales.filter(s => s.id !== id) }))
  }

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseCustomScaleUpload(f.name, String(reader.result ?? ''))
      if (!parsed) {
        window.alert(t('cs_err_parse'))
        return
      }
      setSettings(prev => ({ ...prev, customScales: [...prev.customScales, parsed] }))
    }
    reader.onerror = () => window.alert(t('cs_err_read'))
    reader.readAsText(f)
  }

  const saveThresholds = (key: ScaleKey, thr: { mild: number; moderate: number; severe: number }) => {
    setSettings(prev => ({ ...prev, thresholds: { ...prev.thresholds, [key]: thr } }))
  }

  const saveScaleMeta = (key: ScaleKey, meta: { name: string; desc: string } | null) => {
    setSettings(prev => {
      const scaleMeta = { ...prev.scaleMeta }
      if (meta) scaleMeta[key] = meta
      else delete scaleMeta[key]
      return { ...prev, scaleMeta }
    })
  }

  const enabledCount = Object.values(settings.enabledScales).filter(Boolean).length + settings.customScales.length

  const renderScaleRow = (def: (typeof SCALE_DEFS)[number]) => {
    const on = settings.enabledScales[def.key]
    const thr = thresholdOf(settings, def.key)
    const isBinary = BINARY_SCALES.includes(def.key)
    const name = settings.scaleMeta[def.key]?.name?.trim() || t('scale_name_' + def.key)
    const desc = settings.scaleMeta[def.key]?.desc?.trim() || t('scale_desc_' + def.key)
    return (
      <div key={def.key} className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
        <input
          type="checkbox"
          checked={on}
          onChange={() => toggleScale(def.key)}
          title={t('enable_disable')}
          className="w-4 h-4 accent-orange-500 rounded shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink">{name}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-warm-300 text-ink-muted">{tFmt('scale_items', { n: def.count })}</span>
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${on ? 'bg-green-500/15 text-green-600' : 'bg-warm-200 text-ink-muted'}`}>
              {on ? t('toggle_on') : t('toggle_off')}
            </span>
            {!isBinary && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-warm-300 text-ink-muted">
                {tFmt('threshold_badge', { mild: thr.mild, moderate: thr.moderate, severe: thr.severe })}
              </span>
            )}
          </div>
          <p className="text-xs text-ink-soft mt-1">{desc}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setBuiltinEditKey(def.key)}
            className="bg-white hover:bg-warm-200 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs border border-warm-300 flex items-center gap-1 transition-colors"
          >
            <Pencil className="w-3 h-3" /> {t('btn_edit')}
          </button>
          <button
            onClick={() => setThresholdKey(def.key)}
            className="bg-white hover:bg-warm-200 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs border border-warm-300 flex items-center gap-1 transition-colors"
          >
            <Gauge className="w-3 h-3" /> {t('btn_threshold')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-orange-500" />
            {t('as_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('as_desc')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {savedTip && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" /> {t('btn_saved')}
            </span>
          )}
          <button
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> {t('btn_save')}
          </button>
        </div>
      </div>

      {/* 量表管理 */}
      <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-300 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              {t('as_scales')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{t('as_scales_desc')}</p>
          </div>
          <span className="text-xs text-ink-soft bg-warm-100 border border-warm-300 rounded-full px-2.5 py-1 whitespace-nowrap">
            {tFmt('as_enabled_count', { n: enabledCount })}
          </span>
        </div>
        <div className="p-5">
          <div className="space-y-2.5">
            {SCALE_DEFS.map(renderScaleRow)}
          </div>

          {/* 自定义量表（并入量表管理） */}
          <div className="border-t border-warm-300 mt-5 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700">{t('as_custom')}</h3>
                <span className="text-[11px] text-ink-soft">{t('cs_auto_enabled')}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="bg-white hover:bg-warm-200 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs border border-warm-300 flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3" /> {t('cs_upload')}
                  <input
                    type="file"
                    accept=".json,.txt"
                    className="hidden"
                    onChange={handleUploadFile}
                  />
                </label>
                <button
                  onClick={() => setCustomModal({ mode: 'add' })}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> {t('cs_add')}
                </button>
              </div>
            </div>
            {settings.customScales.length === 0 ? (
              <div className="bg-warm-100 rounded-lg p-4 text-sm text-slate-400">
                {t('cs_empty')}
              </div>
            ) : (
              <div className="space-y-2">
                {settings.customScales.map((s: CustomScale) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{s.name}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-warm-300 text-ink-muted">{tFmt('scale_items', { n: s.items.length })}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-600">{t('toggle_on')}</span>
                      </div>
                      <p className="text-xs text-ink-soft mt-1 truncate">{t('cs_options_prefix')}{s.options.join(' / ')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setCustomModal({ mode: 'edit', scale: s })}
                        className="bg-white hover:bg-warm-200 text-slate-500 px-2.5 py-1.5 rounded-lg text-xs border border-warm-300 flex items-center gap-1 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> {t('btn_edit')}
                      </button>
                      <button
                        onClick={() => removeCustomScale(s.id)}
                        className="bg-white hover:bg-red-50 text-slate-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg text-xs border border-warm-300 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> {t('btn_delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 行为数据采集 */}
      <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-300">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-orange-500" />
            {t('as_capture')}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t('as_capture_desc')}</p>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <CaptureToggle
            icon={<MousePointer className="w-4 h-4 text-slate-400" />}
            title={t('as_mouse')}
            desc={t('as_mouse_desc')}
            enabled={settings.mouseTracking}
            onToggle={() => setSettings(prev => ({ ...prev, mouseTracking: !prev.mouseTracking }))}
          />
          <CaptureToggle
            icon={<Camera className="w-4 h-4 text-slate-400" />}
            title={t('as_camera')}
            desc={t('as_camera_desc')}
            enabled={settings.camera}
            onToggle={() => setSettings(prev => ({ ...prev, camera: !prev.camera }))}
          />
        </div>
      </div>

      {/* 采集调试（可折叠） */}
      <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-warm-200/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-slate-800">{t('debug_title')}</span>
          </div>
          <span className="text-xs text-slate-400">{debugOpen ? t('debug_collapse') : t('debug_expand')}</span>
        </button>
        {debugOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-warm-300">
            {/* 鼠标轨迹调试 */}
            <div className="bg-warm-100 rounded-lg p-4 border border-warm-300">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-orange-500" />
                  {t('traj_debug_title')}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={refreshTraj}
                    className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-1.5 rounded text-xs border border-warm-300 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> {t('traj_refresh')}
                  </button>
                  <button
                    onClick={clearTraj}
                    disabled={trajRecords.length === 0}
                    className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-1.5 rounded text-xs border border-warm-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('traj_clear')}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {t('traj_debug_desc')}
              </p>
              {trajRecords.length === 0 ? (
                <div className="bg-white rounded-lg p-4 text-sm text-slate-400 border border-warm-300">
                  {t('traj_empty')}
                </div>
              ) : (
                <>
                  <div className="grid gap-2 mb-3">
                    {trajRecords.slice().reverse().slice(0, 6).map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedTrajId(r.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                          selectedTrajId === r.id
                            ? 'bg-[#FDEEE8] text-ink font-medium'
                            : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200/70'
                        }`}
                      >
                        <span className="font-medium">{r.id}</span>
                        <span className="text-xs text-slate-400">{r.studentId}</span>
                        <span className="text-xs text-slate-400 ml-auto">{r.time}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-warm-100 text-slate-500">
                          {tFmt('traj_points', { n: r.mouseTrajectory?.length ?? 0 })}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedTraj && (
                    <div className="bg-white rounded-lg border border-warm-300 p-3 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{tFmt('traj_record', { id: selectedTraj.id, studentId: selectedTraj.studentId })}</span>
                        <span>{t('traj_samples')} <b className="text-ink">{selectedTraj.mouseTrajectory?.length ?? 0}</b></span>
                      </div>
                      <MouseMetricsSummary traj={selectedTraj.mouseTrajectory ?? []} metrics={selectedTraj.mouseMetrics ?? null} />
                      <DebugTrajCanvas traj={selectedTraj.mouseTrajectory ?? []} />
                      <div className="bg-warm-100 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 text-xs text-slate-400 border-b border-warm-300/60 flex items-center justify-between">
                          <span>{t('traj_series')}</span>
                          <span>{tFmt('traj_total', { n: selectedTraj.mouseTrajectory?.length ?? 0 })}</span>
                        </div>
                        <pre className="p-3 text-xs text-slate-500 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                          {(selectedTraj.mouseTrajectory ?? []).map(p => `(${p.x}, ${p.y}, ${p.t}ms)`).join('  ')}
                        </pre>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 摄像头调试 */}
            <div className="bg-warm-100 rounded-lg p-4 border border-warm-300">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-500" />
                {t('cam_debug_title')}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                {t('cam_debug_desc')}
              </p>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={testCamera}
                  disabled={camStatus === 'testing'}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  {camStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  {camStatus === 'testing' ? t('cam_testing') : camStatus === 'normal' ? t('cam_retest') : t('cam_start')}
                </button>
                {(camStatus === 'normal' || camStatus === 'degraded') && (
                  <button
                    onClick={endCameraDebug}
                    className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
                  >
                    {t('cam_end')}
                  </button>
                )}
              </div>
              <div
                className={`rounded-lg px-4 py-3 text-sm border ${
                  camStatus === 'normal'
                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                    : camStatus === 'degraded'
                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                      : camStatus === 'testing'
                        ? 'bg-[#FDEEE8] text-ink font-medium'
                        : 'bg-white text-slate-400 border-warm-300'
                }`}
              >
                {camStatus === 'idle' ? t('cam_msg_idle') : camMsg}
              </div>
              {camStatus === 'normal' && (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full max-w-sm rounded-lg border border-warm-300 mt-3"
                  style={{ background: '#F1EFEC' }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部保存条 */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setSettings({ ...DEFAULT_ASSESS_SETTINGS, enabledScales: { ...DEFAULT_ASSESS_SETTINGS.enabledScales } })}
          className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors"
        >
          {t('btn_reset')}
        </button>
        <button
          onClick={handleSave}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Save className="w-4 h-4" /> {t('btn_save')}
        </button>
      </div>

      {/* 弹窗：阈值调整 / 内置量表编辑 / 自定义量表添加与编辑 */}
      {thresholdKey && (
        <ThresholdModal
          scale={SCALE_DEFS.find((d) => d.key === thresholdKey)!}
          settings={settings}
          onSave={saveThresholds}
          onClose={() => setThresholdKey(null)}
        />
      )}
      {builtinEditKey && (
        <ScaleEditModal
          scale={SCALE_DEFS.find((d) => d.key === builtinEditKey)!}
          settings={settings}
          onSave={saveScaleMeta}
          onClose={() => setBuiltinEditKey(null)}
        />
      )}
      {customModal?.mode === 'add' && (
        <CustomScaleModal
          title={t('cs_add_title')}
          onSave={addCustomScale}
          onClose={() => setCustomModal(null)}
        />
      )}
      {customModal?.mode === 'edit' && (
        <CustomScaleModal
          title={tFmt('cs_edit_title', { name: customModal.scale.name })}
          initial={customModal.scale}
          onSave={(data) => updateCustomScale(customModal.scale.id, data)}
          onClose={() => setCustomModal(null)}
        />
      )}
    </div>
  )
}
