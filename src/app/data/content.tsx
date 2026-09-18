'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Database,
  LayoutDashboard,
  FileText,
  Settings,
  Info,
  Brain,
  Search,
  Download,
  Filter,
  Users,
  AlertTriangle,
  Target,
  FileCheck,
  X,
  Eye,
  FileDown,
  Video,
  FileJson,
  MousePointer2 as MousePointerIcon
} from 'lucide-react'
import {
  AssessmentRecord,
  phq9Questions,
  gad7Questions,
  riskOptions,
  scoreOf,
  riskOf,
  loadRecords,
  persistRecords,
  depRiskOf,
  anxRiskOf,
  cssrsRiskOf,
  nssiRiskOf,
  pss10RiskOf,
  psqiRiskOf,
  sias6RiskOf,
  aslecRiskOf,
  BehaviorSignal,
  MouseMetrics,
  computeMouseMetrics,
  behaviorSignalsOf,
  TrajectoryPoint
} from '@/lib/records'
import { loadAssessSettings } from '@/lib/appSettings'
import {
  emptyPsqiAnswers,
  scorePsqi,
  cssrsQuestions,
  cssrsOptions,
  nssiQuestions,
  nssiHasOptions,
  nssiFreqOptions,
  pss10Questions,
  pss10Options,
  PSS10_REVERSED,
  scorePss10,
  pss10LevelOf,
  psqiDisturbanceItems,
  psqiFreqOptions,
  psqiQualityOptions,
  psqiComponentNames,
  psqiLevelOf,
  sias6Questions,
  sias6Options,
  aslecItems,
  aslecImpactOptions
} from '@/lib/scales'
import { getVideo, downloadBlob } from '@/lib/videoStore'
import { buildRecordReportHtml, downloadText, maskStudentId } from '@/lib/reportExport'
import { useT } from '@/lib/i18n'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

// 鼠标轨迹可视化：按采样顺序绘制折线（品牌蓝主题），标注起点/终点
function TrajectoryCanvas({ traj }: { traj: { x: number; y: number; t: number; k?: 'm' | 'c' }[] }) {
  const { t } = useT()
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
    // 折线
    ctx.strokeStyle = '#E05A3C'
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'
    ctx.beginPath()
    traj.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y))
      else ctx.lineTo(px(p.x), py(p.y))
    })
    ctx.stroke()
    // 采样节点：mousemove 挪动为圆点；click 点击为红色小方块
    traj.forEach((p, i) => {
      const isClick = p.k === 'c'
      const isEdge = i === 0 || i === traj.length - 1
      ctx.fillStyle = isClick ? '#D54941' : isEdge ? '#A83C24' : '#E05A3C'
      ctx.beginPath()
      if (isClick) {
        const r = 3
        ctx.fillRect(px(p.x) - r, py(p.y) - r, r * 2, r * 2)
      } else {
        ctx.arc(px(p.x), py(p.y), isEdge ? 3.2 : 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    // 起点/终点标注
    const first = traj[0]
    const last = traj[traj.length - 1]
    ctx.fillStyle = '#A83C24'
    ctx.font = '10px sans-serif'
    ctx.fillText(t('traj_start'), px(first.x) - 14, py(first.y) - 6)
    ctx.fillText(t('traj_end') + ' ' + last.t + 'ms', px(last.x) - 18, py(last.y) + 14)
  }, [traj])
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

// 行为动力学特征卡：指标表 + 信号标签（依据调研文档，启发式规则，非临床诊断）
function MouseMetricsCard({ metrics, signals }: { metrics: MouseMetrics | null; signals?: BehaviorSignal[] }) {
  const { t } = useT()
  if (!metrics) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700">
        {t('mm_legacy')}
      </div>
    )
  }
  const sigs = signals || []
  const rows: { label: string; value: string; hint?: boolean }[] = [
    { label: t('mm_total_duration'), value: (metrics.duration / 1000).toFixed(1) + ' s' },
    { label: t('mm_sample_points'), value: String(metrics.points) },
    { label: t('mm_clicks'), value: String(metrics.clicks) },
    { label: t('mm_total_distance'), value: Math.round(metrics.distance) + ' px' },
    { label: t('mm_avg_speed'), value: metrics.avgSpeed.toFixed(4) + ' px/ms' },
    { label: t('mm_speed_cv2'), value: metrics.speedCV.toFixed(3), hint: metrics.speedCV > 1.8 },
    { label: t('mm_peak_speed'), value: metrics.maxSpeed.toFixed(4) + ' px/ms' },
    { label: t('mm_pause_count'), value: String(metrics.pauseCount), hint: metrics.pauseCount > 6 },
    { label: t('mm_pause_ratio'), value: (metrics.pauseRatio * 100).toFixed(1) + ' %', hint: metrics.pauseRatio > 0.35 },
    { label: t('mm_latency'), value: metrics.initLatency + ' ms', hint: metrics.initLatency > 1500 },
    { label: t('mm_flips_hv2'), value: metrics.xFlips + ' / ' + metrics.yFlips, hint: metrics.xFlips + metrics.yFlips > 8 },
    { label: t('mm_curvature'), value: metrics.curvature.toFixed(2), hint: metrics.curvature > 1.9 },
    { label: t('mm_tremor'), value: String(metrics.tremorScore), hint: metrics.tremorScore >= 3 }
  ]
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{t('mm_card_title')}</h4>
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-ink-soft">{t('mm_rule')}</span>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <span className="text-warm-600">{r.label}</span>
            <b className={r.hint ? 'text-amber-600' : 'text-ink'}>{r.value}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-orange-100 pt-2.5">
        <div className="mb-1.5 text-xs font-medium text-warm-600">{t('mm_signals')}</div>
        {sigs.length === 0 ? (
          <div className="text-xs text-ink">{t('mm_no_signals')}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sigs.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/80 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t('signal_' + s)}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-warm-600">
          {t('mm_desc')}
        </p>
      </div>
    </div>
  )
}

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

