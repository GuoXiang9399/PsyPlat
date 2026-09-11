'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Users, RefreshCw, MousePointer2, Sparkles, Video, Info, AlertTriangle } from 'lucide-react'
import { loadRecords, BEHAVIOR_SIGNAL_LABELS, type AssessmentRecord } from '@/lib/records'
import {
  analyzeSummary,
  computeScaleMetricCorr,
  behaviorSignalByRisk,
  cameraModeByRisk,
  summarizeNums,
  METRIC_LABELS,
  METRIC_KEYS,
  SIGNAL_LABELS,
  CAMERA_MODE_LABELS,
  RISK_ORDER,
  metricsRowOf
} from '@/lib/analysis'

function RiskBadge({ level }: { level: string }) {
  const cls: Record<string, string> = {
    '低风险': 'bg-green-500/15 text-green-600 border border-green-500/30',
    '轻度风险': 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30',
    '中度风险': 'bg-orange-500/15 text-orange-600 border border-orange-500/30',
    '高风险': 'bg-red-500/15 text-red-500 border border-red-500/40'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[level] || 'bg-slate-100 text-slate-500'}`}>
      {level}
    </span>
  )
}

function CorrCell({ rho, n, effect }: { rho: number | null; n: number; effect: string }) {
  if (rho === null) return <span className="text-slate-300">–</span>
  const strength = Math.abs(rho)
  const color = strength < 0.1 ? 'text-slate-400' : strength < 0.3 ? 'text-slate-500' : strength < 0.5 ? 'text-orange-600 font-medium' : 'text-red-500 font-bold'
  const sign = rho >= 0 ? '+' : ''
  return (
    <div className={`${color} text-sm`}>
      {sign}{rho.toFixed(2)}
      <div className="text-[10px] text-slate-400 font-normal">{effect}·n={n}</div>
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
            {METRIC_LABELS[rk]}
          </text>
        ))}
        {/* 列标签（量表） */}
        {cols.map((c, ci) => {
          const label = c.label.length > 6 ? c.label.slice(0, 6) + '…' : c.label
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
        <span>负相关</span>
        <svg width="90" height="10"><defs><linearGradient id="corr-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(37,99,235,.85)" />
          <stop offset="50%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="rgba(217,119,6,.85)" />
        </linearGradient></defs><rect width="90" height="10" fill="url(#corr-grad)" rx="3" /></svg>
        <span>正相关</span>
        <span className="ml-auto">灰 = 样本不足或无相关，– = 无法计算</span>
      </div>
    </div>
  )
}

/** 堆叠柱状图：行为信号 × 风险等级 */
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
            <circle cx={xOf(r.mean, r.min, r.max)} cy={y} r={3.5} fill="#A8905F" />
            <circle cx={xOf(r.median, r.min, r.max)} cy={y} r={3.5} fill="#dc2626" />
            <text x={Math.min(x1 + 6, W - 4)} y={y + 4} fontSize="9.5" className="fill-slate-400">{r.min.toFixed(0)}–{r.max.toFixed(0)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function AnalysisContent() {
  const [refreshTick, setRefreshTick] = useState(0)
  const records = useMemo<AssessmentRecord[]>(() => loadRecords(), [refreshTick])

  const summary = useMemo(() => analyzeSummary(records), [records])
  const corr = useMemo(() => computeScaleMetricCorr(records), [records])
  const signals = useMemo(() => behaviorSignalByRisk(records), [records])
  const camera = useMemo(() => cameraModeByRisk(records), [records])

  // 轨迹指标描述统计（基于有 mouseMetrics 的记录）
  const metricSummaries = useMemo(() => {
    const withMetrics = records.filter((r) => r.mouseMetrics)
    return METRIC_KEYS.map((key) => {
      const rowVals = withMetrics
        .map((r) => metricsRowOf(r.mouseMetrics!)[key] as number)
        .filter((v) => v !== undefined && v !== null && !Number.isNaN(v))
      return { key, label: METRIC_LABELS[key], sum: summarizeNums(rowVals) }
    })
  }, [records])

  const empty = records.length === 0

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            数据分析（探索性分析）
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            对测评记录中的量表分数、鼠标轨迹行为指标与视频采集状态做描述统计与关联探索——仅供心理站工作人员参考，
            属启发式分析，不构成任何临床诊断。
          </p>
        </div>
        <button
          onClick={() => setRefreshTick(t => t + 1)}
          className="flex items-center gap-2 bg-white border border-warm-300 rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-orange-500 hover:border-orange-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新数据
        </button>
      </div>

      {empty ? (
        <div className="bg-white rounded-xl border border-warm-300 p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">暂无测评记录。完成至少一份心理测评后，即可在此查看探索性分析。</p>
        </div>
      ) : (
        <>
          {/* 样本概况 */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard icon={<Users className="w-4 h-4" />} label="测评记录总数" value={summary.total} />
            <StatCard icon={<MousePointer2 className="w-4 h-4" />} label="含鼠标轨迹" value={summary.withTrajectory} sub={`${summary.total > 0 ? Math.round(summary.withTrajectory / summary.total * 100) : 0}%`} />
            <StatCard icon={<Sparkles className="w-4 h-4" />} label="含行为指标" value={summary.withMetrics} sub={`${summary.total > 0 ? Math.round(summary.withMetrics / summary.total * 100) : 0}%`} />
            <StatCard icon={<Video className="w-4 h-4" />} label="摄像头可用(normal)" value={summary.cameraDist.find(c => c.mode === 'normal')?.count ?? 0} />
            <StatCard icon={<Video className="w-4 h-4" />} label="摄像头降级(degraded)" value={summary.cameraDist.find(c => c.mode === 'degraded')?.count ?? 0} />
            <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="高风险记录" value={summary.riskDist.find(r => r.label === '高风险')?.count ?? 0} />
          </div>

          {/* 样本概况图：风险分布 + 摄像头状态 */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 border-b border-warm-300">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                样本构成（分析图）
              </h3>
              <p className="text-xs text-slate-400 mt-1">风险等级与摄像头采集状态在全部记录中的占比分布。</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  items={summary.riskDist
                    .filter((r) => r.count > 0)
                    .map((r) => ({ label: r.label, value: r.count, color: RISK_COLORS[r.label] || '#94a3b8' }))}
                  centerValue={summary.total}
                  centerLabel="记录总数"
                />
                <LegendRow items={summary.riskDist.filter((r) => r.count > 0).map((r) => ({ label: r.label, color: RISK_COLORS[r.label] || '#94a3b8', value: r.count }))} />
              </div>
              <div className="flex flex-col items-center gap-3">
                <DonutChart
                  items={summary.cameraDist.map((c) => ({
                    label: CAMERA_MODE_LABELS[c.mode] || c.mode,
                    value: c.count,
                    color: c.mode === 'normal' ? '#16a34a' : c.mode === 'degraded' ? '#ea580c' : '#94a3b8'
                  }))}
                  centerValue={summary.total}
                  centerLabel="记录总数"
                />
                <LegendRow items={summary.cameraDist.map((c) => ({ label: CAMERA_MODE_LABELS[c.mode] || c.mode, color: c.mode === 'normal' ? '#16a34a' : c.mode === 'degraded' ? '#ea580c' : '#94a3b8', value: c.count }))} />
              </div>
            </div>
          </div>

          {/* 量表 × 鼠标轨迹 相关矩阵 */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 border-b border-warm-300">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                量表分数 × 鼠标轨迹指标（Spearman 相关）
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                探索性相关，样本 n 显示在各格；方向为正号表示指标随分数同向变化。相关≠因果，不作显著性检验。
                {corr.maxN < 5 && (
                  <span className="text-amber-600 ml-1">样本不足 5 条时相关不稳定，仅供直观参考。</span>
                )}
              </p>
            </div>
            <div className="p-5 border-b border-warm-300/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">分析图 · Spearman 相关热力图</span>
              </div>
              <CorrHeatmap rows={corr.rows} cols={corr.cols} cells={corr.cells} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-300">
                    <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">轨迹指标</th>
                    {corr.cols.map(c => (
                      <th key={c.key as string} className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corr.rows.map((rk, ri) => (
                    <tr key={rk} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                      <td className="p-3 text-slate-600 text-sm whitespace-nowrap font-medium">{METRIC_LABELS[rk]}</td>
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

          {/* 行为信号 × 风险等级 */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 border-b border-warm-300">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                行为信号 × 风险等级交叉
              </h3>
              <p className="text-xs text-slate-400 mt-1">命中各行为信号（鼠标轨迹启发式规则）的记录在四档风险中的分布；同一记录可命中多个信号。</p>
            </div>
            {signals.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">暂无命中行为信号的记录。</p>
            ) : (
              <>
              <div className="p-5 border-b border-warm-300/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">分析图 · 各信号记录的风险等级堆叠分布</span>
                  <LegendRow items={RISK_ORDER.map((r) => ({ label: r, color: RISK_COLORS[r] || '#94a3b8' }))} />
                </div>
                <StackedBars
                  rows={signals.map((s) => ({
                    label: SIGNAL_LABELS[s.signal] || s.signal,
                    parts: [s.low, s.mild, s.moderate, s.high],
                    total: s.count
                  }))}
                  parts={RISK_ORDER.map((r) => ({ label: r, color: RISK_COLORS[r] || '#94a3b8' }))}
                />
</div>
            <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-warm-300">
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">行为信号</th>
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">记录数</th>
                      {RISK_ORDER.map(r => <th key={r} className="text-left p-3 text-slate-400 text-sm font-medium">{r}</th>)}
                      <th className="text-left p-3 text-slate-400 text-sm font-medium">高风险占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map(s => (
                      <tr key={s.signal} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                        <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{(SIGNAL_LABELS[s.signal] || BEHAVIOR_SIGNAL_LABELS[s.signal as keyof typeof BEHAVIOR_SIGNAL_LABELS] || s.signal)}</td>
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

          {/* 视频采集状态 × 量表/风险 */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 border-b border-warm-300">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Video className="w-5 h-5 text-orange-500" />
                视频采集状态 × 量表分数
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                当前平台摄像头仅做可用性检测（normal / degraded），未存储视频帧；该交叉表展示不同采集状态下量表分数的概况，
                用于排查采集环境（如降级样本是否系统性地伴随特定作答模式）。
              </p>
            </div>
            <div className="p-5 border-b border-warm-300/60">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">分析图 · 各采集状态下平均量表分数（柱高按量表满分归一）</span>
                <LegendRow items={[
                  { label: '平均 PHQ-9（满分 27）', color: '#A8905F' },
                  { label: '平均 PSS-10（满分 50）', color: '#ea580c' }
                ]} />
              </div>
              <GroupBars
                groups={camera.map((row) => ({
                  label: CAMERA_MODE_LABELS[row.mode]?.replace(/\s*\(.*\)/, '') || row.mode,
                  values: [row.avgPhq9, row.avgPss10]
                }))}
                series={[
                  { label: '平均 PHQ-9', color: '#A8905F', max: 27 },
                  { label: '平均 PSS-10', color: '#ea580c', max: 50 }
                ]}
              />
              <p className="text-[11px] text-slate-400 mt-2">纵轴为占量表满分的百分比（便于在同一图上比较）；柱顶标注为实际平均分。</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-300">
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">采集状态</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">记录数</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">高风险数</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">高风险占比</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">平均 PHQ-9</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">平均 PSS-10</th>
                  </tr>
                </thead>
                <tbody>
                  {camera.map(row => (
                    <tr key={row.mode} className="border-b border-warm-300/60 hover:bg-warm-200/40">
                      <td className="p-3 text-slate-600 text-sm whitespace-nowrap">{CAMERA_MODE_LABELS[row.mode] || row.mode}</td>
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
              视频行为信号（面部动作单元、表情贫乏度、注视等）的采集建议与心理学依据详见《调研-摄像头信息心理学研究.md》，
              当前版本尚未落库帧级指标，待阶段化增强后此卡将扩展为帧级特征关联分析。
            </div>
          </div>

          {/* 轨迹指标分布 */}
          <div className="bg-white rounded-xl border border-warm-300">
            <div className="px-5 py-4 border-b border-warm-300">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MousePointer2 className="w-5 h-5 text-orange-500" />
                鼠标轨迹指标分布（描述统计）
              </h3>
              <p className="text-xs text-slate-400 mt-1">基于全部含行为指标记录；均值/中位数/标准差/最小/最大，用于观察批次分布与异常作答。</p>
            </div>
            <div className="p-5 border-b border-warm-300/60">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">分析图 · 各指标数值范围与均值/中位数（各指标独立标尺）</span>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#A8905F' }} />均值</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#dc2626' }} />中位数</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3.5 h-1 rounded" style={{ background: '#cbd5e1' }} />最小–最大</span>
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
                <p className="text-sm text-slate-400">当前样本各指标取值全相同（或暂无可分析的记录），暂时无法绘制范围图。</p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-300">
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">指标</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">n</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">均值</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">中位数</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">标准差</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">最小</th>
                    <th className="text-left p-3 text-slate-400 text-sm font-medium">最大</th>
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

          {/* 免责声明 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-700 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              本页面所有统计与相关均为<b>探索性分析</b>，样本量小、存在个体差异与情境噪声，不构成心理健康评估结论；
              相关关系不代表因果关系。请结合原始测评记录与量表结果综合判断，重要结论需专业人员复核。
            </div>
          </div>
        </>
      )}
    </div>
  )
}