// 数据分析模块：基于 psyc_records 的探索性分析与关联分析
// 依据《调研-鼠标轨迹心理学研究.md》与《调研-摄像头信息心理学研究.md》落地
// 全部输出为"探索性统计/相关描述"，非诊断，默认值随平台数据积累可校准
import type { AssessmentRecord, MouseMetrics } from './records'

export interface NumSummary {
  n: number
  mean: number
  median: number
  sd: number
  min: number
  max: number
}

/** 数值列描述统计；不足 1 个有效值时返回 null */
export function summarizeNums(vals: number[]): NumSummary | null {
  const v = vals.filter((x) => x !== null && x !== undefined && !Number.isNaN(x))
  if (v.length === 0) return null
  const sorted = [...v].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, x) => s + x, 0) / n
  const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  const sd = n > 1 ? Math.sqrt(sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0
  return { n, mean, median, sd, min: sorted[0], max: sorted[n - 1] }
}

/** 皮尔逊相关；样本 < 3 或任一列方差为 0 时返回 null（非诊断，探索用） */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let sxx = 0, syy = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  if (sxx === 0 || syy === 0) return null
  return sxy / Math.sqrt(sxx * syy)
}

/** 秩次（平均结处理） */
function ranksOf(vals: number[]): number[] {
  const idx = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const ranks = new Array<number>(vals.length)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[idx[k].i] = avg
    i = j + 1
  }
  return ranks
}

/** Spearman 秩相关（非正态数据更稳健，探索用）；样本 < 3 或方差为 0 返回 null */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return null
  const x = xs.slice(0, n)
  const y = ys.slice(0, n)
  const rx = ranksOf(x)
  const ry = ranksOf(y)
  const mx = rx.reduce((s, v) => s + v, 0) / n
  const my = ry.reduce((s, v) => s + v, 0) / n
  let sxx = 0, syy = 0, sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx
    const dy = ry[i] - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  if (sxx === 0 || syy === 0) return null
  return sxy / Math.sqrt(sxx * syy)
}

/** 效应强度标签（探索参考，非显著检验）：|r| <0.1 可忽略 / <0.3 弱 / <0.5 中等 / 其余 强 */
export function effectLabelOf(r: number): string {
  const a = Math.abs(r)
  if (a < 0.1) return '可忽略'
  if (a < 0.3) return '弱'
  if (a < 0.5) return '中等'
  return '强'
}

/** 风险等级 → 数值（低0/轻1/中2/高3） */
export function riskLevelNum(risk: string): number {
  if (risk === '高风险') return 3
  if (risk === '中度风险') return 2
  if (risk === '轻度风险') return 1
  return 0
}

export const RISK_ORDER = ['低风险', '轻度风险', '中度风险', '高风险']

/** 从记录提取各量表数值分与整体风险档 */
export interface ScaleScoreRow {
  id: string
  phq9: number
  gad7: number
  pss10: number
  psqi: number
  sias6: number
  aslec: number
  risk: number
}

export function scaleScoresOf(r: AssessmentRecord): ScaleScoreRow {
  return {
    id: r.id,
    phq9: r.phq9Score ?? 0,
    gad7: r.gad7Score ?? 0,
    pss10: r.pss10Score ?? 0,
    psqi: r.psqiScore ?? 0,
    sias6: r.sias6Score ?? 0,
    aslec: r.aslecScore ?? 0,
    risk: riskLevelNum(r.risk)
  }
}

/** 从记录提取鼠标指标（缺失或 null 跳过） */
export interface MetricsRow {
  id: string
  duration: number
  points: number
  distance: number
  avgSpeed: number
  speedCV: number
  pauseCount: number
  pauseRatio: number
  initLatency: number
  xFlips: number
  yFlips: number
  curvature: number
  tremorScore: number
  flips: number
}