export function DataContent() {
  const { t, tFmt } = useT()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [scaleFilter, setScaleFilter] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>('time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<AssessmentRecord | null>(null)

  // 量表列定义：分值 + 独立风险等级（数据管理表格"所有量表结果分值 + 每个量表单独风险等级"）
  // 风险切分点读取「测评设置 → 量表管理」中调整后的阈值，未调整时用默认值
  type ScaleKey = 'phq9' | 'gad7' | 'cssrs' | 'nssi' | 'pss10' | 'psqi' | 'sias6' | 'aslec'
  const thr = loadAssessSettings().thresholds
  const scaleMeta: { key: ScaleKey; label: string; score: (r: AssessmentRecord) => number; risk: (r: AssessmentRecord) => string }[] = [
    { key: 'phq9', label: 'PHQ-9', score: (r) => r.phq9Score ?? 0, risk: (r) => depRiskOf(r.phq9Score ?? 0, thr.phq9) },
    { key: 'gad7', label: 'GAD-7', score: (r) => r.gad7Score ?? 0, risk: (r) => anxRiskOf(r.gad7Score ?? 0, thr.gad7) },
    { key: 'cssrs', label: 'C-SSRS', score: (r) => r.cssrsPositive ?? 0, risk: (r) => cssrsRiskOf(r.cssrsPositive ?? 0) },
    { key: 'nssi', label: 'NSSI', score: (r) => (r.nssi ?? [])[0] ?? 0, risk: (r) => nssiRiskOf(r.nssi ?? [], r.phq9) },
    { key: 'pss10', label: 'PSS-10', score: (r) => r.pss10Score ?? 0, risk: (r) => pss10RiskOf(r.pss10Score ?? 0, thr.pss10) },
    { key: 'psqi', label: 'PSQI', score: (r) => r.psqiScore ?? 0, risk: (r) => psqiRiskOf(r.psqiScore ?? 0, thr.psqi) },
    { key: 'sias6', label: 'SIAS-6', score: (r) => r.sias6Score ?? 0, risk: (r) => sias6RiskOf(r.sias6Score ?? 0, thr.sias6) },
    { key: 'aslec', label: 'ASLEC', score: (r) => r.aslecScore ?? 0, risk: (r) => aslecRiskOf(r.aslecScore ?? 0, thr.aslec) },
  ]
  type SortKey = ScaleKey | 'id' | 'studentId' | 'time' | 'risk' | 'status'
  const RISK_ORDER: Record<string, number> = { '低风险': 0, '轻度风险': 1, '中度风险': 2, '高风险': 3 }

  // 切换排序：同列切换 升→降，新列默认降序（时间）/降序（数值/风险）
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'id' || key === 'studentId' ? 'asc' : 'desc')
    }
  }

  const sortValue = (r: AssessmentRecord, key: SortKey): number | string => {
    switch (key) {
      case 'id': return r.id
      case 'studentId': return r.studentId
      case 'time': return r.time
      case 'risk': return RISK_ORDER[r.risk] ?? 0
      case 'status': return r.status
      default: {
        const meta = scaleMeta.find((m) => m.key === key)
        return meta ? (meta.score(r) ?? 0) : 0
      }
    }
  }

  // 按目标分数生成自洽的逐题答案（0-3），用于演示数据
  const fillScore = (target: number, total: number): number[] => {
    const arr = new Array(total).fill(0)
    let left = target
    for (let i = 0; i < total && left > 0; i++) {
      const v = Math.min(3, left)
      arr[i] = v
      left -= v
    }
    return arr
  }
  // 生成演示用鼠标轨迹采样点
  const mkTraj = (n: number): { x: number; y: number; t: number }[] => {
    const pts: { x: number; y: number; t: number }[] = []
    for (let i = 0; i < n; i++) {
      pts.push({ x: Math.round(Math.random() * 280 + 10), y: Math.round(Math.random() * 180 + 10), t: Math.round(i * 120 + 500) })
    }
    return pts
  }

  const seedRecords = (): AssessmentRecord[] => {
    const base = [
      { id: 'A001', studentId: '20230801', time: '2026-09-11 09:23', p: 8, g: 6, edu: '本科', grade: '2024', major: '临床医学', age: '20', gender: '女' },
      { id: 'A002', studentId: '20230815', time: '2026-09-11 10:45', p: 15, g: 12, edu: '硕士研究生', grade: '2025', major: '心理学', age: '23', gender: '男' },
      { id: 'A003', studentId: '20230722', time: '2026-09-11 11:02', p: 4, g: 3, edu: '本科', grade: '2024', major: '护理学', age: '19', gender: '女' },
      { id: 'A004', studentId: '20230905', time: '2026-09-11 13:18', p: 18, g: 16, edu: '博士研究生', grade: '2023', major: '生物医学工程', age: '27', gender: '男' },
      { id: 'A005', studentId: '20230833', time: '2026-09-11 14:30', p: 7, g: 5, edu: '本科', grade: '2025', major: '药学', age: '20', gender: '女' },
      { id: 'A006', studentId: '20230789', time: '2026-09-11 15:12', p: 12, g: 9, edu: '硕士研究生', grade: '2024', major: '临床医学', age: '24', gender: '女' },
      { id: 'A007', studentId: '20230912', time: '2026-09-11 16:45', p: 3, g: 2, edu: '本科', grade: '2026', major: '预防医学', age: '19', gender: '男' },
      { id: 'A008', studentId: '20230877', time: '2026-09-11 17:20', p: 20, g: 18, edu: '硕士研究生', grade: '2023', major: '基础医学', age: '25', gender: '女' },
    ]
    return base.map((b) => {
      const phq9 = fillScore(b.p, 9)
      const gad7 = fillScore(b.g, 7)
      // 补充量表示例数据：高风险记录（A002/A008）C-SSRS 含阳性条目，触发第一层风险升级
      const cssrs = b.id === 'A002' ? [0, 0, 1, 0] : b.id === 'A008' ? [0, 0, 1, 1] : [0, 0, 0, 0]
      const cssrsPositive = cssrs.filter(v => v === 1).length
      const nssi = b.id === 'A008' ? [1, 3] : [0, 0]
      const pss10 = fillScore(Math.min(30, b.p + 6), 10)
      const psqi = { ...emptyPsqiAnswers(), d: [...emptyPsqiAnswers().d], quality: b.g >= 12 ? 3 : b.g >= 7 ? 2 : 1, meds: b.g >= 15 ? 2 : 0, day: b.g >= 12 ? 2 : 1, energy: b.p >= 12 ? 2 : 1 }
      const psqiResult = scorePsqi(psqi)
      const sias6 = fillScore(Math.min(18, b.g + 4), 6)
      const aslec = Array.from({ length: 27 }, (_, i) => (i < b.p ? (i % 3) + 1 : 0))
      const risk = cssrsPositive > 0 ? '高风险' : riskOf(phq9, gad7)
      const riskFlags = cssrsPositive > 0 ? ['suicide'] : nssi[0] === 1 ? ['nssi'] : []
      const status = (record => {
        if (record.id === 'A002' || record.id === 'A008') return 'pending_review' as const
        if (record.id === 'A004' || record.id === 'A006') return 'intervened' as const
        return 'completed' as const
      })(b)
      const traj = mkTraj(12)
      const metrics = computeMouseMetrics(traj)
      return {
        id: b.id,
        studentId: b.studentId,
        age: b.age,
        gender: b.gender,
        educationLevel: b.edu,
        grade: b.grade,
        major: b.major,
        time: b.time,
        phq9,
        gad7,
        phq9Score: scoreOf(phq9),
        gad7Score: scoreOf(gad7),
        risk,
        riskFlags,
        cssrs,
        cssrsPositive,
        nssi,
        pss10,
        pss10Score: scorePss10(pss10),
        psqi,
        psqiComps: psqiResult.comps,
        psqiScore: psqiResult.total,
        sias6,
        sias6Score: sias6.reduce((s, v) => s + v, 0),
        aslec,
        aslecScore: aslec.reduce((s, v) => s + v, 0),
        aslecCount: aslec.filter(v => v > 0).length,
        status,
        mouseTrajectory: traj,
        mouseSamples: 12,
        mouseMetrics: metrics,
        behaviorSignals: behaviorSignalsOf(metrics),
        cameraMode: 'normal',
      }
    })
  }

  const [records, setRecords] = useState<AssessmentRecord[]>(() => {
    const loaded = loadRecords()
    if (loaded.length > 0) return loaded
    const seed = seedRecords()
    persistRecords(seed)
    return seed
  })

