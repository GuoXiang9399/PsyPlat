'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  Users,
  RefreshCw,
  MousePointer2,
  Sparkles,
  Video,
  Info,
  AlertTriangle,
  ListChecks,
  FileDown,
  Printer,
  ChevronDown,
  ChevronUp,
  Table2,
  CheckSquare
} from 'lucide-react'
import { loadRecords, BEHAVIOR_SIGNAL_LABELS, type AssessmentRecord } from '@/lib/records'
import {
  analyzeSummary,
  computeScaleMetricCorr,
  behaviorSignalByRisk,
  cameraModeByRisk,
  summarizeNums,
  METRIC_KEYS,
  SIGNAL_LABELS,
  RISK_ORDER,
  metricsRowOf
} from '@/lib/analysis'
import { REPORT_SCALE_DEFS, buildAnalysisReportHtml, downloadText, printHtml } from '@/lib/reportExport'
import { useT } from '@/lib/i18n'

function RiskBadge({ level }: { level: string }) {
  const { t } = useT()
  const cls: Record<string, string> = {
    '低风险': 'bg-green-500/15 text-green-600 border border-green-500/30',
    '轻度风险': 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30',
    '中度风险': 'bg-amber-500/15 text-amber-700 border border-amber-500/30',
    '高风险': 'bg-red-500/15 text-red-500 border border-red-500/40'
  }
  const text = level === '高风险' ? t('risk_high') : level === '中度风险' ? t('risk_moderate') : level === '轻度风险' ? t('risk_mild') : t('risk_low')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[level] || 'bg-slate-100 text-slate-500'}`}>
      {text}
    </span>
  )
}

function CorrCell({ rho, n, effect }: { rho: number | null; n: number; effect: string }) {
  const { t } = useT()
  if (rho === null) return <span className="text-slate-300">–</span>
  const eff = effect === '可忽略' ? t('ana_eff_negligible') : effect === '弱' ? t('ana_eff_weak') : effect === '中等' ? t('ana_eff_moderate') : effect === '强' ? t('ana_eff_strong') : effect
  const strength = Math.abs(rho)
  const color = strength < 0.1 ? 'text-slate-400' : strength < 0.3 ? 'text-slate-500' : strength < 0.5 ? 'text-amber-600 font-medium' : 'text-[#D54941] font-bold'
  const sign = rho >= 0 ? '+' : ''
  return (
    <div className={`${color} text-sm`}>
      {sign}{rho.toFixed(2)}
      <div className="text-[10px] text-slate-400 font-normal">{eff}·n={n}</div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-warm-300 p-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-700">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

/* ================= SVG 分析图（无外部依赖，探索性图） ================= */

const RISK_COLORS: Record<string, string> = {
  '低风险': '#16a34a',
  '轻度风险': '#ca8a04',
  '中度风险': '#ea580c',
  '高风险': '#dc2626'
}

function DonutChart({ items, size = 170, thickness = 24, centerValue, centerLabel }: {
  items: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerValue: string | number
  centerLabel: string
}) {
  const total = items.reduce((s, x) => s + x.value, 0)
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
      {items.map((it) => {
        if (it.value <= 0 || total === 0) return null
        const frac = it.value / total
        const dash = Math.max(frac * circ - 2, 0.5)
        const seg = (
          <circle
            key={it.label}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={it.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-acc * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )
        acc += frac
        return seg
      })}
      <text x="50%" y="48%" textAnchor="middle" className="fill-slate-700" fontSize="24" fontWeight="700">
        {centerValue}
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-slate-400" fontSize="11">
        {centerLabel}
      </text>
    </svg>
  )
}

function LegendRow({ items }: { items: { label: string; color: string; value?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: it.color }} />
          {it.label}
          {it.value !== undefined && <b className="text-slate-700">{it.value}</b>}
        </span>
      ))}
    </div>
  )
}

/** 相关矩阵热力图：正相关橙红、负相关蓝、无样本灰色 */
function CorrHeatmap({ rows, cols, cells }: {
  rows: (keyof Omit<import('@/lib/analysis').MetricsRow, 'id'>)[]
  cols: { key: string; label: string }[]
  cells: { rho: number | null; n: number; effect: string }[][]
}) {
  const { t } = useT()
  const metricLabelOf = (k: string): string => {
    const m: Record<string, string> = {
      duration: 'ana_m_duration', points: 'ana_m_points', distance: 'ana_m_distance',
      avgSpeed: 'ana_m_avg_speed', speedCV: 'ana_m_speed_cv', pauseCount: 'ana_m_pause_count',
      pauseRatio: 'ana_m_pause_ratio', initLatency: 'ana_m_init_latency', xFlips: 'ana_m_x_flips',
      yFlips: 'ana_m_y_flips', curvature: 'ana_m_curvature', tremorScore: 'ana_m_tremor',
      flips: 'ana_m_flips'
    }
    return t(m[k] || '')
  }
  const cellW = 52, cellH = 30, padL = 118, padT = 30
  const W = padL + cols.length * cellW + 12
  const H = padT + rows.length * cellH + 10
  const rhoColor = (rho: number | null): string => {
    if (rho === null) return '#f1f5f9'
    const t = Math.min(Math.abs(rho), 1)
    return rho >= 0
      ? `rgba(217,119,6,${(0.12 + t * 0.72).toFixed(2)})`
      : `rgba(37,99,235,${(0.12 + t * 0.72).toFixed(2)})`
  }
  const txtColor = (rho: number | null) => (rho !== null && Math.abs(rho) >= 0.55 ? '#ffffff' : '#475569')
  return (
    <div className="overflow-x-auto">
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img">
        {/* 行标签（轨迹指标） */}
        {rows.map((rk, ri) => (
          <text key={rk as string} x={padL - 8} y={padT + ri * cellH + cellH / 2 + 4}
            textAnchor="end" fontSize="11" className="fill-slate-600">
            {metricLabelOf(rk)}
          </text>
        ))}
        {/* 列标签（量表） */}
        {cols.map((c, ci) => {
          const label = c.label.length > 8 ? c.label.slice(0, 8) + '…' : c.label
          return (
            <text key={c.key} x={padL + ci * cellW + cellW / 2} y={padT - 10}
              textAnchor="middle" fontSize="10.5" className="fill-slate-500">
              {label}
            </text>
          )
        })}
        {/* 单元格 */}
        {rows.map((rk, ri) =>
          cols.map((c, ci) => {
            const rho = cells[ri][ci].rho
            const x = padL + ci * cellW
            const y = padT + ri * cellH
            return (
              <g key={`${rk}-${c.key}`}>
                <rect x={x} y={y} width={cellW - 2} height={cellH - 2} rx={3}
                  fill={rhoColor(rho)} />
                <text x={x + (cellW - 2) / 2} y={y + (cellH - 2) / 2 + 4}
                  textAnchor="middle" fontSize="11" fontWeight={rho !== null && Math.abs(rho) >= 0.3 ? 700 : 400}
                  fill={txtColor(rho)}>
                  {rho === null ? '–' : (rho >= 0 ? '+' : '') + rho.toFixed(2)}
                </text>
              </g>
            )
          })
        )}
      </svg>
      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
        <span>{t('ana_legend_neg')}</span>
        <svg width="90" height="10"><defs><linearGradient id="corr-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(37,99,235,.85)" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="rgba(217,119,6,.85)" />
        </linearGradient></defs><rect width="90" height="10" fill="url(#corr-grad)" rx="3" /></svg>
        <span>{t('ana_legend_pos')}</span>
        <span className="ml-auto">{t('ana_heat_legend_note')}</span>
      </div>
    </div>
  )
}

/** 堆叠柱状图：parts 占比堆叠（量表分布 / 行为信号 × 风险等级） */
function StackedBars({ rows, parts }: {
  rows: { label: string; parts: number[]; total: number }[]
  parts: { label: string; color: string }[]
}) {
  const W = 520, H = 210, padL = 108, padB = 34, padT = 18, right = 12
  const chartW = W - padL - right
  const chartH = H - padT - padB
  const maxTotal = Math.max(...rows.map((r) => r.total), 1)
  const niceMax = Math.max(5, Math.ceil(maxTotal / 5) * 5)
  const bw = Math.min(56, (chartW - (rows.length - 1) * 18) / rows.length)
  const ticks = [0, niceMax / 2, niceMax]
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img">
      {ticks.map((t) => {
        const y = padT + chartH - (t / niceMax) * chartH
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#eef0f4" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-slate-400">{t}</text>
          </g>
        )
      })}
      {rows.map((row, ri) => {
        const x = padL + ri * (bw + 18)
        let yOff = 0
        return (
          <g key={row.label}>
            {row.parts.map((p, pi) => {
              if (p <= 0) return null
              const h = Math.max((p / niceMax) * chartH, 1.5)
              const rect = (
                <rect key={pi} x={x} y={padT + chartH - yOff - h} width={bw} height={h}
                  fill={parts[pi].color} opacity={0.88} />
              )
              yOff += h
              return rect
            })}
            {row.total > 0 && <text x={x + bw / 2} y={padT + chartH - yOff - 5} textAnchor="middle" fontSize="10.5" fontWeight={600} className="fill-slate-600">{row.total}</text>}
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="10.5" className="fill-slate-500">{row.label}</text>
          </g>
        )
      })}
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#cbd5e1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" />
    </svg>
  )
}

/** 分组柱状图：视频状态 × 平均量表分（各量表独立满标，标注实际均值） */
function GroupBars({ groups, series }: {
  groups: { label: string; values: (number | null)[] }[]
  series: { label: string; color: string; max: number }[]
}) {
  const W = 500, H = 230, padL = 46, padB = 34, padT = 16, right = 12
  const chartW = W - padL - right
  const chartH = H - padT - padB
  const gw = chartW / groups.length
  const bw = Math.min(46, (gw - 16) / series.length)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + chartH * (1 - f)
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke="#eef0f4" strokeDasharray="3 3" />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" className="fill-slate-400">{Math.round(f * 100)}%</text>
          </g>
        )
      })}
      {groups.map((g, gi) => (
        <g key={g.label}>
          {series.map((s, si) => {
            const v = g.values[si]
            const x = padL + gi * gw + 8 + si * bw
            return (
              <g key={s.label}>
                <rect x={x} y={padT + chartH - (v === null ? 0 : Math.max((v / s.max) * chartH, 1.5))}
                  width={bw} height={v === null ? 0 : Math.max((v / s.max) * chartH, 1.5)}
                  fill={s.color} opacity={0.85} rx={2} />
                {v !== null && (
                  <text x={x + bw / 2} y={padT + chartH - (v / s.max) * chartH - 4} textAnchor="middle"
                    fontSize="10.5" fontWeight={600} className="fill-slate-600">{v}</text>
                )}
              </g>
            )
          })}
          <text x={padL + gi * gw + gw / 2} y={H - 12} textAnchor="middle" fontSize="10.5" className="fill-slate-500">{g.label}</text>
        </g>
      ))}
      <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#cbd5e1" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#cbd5e1" />
    </svg>
  )
}

/** 范围条图：轨迹指标分布 min→max + 均值/中位标记 */
function RangeBars({ rows }: {
  rows: { label: string; min: number; max: number; median: number; mean: number; n: number }[]
}) {
  const W = 560, H = 34 * rows.length + 20, padL = 148, padR = 16, top = 6
  const chartW = W - padL - padR
  const xOf = (v: number, lo: number, hi: number) => (hi === lo ? padL + chartW / 2 : padL + ((v - lo) / (hi - lo)) * chartW)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img">
      {rows.map((r, ri) => {
        const y = top + ri * 34 + 12
        const x0 = xOf(r.min, r.min, r.max)
        const x1 = xOf(r.max, r.min, r.max)
        return (
          <g key={r.label}>
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10.5" className="fill-slate-600">{r.label}</text>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke="#cbd5e1" strokeWidth={4} strokeLinecap="round" />
            <circle cx={xOf(r.mean, r.min, r.max)} cy={y} r={3.5} fill="#E05A3C" />
            <circle cx={xOf(r.median, r.min, r.max)} cy={y} r={3.5} fill="#dc2626" />
            <text x={Math.min(x1 + 6, W - 4)} y={y + 4} fontSize="9.5" className="fill-slate-400">{r.min.toFixed(0)}–{r.max.toFixed(0)}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ================= 分区导航（需求 8：梳理条理） ================= */

type SectionKey = 'overview' | 'scales' | 'behavior' | 'corr' | 'video'

const SECTION_DEFS: { key: SectionKey; labelKey: string; icon: React.ElementType }[] = [
  { key: 'overview', labelKey: 'ana_section_overview', icon: BarChart3 },
  { key: 'scales', labelKey: 'ana_section_scales', icon: Table2 },
  { key: 'behavior', labelKey: 'ana_section_behavior', icon: MousePointer2 },
  { key: 'corr', labelKey: 'ana_section_corr', icon: Sparkles },
  { key: 'video', labelKey: 'ana_section_video', icon: Video },
]

export function AnalysisContent() {
  const { t, tFmt } = useT()
  const riskLabel = (v: string) => v === '高风险' ? t('risk_high') : v === '中度风险' ? t('risk_moderate') : v === '轻度风险' ? t('risk_mild') : t('risk_low')
  const metricLabel = (k: string): string => {
    const m: Record<string, string> = {
      duration: 'ana_m_duration', points: 'ana_m_points', distance: 'ana_m_distance',
      avgSpeed: 'ana_m_avg_speed', speedCV: 'ana_m_speed_cv', pauseCount: 'ana_m_pause_count',
      pauseRatio: 'ana_m_pause_ratio', initLatency: 'ana_m_init_latency', xFlips: 'ana_m_x_flips',
      yFlips: 'ana_m_y_flips', curvature: 'ana_m_curvature', tremorScore: 'ana_m_tremor',
      flips: 'ana_m_flips'
    }
    return t(m[k] || '')
  }
  const signalLabel = (s: string): string => {
    const m: Record<string, string> = {
      low_effort: 'ana_sig_low_effort', retardation: 'ana_sig_retardation',
      hesitation: 'ana_sig_hesitation', mind_wandering: 'ana_sig_mind_wandering', tremor: 'ana_sig_tremor'
    }
    return m[s] ? t(m[s]) : (SIGNAL_LABELS[s] || BEHAVIOR_SIGNAL_LABELS[s as keyof typeof BEHAVIOR_SIGNAL_LABELS] || s)
  }
  const camLabel = (mode: string): string =>
    mode === 'normal' ? t('ana_cam_normal') : mode === 'degraded' ? t('ana_cam_degraded') : t('ana_cam_unknown')
  const scaleShort = (key: string): string => {
    const m: Record<string, string> = {
      phq9: 'ana_scale_phq9', gad7: 'ana_scale_gad7', pss10: 'ana_scale_pss10',
      psqi: 'ana_scale_psqi', sias6: 'ana_scale_sias6', aslec: 'ana_scale_aslec', risk: 'ana_scale_risk'
    }
    return t(m[key] || '')
  }
  const scaleFull = (key: string): string => {
    const m: Record<string, string> = {
      phq9: 'ana_scale_full_phq9', gad7: 'ana_scale_full_gad7', cssrs: 'ana_scale_full_cssrs',
      nssi: 'ana_scale_full_nssi', pss10: 'ana_scale_full_pss10', psqi: 'ana_scale_full_psqi',
      sias6: 'ana_scale_full_sias6', aslec: 'ana_scale_full_aslec'
    }
    return m[key] ? t(m[key]) : ''
  }
  const [refreshTick, setRefreshTick] = useState(0)
  const [section, setSection] = useState<SectionKey>('overview')
  // null = 全部记录；Set = 勾选集合
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [showTargets, setShowTargets] = useState(false)
  const [exporting, setExporting] = useState(false)

  const records = useMemo<AssessmentRecord[]>(() => loadRecords(), [refreshTick])
  const selected = useMemo<AssessmentRecord[]>(
    () => (selectedIds === null ? records : records.filter((r) => selectedIds.has(r.id))),
    [records, selectedIds]
  )

  const summary = useMemo(() => analyzeSummary(selected), [selected])
  const corr = useMemo(() => computeScaleMetricCorr(selected), [selected])
  const signals = useMemo(() => behaviorSignalByRisk(selected), [selected])
  const camera = useMemo(() => cameraModeByRisk(selected), [selected])

  // 轨迹指标描述统计（基于有 mouseMetrics 的记录）
  const metricSummaries = useMemo(() => {
    const withMetrics = selected.filter((r) => r.mouseMetrics)
    return METRIC_KEYS.map((key) => {
      const rowVals = withMetrics
        .map((r) => metricsRowOf(r.mouseMetrics!)[key] as number)
        .filter((v) => v !== undefined && v !== null && !Number.isNaN(v))
      return { key, label: metricLabel(key), sum: summarizeNums(rowVals) }
    })
  }, [selected])

  // 各量表独立风险分布（量表分布分区）
  const scaleDist = useMemo(() => {
    return REPORT_SCALE_DEFS.map((def) => {
      const recs = selected.filter((r) => def.hasData(r))
      const counts = RISK_ORDER.map((lv) => recs.filter((r) => def.risk(r) === lv).length)
      const scores = recs.map((r) => def.score(r))
      return { def, n: recs.length, counts, sum: summarizeNums(scores) }
    })
  }, [selected])

  const toggleTarget = (id: string) => {
    setSelectedIds((prev) => {
      const base = prev ?? new Set(records.map((r) => r.id))
      const next = new Set(base)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllTargets = () => setSelectedIds(null)
  const selectHighRisk = () => setSelectedIds(new Set(records.filter((r) => r.risk === '高风险').map((r) => r.id)))
  const clearTargets = () => setSelectedIds(new Set())

  const dateStamp = () => new Date().toISOString().split('T')[0]

  const handleExportHtml = () => {
    if (selected.length === 0 || exporting) return
    setExporting(true)
    try {
      downloadText(buildAnalysisReportHtml(selected), `analysis_report_${dateStamp()}.html`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = () => {
    if (selected.length === 0) return
    printHtml(buildAnalysisReportHtml(selected))
  }

  const empty = records.length === 0

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return (
          <>
            {/* 样本概况 */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={<Users className="w-4 h-4" />} label={t('ana_overview_total')} value={summary.total} />
              <StatCard icon={<MousePointer2 className="w-4 h-4" />} label={t('ana_overview_traj')} value={summary.withTrajectory} sub={`${summary.total > 0 ? Math.round(summary.withTrajectory / summary.total * 100) : 0}%`} />
              <StatCard icon={<Sparkles className="w-4 h-4" />} label={t('ana_overview_metrics')} value={summary.withMetrics} sub={`${summary.total > 0 ? Math.round(summary.withMetrics / summary.total * 100) : 0}%`} />
              <StatCard icon={<Video className="w-4 h-4" />} label={t('ana_overview_cam_normal')} value={summary.cameraDist.find(c => c.mode === 'normal')?.count ?? 0} />
              <StatCard icon={<Video className="w-4 h-4" />} label={t('ana_overview_cam_degraded')} value={summary.cameraDist.find(c => c.mode === 'degraded')?.count ?? 0} />
              <StatCard icon={<AlertTriangle className="w-4 h-4" />} label={t('ana_overview_high')} value={summary.riskDist.find(r => r.label === '高风险')?.count ?? 0} />
            </div>

            {/* 样本概况图：风险分布 + 摄像头状态 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  {t('ana_sample_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t('ana_sample_desc')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                <div className="flex flex-col items-center gap-3">
                  <DonutChart
                    items={summary.riskDist
                      .filter((r) => r.count > 0)
                      .map((r) => ({ label: riskLabel(r.label), value: r.count, color: RISK_COLORS[r.label] || '#94a3b8' }))}
                    centerValue={summary.total}
                    centerLabel={t('ana_records_total')}
                  />
                  <LegendRow items={summary.riskDist.filter((r) => r.count > 0).map((r) => ({ label: riskLabel(r.label), color: RISK_COLORS[r.label] || '#94a3b8', value: r.count }))} />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <DonutChart
                    items={summary.cameraDist.map((c) => ({
                      label: camLabel(c.mode),
                      value: c.count,
                      color: c.mode === 'normal' ? '#16a34a' : c.mode === 'degraded' ? '#ea580c' : '#94a3b8'
                    }))}
                    centerValue={summary.total}
                    centerLabel={t('ana_records_total')}
                  />
                  <LegendRow items={summary.cameraDist.map((c) => ({ label: camLabel(c.mode), color: c.mode === 'normal' ? '#16a34a' : c.mode === 'degraded' ? '#ea580c' : '#94a3b8', value: c.count }))} />
                </div>
              </div>
            </div>
          </>
        )

      case 'scales':
        return (
          <>
            {/* 各量表独立风险等级分布 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Table2 className="w-5 h-5 text-orange-500" />
                  {t('ana_scale_comp_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('ana_scale_comp_desc')}
                </p>
              </div>
              <div className="p-5 border-b border-warm-300/60">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">{t('ana_scale_comp_chart')}</span>
                  <LegendRow items={RISK_ORDER.map((r) => ({ label: riskLabel(r), color: RISK_COLORS[r] || '#94a3b8' }))} />
                </div>
                <StackedBars
                  rows={scaleDist.map((s) => ({
                    label: s.def.label,
                    parts: s.counts,
                    total: s.n
                  }))}
                  parts={RISK_ORDER.map((r) => ({ label: riskLabel(r), color: RISK_COLORS[r] || '#94a3b8' }))}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-300">
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('ana_th_scale')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">n</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('ana_th_mean')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('ana_th_median')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('ana_th_sd')}</th>
                      {RISK_ORDER.map((r) => (
                        <th key={r} className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{riskLabel(r)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scaleDist.map((s) => (
                      <tr key={s.def.key} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                        <td className="p-3 text-slate-600 text-sm whitespace-nowrap font-medium">{scaleFull(s.def.key)}</td>
                        <td className="p-3 text-slate-500 text-sm">{s.n}</td>
                        <td className="p-3 text-slate-500 text-sm">{s.sum ? s.sum.mean.toFixed(1) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{s.sum ? s.sum.median.toFixed(1) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{s.sum ? s.sum.sd.toFixed(1) : '–'}</td>
                        {s.counts.map((c, i) => (
                          <td key={i} className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-600 text-sm font-medium">{c}</span>
                              {c > 0 && <RiskBadge level={RISK_ORDER[i]} />}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )

      case 'behavior':
        return (
          <>
            {/* 轨迹指标分布 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <MousePointer2 className="w-5 h-5 text-orange-500" />
                  {t('ana_traj_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t('ana_traj_desc')}</p>
              </div>
              <div className="p-5 border-b border-warm-300/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{t('ana_traj_chart')}</span>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#E05A3C' }} />{t('ana_legend_mean')}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#dc2626' }} />{t('ana_legend_median')}</span>
                    <span className="inline-flex items-center gap-1"><span className="w-3.5 h-1 rounded" style={{ background: '#cbd5e1' }} />{t('ana_legend_minmax')}</span>
                  </div>
                </div>
                <RangeBars
                  rows={metricSummaries
                    .filter((m) => m.sum)
                    .map((m) => ({
                      label: m.label,
                      min: m.sum!.min,
                      max: m.sum!.max,
                      median: m.sum!.median,
                      mean: m.sum!.mean,
                      n: m.sum!.n
                    }))}
                />
                {(metricSummaries.filter((m) => m.sum).length === 0 || !metricSummaries.some((m) => m.sum && m.sum.max > m.sum.min)) && (
                  <p className="text-sm text-slate-400">{t('ana_traj_flat')}</p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-300">
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_metric')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">n</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_mean')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_median')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_sd')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_min')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_max')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricSummaries.map(m => (
                      <tr key={m.key} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                        <td className="p-3 text-slate-600 text-sm whitespace-nowrap font-medium">{m.label}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.n : 0}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.mean.toFixed(2) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.median.toFixed(2) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.sd.toFixed(2) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.min.toFixed(0) : '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{m.sum ? m.sum.max.toFixed(0) : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 行为信号 × 风险等级 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                  {t('ana_signal_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{t('ana_signal_desc')}</p>
              </div>
              {signals.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">{t('ana_signal_none')}</p>
              ) : (
                <>
                  <div className="p-5 border-b border-warm-300/60">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-500">{t('ana_signal_chart')}</span>
                      <LegendRow items={RISK_ORDER.map((r) => ({ label: riskLabel(r), color: RISK_COLORS[r] || '#94a3b8' }))} />
                    </div>
                    <StackedBars
                      rows={signals.map((s) => ({
                        label: signalLabel(s.signal),
                        parts: [s.low, s.mild, s.moderate, s.high],
                        total: s.count
                      }))}
                      parts={RISK_ORDER.map((r) => ({ label: riskLabel(r), color: RISK_COLORS[r] || '#94a3b8' }))}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-warm-300">
                          <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_signal')}</th>
                          <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_count')}</th>
                          {RISK_ORDER.map(r => <th key={r} className="text-left p-3 text-slate-400 text-sm font-medium">{riskLabel(r)}</th>)}
                          <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_high_pct')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signals.map(s => (
                          <tr key={s.signal} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                            <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{signalLabel(s.signal)}</td>
                            <td className="p-3 text-slate-500 text-sm">{s.count}</td>
                            <td className="p-3"><RiskBadge level="低风险" /> <span className="text-slate-500 text-sm ml-1">{s.low}</span></td>
                            <td className="p-3"><RiskBadge level="轻度风险" /> <span className="text-slate-500 text-sm ml-1">{s.mild}</span></td>
                            <td className="p-3"><RiskBadge level="中度风险" /> <span className="text-slate-500 text-sm ml-1">{s.moderate}</span></td>
                            <td className="p-3"><RiskBadge level="高风险" /> <span className="text-slate-500 text-sm ml-1">{s.high}</span></td>
                            <td className="p-3 text-slate-600 text-sm">{s.highPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )

      case 'corr':
        return (
          <>
            {/* 量表 × 鼠标轨迹 相关矩阵 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  {t('ana_corr_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('ana_corr_desc')}
                  {corr.maxN < 5 && (
                    <span className="text-amber-600 ml-1">{t('ana_corr_low_n')}</span>
                  )}
                </p>
              </div>
              <div className="p-5 border-b border-warm-300/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">{t('ana_corr_chart')}</span>
                </div>
                <CorrHeatmap rows={corr.rows} cols={corr.cols.map((c) => ({ key: c.key as string, label: scaleShort(c.key as string) }))} cells={corr.cells} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-300">
                      <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{t('ana_th_traj_metric')}</th>
                      {corr.cols.map(c => (
                        <th key={c.key as string} className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{scaleShort(c.key as string)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corr.rows.map((rk, ri) => (
                      <tr key={rk} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                        <td className="p-3 text-slate-600 text-sm whitespace-nowrap font-medium">{metricLabel(rk as string)}</td>
                        {corr.cols.map((c, ci) => (
                          <td key={c.key as string} className="p-3">
                            <CorrCell rho={corr.cells[ri][ci].rho} n={corr.cells[ri][ci].n} effect={corr.cells[ri][ci].effect} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )

      case 'video':
        return (
          <>
            {/* 视频采集状态 × 量表/风险 */}
            <div className="bg-white rounded-xl border border-warm-300">
              <div className="px-5 py-4 border-b border-warm-300">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Video className="w-5 h-5 text-orange-500" />
                  {t('ana_video_title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('ana_video_desc')}
                </p>
              </div>
              <div className="p-5 border-b border-warm-300/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{t('ana_video_chart')}</span>
                  <LegendRow items={[
                    { label: t('ana_avg_phq9'), color: '#E05A3C' },
                    { label: t('ana_avg_pss10'), color: '#ea580c' }
                  ]} />
                </div>
                <GroupBars
                  groups={camera.map((row) => ({
                    label: camLabel(row.mode).replace(/\s*\(.*\)/, ''),
                    values: [row.avgPhq9, row.avgPss10]
                  }))}
                  series={[
                    { label: t('ana_avg_phq9_short'), color: '#E05A3C', max: 27 },
                    { label: t('ana_avg_pss10_short'), color: '#ea580c', max: 50 }
                  ]}
                />
                <p className="text-[11px] text-slate-400 mt-2">{t('ana_video_yaxis')}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-300">
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_status')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_count')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_high_count')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_th_high_pct')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_avg_phq9_short')}</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">{t('ana_avg_pss10_short')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {camera.map(row => (
                      <tr key={row.mode} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                        <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{camLabel(row.mode)}</td>
                        <td className="p-3 text-slate-500 text-sm">{row.count}</td>
                        <td className="p-3 text-slate-500 text-sm">{row.high}</td>
                        <td className="p-3 text-slate-500 text-sm">{row.highPct}%</td>
                        <td className="p-3 text-slate-500 text-sm">{row.avgPhq9 ?? '–'}</td>
                        <td className="p-3 text-slate-500 text-sm">{row.avgPss10 ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-warm-300/60 bg-warm-100/50 flex items-start gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {t('ana_video_note')}
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            {t('ana_title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('ana_desc')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRefreshTick(t2 => t2 + 1)}
            className="flex items-center gap-2 bg-white border border-warm-300 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-orange-500 hover:border-orange-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('btn_refresh')}
          </button>
          <button
            onClick={handleExportHtml}
            disabled={selected.length === 0 || exporting}
            className="flex items-center gap-2 bg-white border border-warm-300 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-orange-500 hover:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileDown className="w-4 h-4" />
            {t('ana_export_html')}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={selected.length === 0}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            {t('ana_export_pdf')}
          </button>
        </div>
      </div>

      {empty ? (
        <div className="bg-white rounded-xl border border-warm-300 p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{t('ana_empty')}</p>
        </div>
      ) : (
        <>
          {/* 分析对象选择器（需求 8：目标性分析） */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap border-b border-warm-300/70">
              <div className="flex items-center gap-3">
                <ListChecks className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-slate-800">{t('ana_target')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tFmt('ana_selected', { n: selected.length, total: records.length })} · {t('ana_target_desc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllTargets}
                  className="flex items-center gap-1.5 text-xs bg-warm-100 hover:bg-warm-200 text-ink-soft border border-warm-300 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> {t('ana_select_all')}
                </button>
                <button
                  onClick={selectHighRisk}
                  className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> {t('ana_select_high')}
                </button>
                <button
                  onClick={clearTargets}
                  className="text-xs text-slate-400 hover:text-orange-500 underline underline-offset-2 transition-colors"
                >
                  {t('ana_select_clear')}
                </button>
                <button
                  onClick={() => setShowTargets((v) => !v)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-orange-500 transition-colors border border-warm-300 rounded-lg px-2 py-1.5"
                >
                  {showTargets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showTargets ? t('ana_collapse') : t('ana_expand')}
                </button>
              </div>
            </div>
            {showTargets && (
              <div className="p-4 border-t border-warm-300/70 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {records.map((r) => {
                    const checked = selectedIds === null || selectedIds.has(r.id)
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                          checked ? 'bg-[#FDEEE8]/70' : 'bg-warm-100 hover:bg-warm-200/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(r.id)}
                          className="w-4 h-4 accent-orange-500 rounded shrink-0"
                        />
                        <span className="text-slate-600 font-medium">{r.id}</span>
                        <span className="text-slate-400 text-xs">{r.studentId} · {r.time}</span>
                        <span className="ml-auto"><RiskBadge level={r.risk} /></span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {selected.length === 0 ? (
            <div className="bg-white rounded-xl border border-warm-300 p-10 text-center">
              <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm mb-4">{t('ana_none_selected')}</p>
              <button
                onClick={selectAllTargets}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {t('ana_select_all')}
              </button>
            </div>
          ) : (
            <div className="flex gap-6 items-start">
              {/* 分区导航 */}
              <div className="w-40 shrink-0 sticky top-0 space-y-1">
                {SECTION_DEFS.map((s) => {
                  const Icon = s.icon
                  const active = section === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSection(s.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-[#FDEEE8] text-ink font-medium'
                          : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#E05A3C]' : ''}`} />
                      {t(s.labelKey)}
                    </button>
                  )
                })}
              </div>

              {/* 分区内容 */}
              <div className="flex-1 min-w-0 space-y-5">
                {renderSection()}
              </div>
            </div>
          )}

          {/* 免责声明 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              {t('ana_disclaimer_pre')}<b>{t('ana_disclaimer_bold')}</b>{t('ana_disclaimer_post')}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