export function metricsRowOf(m: MouseMetrics): MetricsRow {
  return {
    id: '',
    duration: m.duration,
    points: m.points,
    distance: m.distance,
    avgSpeed: m.avgSpeed,
    speedCV: m.speedCV,
    pauseCount: m.pauseCount,
    pauseRatio: m.pauseRatio,
    initLatency: m.initLatency,
    xFlips: m.xFlips,
    yFlips: m.yFlips,
    curvature: m.curvature,
    tremorScore: m.tremorScore,
    flips: (m.xFlips ?? 0) + (m.yFlips ?? 0)
  }
}

/** 轨迹指标中文名（供表格列展示） */
export const METRIC_LABELS: Record<keyof Omit<MetricsRow, 'id'>, string> = {
  duration: '总时长(ms)',
  points: '采样点数',
  distance: '总位移(px)',
  avgSpeed: '平均速度(px/ms)',
  speedCV: '速度变异系数',
  pauseCount: '停顿次数',
  pauseRatio: '停顿占比',
  initLatency: '启动潜伏(ms)',
  xFlips: '横向反转',
  yFlips: '纵向反转',
  curvature: '弯曲度',
  tremorScore: '抖动分',
  flips: '方向反转合计'
}

export const METRIC_KEYS: (keyof Omit<MetricsRow, 'id'>)[] = [
  'duration', 'points', 'distance', 'avgSpeed', 'speedCV', 'pauseCount',
  'pauseRatio', 'initLatency', 'flips', 'curvature', 'tremorScore'
]

/** 量表分数列与名称（关联分析使用） */
export const SCALE_KEYS: { key: keyof ScaleScoreRow; label: string }[] = [
  { key: 'phq9', label: 'PHQ-9 抑郁' },
  { key: 'gad7', label: 'GAD-7 焦虑' },
  { key: 'pss10', label: 'PSS-10 压力' },
  { key: 'psqi', label: 'PSQI 睡眠' },
  { key: 'sias6', label: 'SIAS-6 社交焦虑' },
  { key: 'aslec', label: 'ASLEC 生活事件' },
  { key: 'risk', label: '整体风险档' }
]

export interface ScaleMetricCorr {
  metric: string
  metricKey: keyof Omit<MetricsRow, 'id'>
  scale: string
  scaleKey: keyof ScaleScoreRow
  rho: number | null
  n: number
  effect: string
}

export interface ScaleCorrResult {
  rows: (keyof Omit<MetricsRow, 'id'>)[]
  cols: { key: keyof ScaleScoreRow; label: string }[]
  cells: { rho: number | null; n: number; effect: string }[][]
  maxN: number
}

/** 计算并返回相关矩阵结果（纯函数，内部重新累积） */
export function computeScaleMetricCorr(records: AssessmentRecord[]): ScaleCorrResult {
  const withMetrics = records.filter((r) => r.mouseMetrics)
  const rows = METRIC_KEYS
  const cols = SCALE_KEYS
  const cells: { rho: number | null; n: number; effect: string }[][] = rows.map(() =>
    cols.map(() => ({ rho: null, n: 0, effect: '-' }))
  )
  // 预提取
  const scaleVectors = cols.map((c) => withMetrics.map((r) => (scaleScoresOf(r)[c.key] as number) || 0))
  const metricVectors = rows.map((rk) =>
    withMetrics.map((r) => {
      const m = metricsRowOf(r.mouseMetrics as MouseMetrics)
      return m[rk] as number
    })
  )
  rows.forEach((rk, ri) => {
    cols.forEach((c, ci) => {
      const xs: number[] = []
      const ys: number[] = []
      for (let i = 0; i < withMetrics.length; i++) {
        const x = metricVectors[ri][i]
        const y = scaleVectors[ci][i]
        if (x === null || x === undefined || Number.isNaN(x)) continue
        if (y === null || y === undefined || Number.isNaN(y)) continue
        xs.push(x)
        ys.push(y)
      }
      const rho = spearman(xs, ys)
      cells[ri][ci] = { rho, n: xs.length, effect: rho === null ? '-' : effectLabelOf(rho) }
    })
  })
  return { rows, cols, cells, maxN: withMetrics.length }
}