// 筛选：搜索（ID/学号）+ 整体风险 + 各量表独立风险等级
  const filteredRecords = (() => {
    const list = records.filter(record => {
      const matchesSearch = !searchQuery || record.studentId.includes(searchQuery) || record.id.includes(searchQuery)
      const matchesRisk = filterRisk === 'all' || record.risk === filterRisk
      let matchesScales = true
      for (const key of Object.keys(scaleFilter)) {
        if (!scaleFilter[key] || scaleFilter[key] === 'all') continue
        const meta = scaleMeta.find((m) => m.key === key)
        if (meta && meta.risk(record) !== scaleFilter[key]) { matchesScales = false; break }
      }
      return matchesSearch && matchesRisk && matchesScales
    })
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...list]
    copy.sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      const na = typeof va === 'number' ? va : 0
      const nb = typeof vb === 'number' ? vb : 0
      if (typeof va === 'number' && typeof vb === 'number') return (na - nb) * dir
      return String(va).localeCompare(String(vb), 'zh-CN') * dir
    })
    return copy
  })()

  const stats = {
    total: records.length,
    highRisk: records.filter(r => r.risk === '高风险').length,
    pending: records.filter(r => r.status === 'pending_review').length,
    completed: records.filter(r => r.status === 'completed').length
  }

  // 风险等级中文存储值 → 界面语言文案
  const riskLabel = (risk: string) => {
    switch (risk) {
      case '高风险': return t('risk_high')
      case '中度风险': return t('risk_moderate')
      case '轻度风险': return t('risk_mild')
      default: return t('risk_low')
    }
  }
  // 学习层次：兼容旧数据（中文）与新数据（语言无关 token）
  const eduLabel = (v?: string) => {
    if (v === '本科' || v === 'undergraduate') return t('edu_undergrad')
    if (v === '硕士研究生' || v === 'master') return t('edu_master')
    if (v === '博士研究生' || v === 'doctor') return t('edu_doctor')
    return v || '-'
  }

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case '高风险': return 'bg-red-500/20 text-red-400'
      case '中度风险': return 'bg-amber-500/15 text-amber-600'
      case '轻度风险': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-green-500/20 text-green-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return t('data_stat_completed')
      case 'pending_review': return t('status_pending')
      case 'intervened': return t('status_intervened')
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/15 text-emerald-600'
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-400'
      case 'intervened': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-warm-200 text-slate-400'
    }
  }

// ================= 导出（需求 7：内容 / 格式 / 隐私化） =================
type ExportContentKey = 'basic' | 'raw' | 'traj' | 'video'
type ExportOpts = { basic: boolean; raw: boolean; traj: boolean; video: boolean; privacy: boolean; format: 'csv' | 'json' }
const [showExport, setShowExport] = useState(false)
const [exportOpts, setExportOpts] = useState<ExportOpts>({ basic: true, raw: true, traj: false, video: false, privacy: false, format: 'csv' })
const [exportBusy, setExportBusy] = useState(false)

// 行级导出报告（需求 9：隐私化 / 未隐私化）
const [reportTarget, setReportTarget] = useState<AssessmentRecord | null>(null)
const [reportPrivacy, setReportPrivacy] = useState(true)

const exportDateStamp = () => new Date().toISOString().split('T')[0]
const genderText = (g: string) => (g === 'male' ? t('gender_male') : g === 'female' ? t('gender_female') : t('gender_other'))

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

const padArr = (arr: number[] | undefined, n: number): (number | string)[] => {
  const a = arr ?? []
  return Array.from({ length: n }, (_, i) => (a[i] === undefined || a[i] === null ? '' : a[i]))
}

const videoAvailCount = filteredRecords.filter((r) => r.cameraHasVideo).length
const anyContent = exportOpts.basic || exportOpts.raw || exportOpts.traj || exportOpts.video

const privacyMask = (r: AssessmentRecord) => ({
  studentId: exportOpts.privacy ? maskStudentId(r.studentId) : r.studentId,
  age: exportOpts.privacy ? t('data_hidden') : r.age,
  major: exportOpts.privacy ? t('data_hidden') : r.major,
})

/** 构建 CSV 表头与逐行数据（按勾选内容拼接；-1 未作答保留原值） */
const buildExport = () => {
  const list = filteredRecords
  const customUnion = new Map<string, { name: string; count: number }>()
  list.forEach((r) => (r.customScales ?? []).forEach((s) => {
    if (!customUnion.has(s.id)) customUnion.set(s.id, { name: s.name, count: s.items.length })
  }))

  const headers: string[] = []
  if (exportOpts.basic) {
    headers.push('ID', t('data_hdr_sid'), t('data_hdr_time'), t('data_hdr_edu'), t('data_hdr_grade'), t('data_hdr_major'), t('data_hdr_age'), t('data_hdr_gender'))
    scaleMeta.forEach((m) => headers.push(tFmt('data_hdr_score', { label: m.label }), tFmt('data_hdr_risk', { label: m.label })))
    headers.push(t('data_col_risk'), t('data_hdr_flags'), t('data_col_status'), t('data_hdr_cam_mode'), t('data_hdr_mouse_pts'), t('mm_signals'))
  }
  if (exportOpts.raw) {
    phq9Questions.forEach((_, i) => headers.push(`PHQ-9_${i + 1}`))
    gad7Questions.forEach((_, i) => headers.push(`GAD-7_${i + 1}`))
    cssrsQuestions.forEach((_, i) => headers.push(`C-SSRS_${i + 1}`))
    headers.push(t('data_hdr_nssi_has'), t('data_hdr_nssi_freq'))
    pss10Questions.forEach((_, i) => headers.push(`PSS-10_${i + 1}`))
    headers.push(t('data_hdr_psqi_bed'), t('data_hdr_psqi_wake'), t('data_hdr_psqi_latency'), t('data_hdr_psqi_hours'), t('data_hdr_psqi_quality'), t('data_hdr_psqi_meds'), t('data_hdr_psqi_day'), t('data_hdr_psqi_energy'))
    psqiDisturbanceItems.forEach((_, i) => headers.push(tFmt('data_hdr_psqi_disturb', { n: i + 1 })))
    sias6Questions.forEach((_, i) => headers.push(`SIAS-6_${i + 1}`))
    aslecItems.forEach((_, i) => headers.push(`ASLEC_${i + 1}`))
    customUnion.forEach((meta) => {
      for (let i = 1; i <= meta.count; i++) headers.push(tFmt('data_hdr_custom', { name: meta.name, i }))
    })
  }
  if (exportOpts.traj) headers.push(t('data_hdr_traj'))

  const rows = list.map((r) => {
    const row: (string | number)[] = []
    const pm = privacyMask(r)
    if (exportOpts.basic) {
      row.push(r.id, pm.studentId, r.time, r.educationLevel || '', r.grade || '', pm.major, pm.age, genderText(r.gender))
      scaleMeta.forEach((m) => row.push(m.score(r), m.risk(r)))
      row.push(
        riskLabel(r.risk),
        (r.riskFlags ?? []).map((f) => (f === 'suicide' ? t('data_flag_suicide') : f === 'nssi' ? t('data_flag_nssi') : f)).join('|'),
        getStatusText(r.status),
        r.cameraMode,
        r.mouseTrajectory?.length ?? 0,
        (r.behaviorSignals ?? []).map((s) => t('signal_' + s)).join('|')
      )
    }
    if (exportOpts.raw) {
      row.push(...padArr(r.phq9, 9), ...padArr(r.gad7, 7), ...padArr(r.cssrs, 4))
      row.push((r.nssi ?? [])[0] ?? '', (r.nssi ?? [])[1] ?? '')
      row.push(...padArr(r.pss10, 10))
      if (r.psqi) {
        row.push(r.psqi.bed, r.psqi.wake, r.psqi.latency, r.psqi.hours, r.psqi.quality, r.psqi.meds, r.psqi.day, r.psqi.energy)
        row.push(...r.psqi.d)
      } else {
        row.push(...new Array(18).fill(''))
      }
      row.push(...padArr(r.sias6, 6), ...padArr(r.aslec, 27))
      customUnion.forEach((meta, id) => {
        const ans = (r.customAnswers ?? {})[id]
        if (ans && ans.length === meta.count) row.push(...ans)
        else row.push(...new Array(meta.count).fill(''))
      })
    }
    if (exportOpts.traj) row.push(JSON.stringify(r.mouseTrajectory ?? []))
    return row
  })
  return { headers, rows }
}

/** 导出 JSON：结构化字段（内容按勾选拼接） */
const buildExportJson = () => {
  const list = filteredRecords
  const recordsOut = list.map((r) => {
    const pm = privacyMask(r)
    const out: Record<string, unknown> = {
      id: r.id,
      studentId: pm.studentId,
      time: r.time,
      educationLevel: r.educationLevel,
      grade: r.grade,
      major: pm.major,
      age: pm.age,
      gender: r.gender,
    }
    if (exportOpts.basic) {
      out.scales = scaleMeta.map((m) => ({ key: m.key, label: m.label, score: m.score(r), risk: m.risk(r) }))
      out.risk = r.risk
      out.riskFlags = r.riskFlags
      out.status = r.status
      out.cameraMode = r.cameraMode
      out.cameraHasVideo = r.cameraHasVideo ?? false
      out.behaviorSignals = (r.behaviorSignals ?? []).map((s) => t('signal_' + s) ?? s)
    }
    if (exportOpts.raw) {
      out.answers = {
        phq9: r.phq9,
        gad7: r.gad7,
        cssrs: r.cssrs,
        nssi: r.nssi,
        pss10: r.pss10,
        psqi: r.psqi,
        sias6: r.sias6,
        aslec: r.aslec,
        custom: r.customAnswers ?? {},
      }
      if ((r.customScales ?? []).length > 0) out.customScaleMeta = r.customScales
    }
    if (exportOpts.traj) out.mouseTrajectory = r.mouseTrajectory ?? []
    return out
  })
  return {
    exportedAt: new Date().toISOString(),
    privacy: exportOpts.privacy,
    count: list.length,
    content: { basic: exportOpts.basic, raw: exportOpts.raw, trajectory: exportOpts.traj, video: exportOpts.video },
    records: recordsOut,
  }
}

const handleExport = async () => {
  if (!anyContent || exportBusy) return
  setExportBusy(true)
  try {
    const stamp = exportDateStamp()
    const prefix = exportOpts.privacy ? 'assessment_data_privacy_' : 'assessment_data_'
    if (exportOpts.basic || exportOpts.raw || exportOpts.traj) {
      if (exportOpts.format === 'csv') {
        const { headers, rows } = buildExport()
        const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
        downloadText('\ufeff' + csv, `${prefix}${stamp}.csv`, 'text/csv;charset=utf-8')
      } else {
        downloadText(JSON.stringify(buildExportJson(), null, 2), `${prefix}${stamp}.json`, 'application/json;charset=utf-8')
      }
    }
    if (exportOpts.video) {
      const withVideo = filteredRecords.filter((r) => r.cameraHasVideo)
      for (const r of withVideo) {
        const blob = await getVideo(r.id)
        if (blob) {
          downloadBlob(blob, `camera_${r.id}.webm`)
          await new Promise((res) => setTimeout(res, 250))
        }
      }
    }
    setShowExport(false)
  } finally {
    setExportBusy(false)
  }
}