export interface SignalRiskRow {
  signal: string
  count: number
  low: number
  mild: number
  moderate: number
  high: number
  highPct: number
}

/** 行为信号 × 风险等级交叉表（每条记录了多个信号时分别计入） */
export function behaviorSignalByRisk(records: AssessmentRecord[]): SignalRiskRow[] {
  const keys: string[] = []
  records.forEach((r) => (r.behaviorSignals || []).forEach((s) => { if (!keys.includes(s)) keys.push(s) }))
  const order = ['low_effort', 'retardation', 'hesitation', 'mind_wandering', 'tremor']
  keys.sort((a, b) => order.indexOf(a) - order.indexOf(b) || a.localeCompare(b))
  return keys.map((s) => {
    const recs = records.filter((r) => (r.behaviorSignals || []).some((b) => b === s))
    const low = recs.filter((r) => r.risk === '低风险').length
    const mild = recs.filter((r) => r.risk === '轻度风险').length
    const moderate = recs.filter((r) => r.risk === '中度风险').length
    const high = recs.filter((r) => r.risk === '高风险').length
    return {
      signal: s,
      count: recs.length,
      low, mild, moderate, high,
      highPct: recs.length > 0 ? Math.round((high / recs.length) * 100) : 0
    }
  })
}

export const SIGNAL_LABELS: Record<string, string> = {
  low_effort: '低努力快速作答',
  retardation: '行动迟滞倾向',
  hesitation: '答题犹豫度偏高',
  mind_wandering: '注意力波动',
  tremor: '手部抖动偏多'
}

export interface CameraModeRow {
  mode: string
  count: number
  high: number
  highPct: number
  avgPhq9: number | null
  avgPss10: number | null
}

/** 视频信息（cameraMode）与量表/风险的关联（当前平台仅状态检测，探索性展示） */
export function cameraModeByRisk(records: AssessmentRecord[]): CameraModeRow[] {
  const modes = Array.from(new Set(records.map((r) => r.cameraMode || 'unknown')))
  return modes.map((mode) => {
    const recs = records.filter((r) => (r.cameraMode || 'unknown') === mode)
    const high = recs.filter((r) => r.risk === '高风险').length
    const phq9s = recs.map((r) => r.phq9Score ?? 0)
    const pss10s = recs.map((r) => r.pss10Score ?? 0)
    const avg = (v: number[]) => (v.length > 0 ? Number((v.reduce((s, x) => s + x, 0) / v.length).toFixed(1)) : null)
    return {
      mode,
      count: recs.length,
      high,
      highPct: recs.length > 0 ? Math.round((high / recs.length) * 100) : 0,
      avgPhq9: avg(phq9s),
      avgPss10: avg(pss10s)
    }
  })
}

export const CAMERA_MODE_LABELS: Record<string, string> = {
  normal: '摄像头可用(normal)',
  degraded: '降级(degraded)',
  unknown: '旧记录(无字段)'
}

export interface AnalysisSummary {
  total: number
  withTrajectory: number
  withMetrics: number
  withSignals: number
  riskDist: { label: string; count: number }[]
  cameraDist: { mode: string; count: number }[]
}

export function analyzeSummary(records: AssessmentRecord[]): AnalysisSummary {
  const riskDist = RISK_ORDER.map((label) => ({ label, count: records.filter((r) => r.risk === label).length }))
  const modeCounts = new Map<string, number>()
  records.forEach((r) => {
    const m = r.cameraMode || 'unknown'
    modeCounts.set(m, (modeCounts.get(m) || 0) + 1)
  })
  const cameraDist = Array.from(modeCounts.entries()).sort((a, b) => b[1] - a[1]).map(([mode, count]) => ({ mode, count }))
  return {
    total: records.length,
    withTrajectory: records.filter((r) => (r.mouseTrajectory?.length || 0) > 0).length,
    withMetrics: records.filter((r) => r.mouseMetrics).length,
    withSignals: records.filter((r) => (r.behaviorSignals?.length || 0) > 0).length,
    riskDist,
    cameraDist
  }
}