/** 行级报告导出（需求 9）：生成自包含 HTML 测评报告 */
const handleRowReport = () => {
  if (!reportTarget) return
  const html = buildRecordReportHtml(reportTarget, { privacy: reportPrivacy })
  const stamp = exportDateStamp()
  downloadText(html, `report_${reportTarget.id}${reportPrivacy ? '_privacy' : ''}_${stamp}.html`)
  setReportTarget(null)
}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t('data_title')}</h1>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4" />
          {tFmt('data_records', { n: records.length })}
        </div>
      </div>

      {/* 统计面板 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('data_stat_total')}</span>
            <FileCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('data_stat_high')}</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('data_stat_pending')}</span>
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t('data_stat_completed')}</span>
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
        </div>
      </div>

{/* 搜索和筛选 */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-56 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('data_search_ph')}
            className="w-full bg-white border border-warm-300 rounded-lg pl-10 pr-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-white border border-warm-300 rounded-lg pl-10 pr-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
          >
            <option value="all">{t('data_filter_risk_all')}</option>
            <option value="低风险">{t('risk_low')}</option>
            <option value="轻度风险">{t('risk_mild')}</option>
            <option value="中度风险">{t('risk_moderate')}</option>
            <option value="高风险">{t('risk_high')}</option>
          </select>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Download className="w-4 h-4" /> {t('data_export')}
        </button>
      </div>

      {/* 各量表独立风险等级筛选 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-slate-400 font-medium">{t('data_scale_filter')}</span>
        {scaleMeta.map((meta) => (
          <select
            key={meta.key}
            value={scaleFilter[meta.key] ?? 'all'}
            onChange={(e) => setScaleFilter((prev) => ({ ...prev, [meta.key]: e.target.value }))}
            className="bg-white border border-warm-300 rounded-lg px-2 py-1.5 text-xs text-slate-500 focus:outline-none focus:border-orange-500"
            aria-label={tFmt('data_scale_aria', { label: meta.label })}
          >
            <option value="all">{tFmt('data_scale_all', { label: meta.label })}</option>
            <option value="低风险">{t('risk_low')}</option>
            <option value="轻度风险">{t('risk_mild')}</option>
            <option value="中度风险">{t('risk_moderate')}</option>
            <option value="高风险">{t('risk_high')}</option>
          </select>
        ))}
        <button
          onClick={() => setScaleFilter({})}
          className="text-xs text-slate-400 hover:text-orange-500 transition-colors underline underline-offset-2"
        >
          {t('data_clear_scale')}
        </button>
      </div>

      {/* 数据表格：所有量表分值 + 每个量表单独风险等级，表头点击排序 */}
      <div className="bg-white rounded-lg border border-warm-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-warm-300">
                {([
                  { key: 'id' as SortKey, label: 'ID' },
                  { key: 'studentId' as SortKey, label: t('data_hdr_sid') },
                  { key: 'time' as SortKey, label: t('data_hdr_time') },
                  ...scaleMeta.map((m) => ({ key: m.key as SortKey, label: m.label })),
                  { key: 'risk' as SortKey, label: t('data_col_risk') },
                  { key: 'status' as SortKey, label: t('data_col_status') },
                ]).map((col) => (
                  <th key={col.key} className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors"
                      title={tFmt('data_sort_by', { label: col.label })}
                    >
                      {col.label}
                      <span className="text-[10px]">
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('data_col_ops')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="border-b border-warm-300/60 hover:bg-warm-200/50">
                  <td className="p-3 text-slate-500 text-sm whitespace-nowrap">{record.id}</td>
                  <td className="p-3 text-slate-500 text-sm whitespace-nowrap">{record.studentId}</td>
                  <td className="p-3 text-slate-500 text-sm whitespace-nowrap">{record.time}</td>
                  {scaleMeta.map((meta) => {
                    const score = meta.score(record)
                    const risk = meta.risk(record)
                    const hasData = meta.key === 'nssi' || meta.key === 'cssrs'
                      ? ((record as any)[meta.key] ?? []).length > 0
                      : true
                    return (
                      <td key={meta.key} className="p-3 text-slate-500 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-600">{hasData ? score : '—'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${getRiskClass(risk)}`}>{riskLabel(risk)}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskClass(record.risk)}`}>
                      {riskLabel(record.risk)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClass(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelected(record)}
                        className="bg-[#FDEEE8] hover:bg-[#FADDD2] text-ink-soft border border-orange-200 px-2.5 py-1 rounded flex items-center gap-1 text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> {t('btn_details')}
                      </button>
                      <button
                        onClick={() => {
                          setReportTarget(record)
                          setReportPrivacy(true)
                        }}
                        className="bg-white hover:bg-warm-200 text-ink-soft border border-warm-300 px-2.5 py-1 rounded flex items-center gap-1 text-xs transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" /> {t('btn_export_report')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            {t('data_no_match')}
          </div>
        )}
      </div>

      {/* 记录明细弹窗：量表全部选项与逐题作答结果 */}
      {selected && (
        <div
          className="fixed inset-0 bg-slate-900/45 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl border border-warm-300 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-warm-300 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">{t('data_detail_title')}</h2>
                <span className={`px-2 py-1 rounded text-xs ${getRiskClass(selected.risk)}`}>
                  {riskLabel(selected.risk)}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusClass(selected.status)}`}>
                  {getStatusText(selected.status)}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t('btn_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 基本信息 */}
              <div className="bg-warm-100 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-2">
                  {t('data_detail_sid')}<span className="text-slate-700 font-medium">{selected.studentId}</span>
                  <span className="mx-2 text-warm-400">|</span>
                  {t('data_detail_time')}<span className="text-slate-700">{selected.time}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{t('data_detail_edu')}{eduLabel(selected.educationLevel)}</span>
                  <span>{t('data_detail_grade')}{selected.grade || '-'}</span>
                  <span>{t('data_detail_major')}{selected.major || '-'}</span>
                  {selected.age && <span>{t('data_detail_age')}{selected.age}</span>}
                  <span>{t('data_detail_gender')}{genderText(selected.gender)}</span>
                </div>
              </div>

              {/* 各量表分值 + 独立风险等级摘要 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">{t('data_detail_scales')}</h3>
                  <span className="text-sm text-slate-400">{t('data_detail_scales_hint')}</span>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  {scaleMeta.map((meta) => {
                    const score = meta.score(selected)
                    const risk = meta.risk(selected)
                    return (
                      <div key={meta.key} className="bg-warm-100 rounded-lg p-2.5 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium">{meta.label}</span>
                        <div className="flex items-center gap-1.5">
                          <b className="text-sm text-slate-700">{score}</b>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${getRiskClass(risk)}`}>{riskLabel(risk)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PHQ-9 逐题 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">{t('scale_name_phq9')}</h3>
                  <span className="text-sm text-slate-500">
                    {t('data_total_score')}<b className="text-ink text-base">{selected.phq9Score}</b> / 27
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {phq9Questions.map((q, i) => (
                    <div key={i} className="bg-warm-100 rounded-lg p-3">
                      <div className="text-sm text-slate-600 mb-2">{i + 1}. {q}</div>
                      <div className="flex flex-wrap gap-2">
                        {riskOptions.map((opt, oi) => (
                          <span
                            key={oi}
                            className={`px-2.5 py-1 rounded text-xs border ${
                              selected.phq9[i] === oi
                                ? 'bg-[#FDEEE8] text-ink font-medium'
                                : 'bg-white text-slate-400 border-warm-300'
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GAD-7 逐题 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">{t('scale_name_gad7')}</h3>
                  <span className="text-sm text-slate-500">
                    {t('data_total_score')}<b className="text-ink text-base">{selected.gad7Score}</b> / 21
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {gad7Questions.map((q, i) => (
                    <div key={i} className="bg-warm-100 rounded-lg p-3">
                      <div className="text-sm text-slate-600 mb-2">{i + 1}. {q}</div>
                      <div className="flex flex-wrap gap-2">
                        {riskOptions.map((opt, oi) => (
                          <span
                            key={oi}
                            className={`px-2.5 py-1 rounded text-xs border ${
                              selected.gad7[i] === oi
                                ? 'bg-[#FDEEE8] text-ink font-medium'
                                : 'bg-white text-slate-400 border-warm-300'
                            }`}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 第一层：核心预警（C-SSRS 自杀筛查 / NSSI 非自杀性自伤） */}
              <div className="bg-white rounded-lg border border-red-400/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border-b border-red-400/30">
                  <h3 className="text-sm font-semibold text-slate-800">{t('data_layer1')}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {((selected.riskFlags ?? []).includes('suicide')) && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-500 border border-red-500/40 font-medium">{t('data_flag_suicide')}</span>
                    )}
                    {((selected.riskFlags ?? []).includes('nssi')) && (
                      <span className="px-2 py-0.5 rounded text-xs bg-[#FDEEE8] text-ink font-medium">{t('data_flag_nssi')}</span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-6">
                  {/* C-SSRS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_cssrs_title')}</h4>
                      <span className="text-sm text-slate-500">
                        {t('data_cssrs_positive')}<b className="text-red-500 text-base">{selected.cssrsPositive ?? 0}</b> / 4
                      </span>
                    </div>
                    {(selected.cssrs ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'C-SSRS' })}</p>
                    ) : (
                      <div className="space-y-2">
                        {cssrsQuestions.map((q, i) => {
                          const ans = (selected.cssrs ?? [])[i]
                          const positive = ans === 1
                          return (
                            <div key={i} className={`rounded-lg p-3 ${positive ? 'bg-red-500/10 border border-red-400/30' : 'bg-warm-100'}`}>
                              <div className="text-sm text-slate-600 mb-2">{i + 1}. {q}</div>
                              <div className="flex flex-wrap gap-2">
                                {cssrsOptions.map((opt, oi) => (
                                  <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                    ans === oi
                                      ? positive
                                        ? 'bg-red-500/20 text-red-500 border-red-500/50 font-medium'
                                        : 'bg-[#FDEEE8] text-ink font-medium'
                                      : 'bg-white text-slate-400 border-warm-300'
                                  }`}>
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* NSSI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_nssi_title')}</h4>
                      <span className="text-sm text-slate-500">
                        {(selected.nssi ?? [])[0] === 1 ? (
                          <b className="text-[#D54941] text-sm">{t('data_nssi_positive')}</b>
                        ) : (
                          <span className="text-slate-400">{t('data_nssi_none')}</span>
                        )}
                      </span>
                    </div>
                    {(selected.nssi ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'NSSI' })}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-sm text-slate-600 mb-2">1. {nssiQuestions[0]}</div>
                          <div className="flex flex-wrap gap-2">
                            {nssiHasOptions.map((opt, oi) => (
                              <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                (selected.nssi ?? [])[0] === oi
                                  ? oi === 1
                                    ? 'bg-[#FDECEC] text-[#D54941] border-[#F5C6C2] font-medium'
                                    : 'bg-[#FDEEE8] text-ink font-medium'
                                  : 'bg-white text-slate-400 border-warm-300'
                              }`}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-sm text-slate-600 mb-2">2. {nssiQuestions[1]}</div>
                          <div className="flex flex-wrap gap-2">
                            {nssiFreqOptions.map((opt, oi) => (
                              <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                (selected.nssi ?? [])[1] === oi
                                  ? 'bg-[#FDEEE8] text-ink font-medium'
                                  : 'bg-white text-slate-400 border-warm-300'
                              }`}>
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 第二层：扩充画像（PSS-10 / PSQI / SIAS-6 / ASLEC） */}
              <div className="bg-white rounded-lg border border-orange-400/40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-orange-500/10 border-b border-orange-400/30">
                  <h3 className="text-sm font-semibold text-slate-800">{t('data_layer2')}</h3>
                  <span className="text-sm text-slate-500">{t('data_layer2_note')}</span>
                </div>
                <div className="p-4 space-y-6">
                  {/* PSS-10 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_pss10_title')}</h4>
                      <span className="text-sm text-slate-500">
                        {t('data_total_score')}<b className="text-ink text-base">{selected.pss10Score ?? 0}</b> / 40
                        <span className="ml-2 text-xs text-slate-400">{pss10LevelOf(selected.pss10Score ?? 0)}</span>
                      </span>
                    </div>
                    {(selected.pss10 ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'PSS-10' })}</p>
                    ) : (
                      <div className="space-y-2">
                        {pss10Questions.map((q, i) => {
                          const ans = (selected.pss10 ?? [])[i]
                          return (
                            <div key={i} className="bg-warm-100 rounded-lg p-3">
                              <div className="text-sm text-slate-600 mb-2">
                                {i + 1}. {q}
                                {PSS10_REVERSED.includes(i) && (
                                  <span className="ml-2 text-[10px] text-slate-400 bg-white border border-warm-300 rounded px-1 py-0.5">{t('data_reversed')}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pss10Options.map((opt, oi) => (
                                  <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                    ans === oi
                                      ? 'bg-[#FDEEE8] text-ink font-medium'
                                      : 'bg-white text-slate-400 border-warm-300'
                                  }`}>
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* PSQI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_psqi_title')}</h4>
                      <span className="text-sm text-slate-500">
                        {t('data_total_score')}<b className="text-ink text-base">{selected.psqiScore ?? 0}</b> / 21
                        <span className="ml-2 text-xs text-slate-400">{psqiLevelOf(selected.psqiScore ?? 0)}</span>
                      </span>
                    </div>
                    {!selected.psqi ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'PSQI' })}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-2">{t('data_psqi_comps')}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(selected.psqiComps ?? []).map((c, i) => (
                              <span key={i} className="px-2 py-1 rounded text-xs border border-warm-300 bg-white text-slate-600">
                                {psqiComponentNames[i]}：<b className="text-ink">{c}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">{t('data_psqi_bed')}</div>
                            <div className="text-slate-700">{selected.psqi.bed}:00 — {selected.psqi.wake}:00</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">{t('data_psqi_latency')}</div>
                            <div className="text-slate-700">{selected.psqi.latency} {t('data_minutes')} / {selected.psqi.hours} {t('data_hours')}</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">{t('data_psqi_quality')}</div>
                            <div className="text-slate-700">{psqiQualityOptions[selected.psqi.quality] ?? '-'}</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">{t('data_psqi_meds')}</div>
                            <div className="text-slate-700">{psqiFreqOptions[selected.psqi.meds] ?? '-'} / {psqiFreqOptions[selected.psqi.day] ?? '-'} / {psqiFreqOptions[selected.psqi.energy] ?? '-'}</div>
                          </div>
                        </div>
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-2">{t('data_psqi_disturb')}</div>
                          <div className="space-y-1">
                            {psqiDisturbanceItems.map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-600 flex-1">{i + 1}. {item}</span>
                                <span className="text-xs text-slate-500 whitespace-nowrap">{psqiFreqOptions[selected.psqi.d[i]] ?? '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SIAS-6 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_sias6_title')}</h4>
                      <span className="text-sm text-slate-500">{t('data_total_score')}<b className="text-ink text-base">{selected.sias6Score ?? 0}</b> / 24</span>
                    </div>
                    {(selected.sias6 ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'SIAS-6' })}</p>
                    ) : (
                      <div className="space-y-2">
                        {sias6Questions.map((q, i) => {
                          const ans = (selected.sias6 ?? [])[i]
                          return (
                            <div key={i} className="bg-warm-100 rounded-lg p-3">
                              <div className="text-sm text-slate-600 mb-2">{i + 1}. {q}</div>
                              <div className="flex flex-wrap gap-2">
                                {sias6Options.map((opt, oi) => (
                                  <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                    ans === oi
                                      ? 'bg-[#FDEEE8] text-ink font-medium'
                                      : 'bg-white text-slate-400 border-warm-300'
                                  }`}>
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ASLEC */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">{t('data_aslec_title')}</h4>
                      <span className="text-sm text-slate-500">
                        {tFmt('data_aslec_count', { n: selected.aslecCount ?? 0 })}
                        <span className="mx-2 text-warm-400">·</span>
                        {t('data_aslec_score')}<b className="text-ink">{selected.aslecScore ?? 0}</b>
                      </span>
                    </div>
                    {(selected.aslec ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">{tFmt('data_no_data', { scale: 'ASLEC' })}</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {aslecItems.map((item, i) => {
                          const ans = (selected.aslec ?? [])[i]
                          const occurred = ans > 0
                          return (
                            <div key={i} className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg ${occurred ? 'bg-warm-100' : ''}`}>
                              <span className={`text-sm flex-1 ${occurred ? 'text-slate-600' : 'text-slate-400'}`}>{i + 1}. {item}</span>
                              <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                                !occurred ? 'text-slate-300'
                                  : ans >= 5 ? 'bg-red-500/15 text-red-500 border border-red-500/30 font-medium'
                                  : ans === 4 ? 'bg-[#FDEEE8] text-ink font-medium'
                                  : ans === 3 ? 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'
                                  : 'bg-warm-200 text-slate-500'
                              }`}>
                                {aslecImpactOptions[ans] ?? t('data_not_occurred')}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 行为动力学特征（依据调研文档：轨迹弯曲 / 速度剖面 / 方向反转 / 停顿） */}
              <MouseMetricsCard
                metrics={selected.mouseMetrics ?? null}
                signals={selected.behaviorSignals ?? []}
              />

              {/* 鼠标轨迹（行为数据）——测评第 3 步答题过程中自动采样 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">{t('data_traj_title')}</h3>
                  <span className="text-sm text-slate-500">
                    {t('data_traj_samples')}<b className="text-ink text-base">{selected.mouseTrajectory?.length ?? 0}</b>
                    <span className="mx-2 text-warm-400">·</span>
                    {t('data_cam_mode')}{selected.cameraMode === 'degraded' ? t('data_cam_degraded') : t('data_cam_normal')}
                  </span>
                </div>
                <div className="p-4">
                  {selected.mouseTrajectory && selected.mouseTrajectory.length > 0 ? (
                    <div className="space-y-3">
                      <TrajectoryCanvas traj={selected.mouseTrajectory} />
                      <div className="bg-warm-100 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 text-xs text-slate-400 border-b border-warm-300/60 flex items-center justify-between">
                          <span>{t('traj_series')}</span>
                          <span>{tFmt('traj_total', { n: selected.mouseTrajectory.length })}</span>
                        </div>
                        <pre className="p-3 text-xs text-slate-500 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                          {selected.mouseTrajectory.map(p => `(${p.x}, ${p.y}, ${p.t}ms${p.k === 'c' ? t('data_click_mark') : ''})`).join('  ')}
                        </pre>
                      </div>
                      <p className="text-xs text-slate-400">
                        {t('data_traj_desc')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-2">
                      {t('data_traj_empty')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-warm-300 sticky bottom-0 bg-white">
              <button
                onClick={() => setSelected(null)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {t('btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出弹窗（需求 7）：内容 / 格式 / 隐私化 */}
      {showExport && (
        <div
          className="fixed inset-0 bg-slate-900/45 flex items-center justify-center z-50 p-4"
          onClick={() => setShowExport(false)}
        >
          <div
            className="bg-white rounded-xl border border-warm-300 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-warm-300">
              <h2 className="text-lg font-bold text-slate-800">{t('data_export_title')}</h2>
              <button
                onClick={() => setShowExport(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t('btn_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* 导出范围 */}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">{t('data_export_scope')}</div>
                <p className="text-xs text-slate-400">
                  {tFmt('data_export_scope_filtered', { n: filteredRecords.length })}
                  <span className="mx-1.5 text-warm-400">·</span>
                  {t('data_export_privacy')}
                </p>
              </div>

              {/* 导出内容 */}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">{t('data_export_content')}</div>
                <div className="space-y-2">
                  {([
                    { key: 'basic', icon: FileCheck, label: t('data_export_basic') },
                    { key: 'raw', icon: FileText, label: t('data_export_raw') },
                    { key: 'traj', icon: MousePointerIcon, label: t('data_export_traj') },
                    {
                      key: 'video',
                      icon: Video,
                      label: t('data_export_video') + (videoAvailCount > 0 ? tFmt('data_export_video_count', { n: videoAvailCount }) : ''),
                    },
                  ] as { key: ExportContentKey; icon: React.ElementType; label: string }[]).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-start gap-3 p-3 bg-warm-100 rounded-lg cursor-pointer hover:bg-warm-200/70 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={exportOpts[item.key]}
                        onChange={() => setExportOpts((o) => ({ ...o, [item.key]: !o[item.key] }))}
                        className="mt-1 w-4 h-4 accent-orange-500 rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="text-sm text-slate-600">{item.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {exportOpts.video && (
                  <p className="text-xs text-amber-600 mt-2 leading-relaxed">
                    {t('data_export_video_note')}
                    {videoAvailCount === 0 && ` · ${t('data_export_video_none')}`}
                  </p>
                )}
              </div>

              {/* 导出格式 */}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">{t('data_export_format')}</div>
                <div className="flex gap-2">
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      exportOpts.format === 'csv'
                        ? 'bg-[#FDEEE8] border-orange-300 text-ink font-medium'
                        : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="export-format"
                      checked={exportOpts.format === 'csv'}
                      onChange={() => setExportOpts((o) => ({ ...o, format: 'csv' }))}
                      className="accent-orange-500"
                    />
                    <Download className="w-4 h-4" /> {t('data_export_fmt_csv')}
                  </label>
                  <label
                    className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      exportOpts.format === 'json'
                        ? 'bg-[#FDEEE8] border-orange-300 text-ink font-medium'
                        : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="export-format"
                      checked={exportOpts.format === 'json'}
                      onChange={() => setExportOpts((o) => ({ ...o, format: 'json' }))}
                      className="accent-orange-500"
                    />
                    <FileJson className="w-4 h-4" /> {t('data_export_fmt_json')}
                  </label>
                </div>
              </div>

              {/* 隐私化 */}
              <label className="flex items-start gap-3 p-3 bg-warm-100 rounded-lg cursor-pointer hover:bg-warm-200/70 transition-colors">
                <input
                  type="checkbox"
                  checked={exportOpts.privacy}
                  onChange={() => setExportOpts((o) => ({ ...o, privacy: !o.privacy }))}
                  className="mt-1 w-4 h-4 accent-orange-500 rounded shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{t('data_export_privacy')}</div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('data_privacy_on')}：{t('data_privacy_on_desc')}
                    <span className="mx-1 text-warm-400">/</span>
                    {t('data_privacy_off')}：{t('data_privacy_off_desc')}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-warm-300">
              <button
                onClick={() => setShowExport(false)}
                className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleExport}
                disabled={!anyContent || exportBusy}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {exportBusy ? '…' : t('data_export_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 行级导出报告弹窗（需求 9）：隐私化 / 未隐私化 */}
      {reportTarget && (
        <div
          className="fixed inset-0 bg-slate-900/45 flex items-center justify-center z-50 p-4"
          onClick={() => setReportTarget(null)}
        >
          <div
            className="bg-white rounded-xl border border-warm-300 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-warm-300">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800">{t('report_title')}</h2>
                <span className={`px-2 py-1 rounded text-xs ${getRiskClass(reportTarget.risk)}`}>
                  {reportTarget.risk}
                </span>
              </div>
              <button
                onClick={() => setReportTarget(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={t('btn_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">
                {reportTarget.id} · {reportTarget.time}
                <span className="mx-2 text-warm-400">|</span>
                {maskStudentId(reportTarget.studentId)}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{t('report_hint')}</p>

              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">{t('report_privacy_q')}</div>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                      reportPrivacy
                        ? 'bg-[#FDEEE8] border-orange-300 text-ink font-medium'
                        : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-privacy"
                      checked={reportPrivacy}
                      onChange={() => setReportPrivacy(true)}
                      className="mt-1 accent-orange-500"
                    />
                    <div>
                      {t('data_privacy_on')}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">{t('data_report_privacy_desc')}</div>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                      !reportPrivacy
                        ? 'bg-[#FDEEE8] border-orange-300 text-ink font-medium'
                        : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-privacy"
                      checked={!reportPrivacy}
                      onChange={() => setReportPrivacy(false)}
                      className="mt-1 accent-orange-500"
                    />
                    <div>
                      {t('data_privacy_off')}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">{t('data_report_full_desc')}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-warm-300">
              <button
                onClick={() => setReportTarget(null)}
                className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleRowReport}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <FileDown className="w-4 h-4 inline mr-1 -mt-0.5" />
                {t('report_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

