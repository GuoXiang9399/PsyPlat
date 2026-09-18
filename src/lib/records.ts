// 测评记录与量表共享定义：测评页写入、数据管理页读取，跨页面统一数据结构
import type { PsqiAnswers } from './scales'
import type { CustomScale, ScaleThreshold } from './appSettings'

export interface TrajectoryPoint {
  x: number
  y: number
  t: number
  k?: 'm' | 'c'
}

// ---- 行为动力学指标集（mouse dynamics，依据调研文档"三、落地设计"） ----
// 数值均为启发式阈值（详见调研文档四），随平台数据积累可校准
export interface MouseMetrics {
  duration: number // 总时长 ms（首点→末点）
  points: number // 采样点总数
  clicks: number // 点击数（k='c'）
  distance: number // 总位移 px（相邻点欧氏距离求和）
  avgSpeed: number // 平均速度 px/ms
  speedCV: number // 速度变异系数（相邻段速度 std/mean，0 表示无法计算）
  maxSpeed: number // 峰值速度 px/ms
  pauseCount: number // 停顿次数（相邻点间隔 > 600ms）
  pauseRatio: number // 停顿时间占比（停顿总时长 / duration）
  initLatency: number // 启动潜伏 ms（采集起点→第一次明显位移）
  xFlips: number // 横向方向反转次数
  yFlips: number // 纵向方向反转次数
  curvature: number // 弯曲度 = 实际轨迹长度 / 首尾直线距离（≥1）
  tremorScore: number // 抖动分：高频小幅度方向抖动计数
}

// 行为特征信号（规则式启发，非临床诊断）：低努力 / 迟滞 / 犹豫 / 走神 / 抖动
export type BehaviorSignal = 'low_effort' | 'retardation' | 'hesitation' | 'mind_wandering' | 'tremor'

export const BEHAVIOR_SIGNAL_LABELS: Record<BehaviorSignal, string> = {
  low_effort: '低努力快速作答（建议复核）',
  retardation: '行动迟滞倾向（需结合量表确认）',
  hesitation: '答题犹豫度偏高',
  mind_wandering: '注意力波动提示',
  tremor: '手部抖动偏多（弱信号）'
}

const PAUSE_MS = 600
const MOVE_EPS = 24 // px：低于该位移视为静止/微动

/** 依据调研结论计算鼠标轨迹行为动力学指标集；轨迹不足 3 点时返回 null */
export function computeMouseMetrics(traj: TrajectoryPoint[]): MouseMetrics | null {
  const pts = (traj || []).filter((p) => p.x >= 0 && p.y >= 0 && typeof p.t === 'number')
  if (pts.length < 3) return null
  const moves = pts.filter((p) => p.k !== 'c')
  const clicks = pts.filter((p) => p.k === 'c').length
  const t0 = pts[0].t
  const duration = Math.max(1, pts[pts.length - 1].t - t0)
  let distance = 0
  let maxSpeed = 0
  let speedSum = 0
  let speedSq = 0
  let speedN = 0
  let pauseCount = 0
  let pauseTotal = 0
  let xFlips = 0
  let yFlips = 0
  let tremorScore = 0
  let tremorRun = 0
  let prevDirX = 0
  let prevDirY = 0
  let initLatency = 0
  let hasInit = false
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const dt = Math.max(1, pts[i].t - pts[i - 1].t)
    const d = Math.sqrt(dx * dx + dy * dy)
    distance += d
    const v = d / dt
    if (v > maxSpeed) maxSpeed = v
    speedSum += v
    speedSq += v * v
    speedN++
    // 停顿：位移极小但时间间隔长 → 悬停/犹豫（2.2/2.4）
    if (d < MOVE_EPS && dt > PAUSE_MS) {
      pauseCount++
      pauseTotal += dt
    }
    // 方向反转：与上一段位移方向相反的显著移动（2.1/2.4）
    if (d > MOVE_EPS) {
      const dirX = dx >= 0 ? 1 : -1
      const dirY = dy >= 0 ? 1 : -1
      if (prevDirX !== 0 && dirX !== prevDirX) xFlips++
      if (prevDirY !== 0 && dirY !== prevDirY) yFlips++
      prevDirX = dirX
      prevDirY = dirY
      // 高频抖动：短间隔内小幅度交替方向（2.5/2.6）
      if (dt < 120 && d >= 2 && d < MOVE_EPS * 2) {
        tremorRun++
        if (tremorRun >= 3) tremorScore++
      } else {
        tremorRun = 0
      }
    } else {
      tremorRun = 0
    }
    // 启动潜伏：从起点到第一次出现 > MOVE_EPS 位移的时刻（2.2/2.3）
    if (!hasInit && d > MOVE_EPS) {
      initLatency = pts[i].t - t0
      hasInit = true
    }
  }
  const avgSpeed = speedN > 0 ? speedSum / speedN : 0
  const speedVar = speedN > 0 ? Math.max(0, speedSq / speedN - avgSpeed * avgSpeed) : 0
  const speedStd = Math.sqrt(speedVar)
  const straightDist = Math.sqrt(
    Math.pow(pts[pts.length - 1].x - pts[0].x, 2) + Math.pow(pts[pts.length - 1].y - pts[0].y, 2)
  )
  const metrics: MouseMetrics = {
    duration,
    points: pts.length,
    clicks,
    distance: Math.round(distance),
    avgSpeed: Number(avgSpeed.toFixed(4)),
    speedCV: avgSpeed > 0 ? Number((speedStd / avgSpeed).toFixed(3)) : 0,
    maxSpeed: Number(maxSpeed.toFixed(4)),
    pauseCount,
    pauseRatio: duration > 0 ? Number((pauseTotal / duration).toFixed(3)) : 0,
    initLatency,
    xFlips,
    yFlips,
    curvature: straightDist > 0 ? Number((distance / straightDist).toFixed(3)) : 1,
    tremorScore
  }
  return metrics
}

/** 依据指标判定行为特征信号（启发式规则，非诊断；详见调研文档 3.2） */
export function behaviorSignalsOf(m: MouseMetrics | null, opts?: { quickDuration?: number }): BehaviorSignal[] {
  if (!m) return []
  const signals: BehaviorSignal[] = []
  // 低努力快速作答：总时长异常短 + 点击少（2.4）
  const quick = opts?.quickDuration ?? Math.max(60000, m.duration * 0.5)
  if (m.duration < quick && m.clicks < 5 && m.pauseRatio < 0.05) signals.push('low_effort')
  // 行动迟滞：速度低 + 停顿占比高 + 启动潜伏长（2.2）
  if (m.avgSpeed > 0 && m.avgSpeed < 0.12 && m.pauseRatio > 0.35 && m.initLatency > 1500) signals.push('retardation')
  // 答题犹豫：弯曲度高 + 方向反转多 + 停顿多（2.1/2.4）
  if (m.curvature > 1.9 && (m.xFlips + m.yFlips) > 8 && m.pauseCount > 6) signals.push('hesitation')
  // 注意力波动：速度变异大 + 轨迹飘移（2.3）
  if (m.speedCV > 1.8 && m.curvature > 1.6) signals.push('mind_wandering')
  // 手部抖动：抖动分高（2.5/2.6，弱信号）
  if (m.tremorScore > 10 && (m.points - m.clicks) > 40) signals.push('tremor')
  return signals
}

export interface AssessmentRecord {
  id: string
  studentId: string
  age: string
  gender: string
  educationLevel: string
  grade: string
  major: string
  time: string
  phq9: number[] // 0-3 选项索引；-1 表示未作答
  gad7: number[]
  phq9Score: number
  gad7Score: number
  risk: string
  riskFlags: string[] // 风险标记：suicide / nssi 等
  // 第一层核心预警
  cssrs: number[] // C-SSRS 4 条筛查 0/1；-1 未作答
  cssrsPositive: number // 阳性条目数
  nssi: number[] // [是否自伤 0/1, 频率 0-4]
  // 第二层扩充画像
  pss10: number[] // 10 条 0-4
  pss10Score: number
  psqi: PsqiAnswers
  psqiComps: number[] // 7 成分 0-3
  psqiScore: number
  sias6: number[] // 6 条 0-4
  sias6Score: number
  aslec: number[] // 27 条 0-5（选项索引即影响分值）
  aslecScore: number
  aslecCount: number // 发生事件数
  status: 'completed' | 'pending_review' | 'intervened'
  mouseTrajectory: TrajectoryPoint[]
  mouseSamples: number
  cameraMode: string // normal | degraded
  // 答题过程全程录制的摄像头视频（存 IndexedDB；degraded 或管理员关闭摄像头时无）
  cameraHasVideo?: boolean
  // 自定义量表（测评设置新增）：作答快照与逐题结果，供明细/导出展示
  customScales?: CustomScale[]
  customAnswers?: Record<string, number[]>
  // 行为动力学指标与信号（依据调研三/3.4；旧版本记录无此字段）
  mouseMetrics?: MouseMetrics | null
  behaviorSignals?: BehaviorSignal[]
}

export const phq9Questions = [
  '对事物几乎没有兴趣或愉悦感',
  '感到心情低落、沮丧或绝望',
  '入睡困难、睡不安稳或睡眠过多',
  '感到疲倦或没有活力',
  '食欲不振或吃太多',
  '觉得自己很糟糕、或觉得自己很失败、或让自己或家人失望',
  '难以集中注意力',
  '动作或说话速度缓慢到别人已经察觉，或相反地，烦躁不安',
  '有不如死掉或用某种方式伤害自己的念头'
]

export const gad7Questions = [
  '感到紧张、焦虑或急切',
  '无法停止或控制担忧',
  '对各种事情担忧过多',
  '很难放松下来',
  '烦躁不安，坐立不宁',
  '容易烦恼或急躁',
  '感到好像有可怕的事要发生'
]

export const riskOptions = ['完全不会', '好几天', '一半以上天数', '几乎每天']

export const RECORDS_KEY = 'psyc_records'

export function scoreOf(answers: number[]): number {
  return answers.reduce((sum, a) => sum + (a >= 0 ? a : 0), 0)
}

const RISK_LEVELS = ['低风险', '轻度风险', '中度风险', '高风险']

function levelOf(score: number): number {
  if (score <= 4) return 0
  if (score <= 9) return 1
  if (score <= 14) return 2
  return 3
}

export function riskOf(phq9: number[], gad7: number[]): string {
  return RISK_LEVELS[Math.max(levelOf(scoreOf(phq9)), levelOf(scoreOf(gad7)))]
}

// ---------- 各量表独立风险等级（数据管理表格"每个量表单独展示风险等级"） ----------
// 四档统一：低风险 / 轻度风险 / 中度风险 / 高风险
function riskLevelOfScore(score: number, bounds: [number, string][]): string {
  for (const [max, label] of bounds) {
    if (score <= max) return label
  }
  return '高风险'
}

/** 按可调切分点评级：< mild 低 / < moderate 轻度 / < severe 中度 / ≥ severe 高 */
function riskLevelOfScoreT(score: number, thr: ScaleThreshold | undefined, fallback: (s: number) => string): string {
  if (!thr) return fallback(score)
  if (score < thr.mild) return '低风险'
  if (score < thr.moderate) return '轻度风险'
  if (score < thr.severe) return '中度风险'
  return '高风险'
}

// PHQ-9 / GAD-7（0-27 / 0-21）：0-4 低 / 5-9 轻度 / 10-14 中度 / 15+ 高
export function depRiskOf(score: number, thr?: ScaleThreshold): string {
  return riskLevelOfScoreT(score, thr, (s) => riskLevelOfScore(s, [[4, '低风险'], [9, '轻度风险'], [14, '中度风险']]))
}
export function anxRiskOf(score: number, thr?: ScaleThreshold): string {
  return depRiskOf(score, thr)
}
// C-SSRS（阳性条目数 0-4）：0 → 低风险；任一阳性 → 高风险（自杀风险）
export function cssrsRiskOf(positiveCount: number): string {
  return positiveCount > 0 ? '高风险' : '低风险'
}
// NSSI（是否自伤 0/1）：无 → 低风险；有 → 中度风险起；同记录 PHQ-9 第 9 题阳性则高风险
export function nssiRiskOf(nssi: number[], phq9Answers?: number[]): string {
  const positive = (nssi[0] ?? 0) === 1
  if (!positive) return '低风险'
  if (phq9Answers && (phq9Answers[8] ?? -1) > 0) return '高风险'
  return '中度风险'
}
// PSS-10（0-40）：0-13 低 / 14-19 轻度 / 20-26 中度 / 27+ 高
export function pss10RiskOf(score: number, thr?: ScaleThreshold): string {
  return riskLevelOfScoreT(score, thr, (s) => riskLevelOfScore(s, [[13, '低风险'], [19, '轻度风险'], [26, '中度风险']]))
}
// PSQI（0-21）：0-5 低 / 6-10 轻度 / 11-15 中度 / 16+ 高
export function psqiRiskOf(score: number, thr?: ScaleThreshold): string {
  return riskLevelOfScoreT(score, thr, (s) => riskLevelOfScore(s, [[5, '低风险'], [10, '轻度风险'], [15, '中度风险']]))
}
// SIAS-6（0-24）：0-6 低 / 7-12 轻度 / 13-18 中度 / 19+ 高
export function sias6RiskOf(score: number, thr?: ScaleThreshold): string {
  return riskLevelOfScoreT(score, thr, (s) => riskLevelOfScore(s, [[6, '低风险'], [12, '轻度风险'], [18, '中度风险']]))
}
// ASLEC（影响总分 0-135）：0-15 低 / 16-35 轻度 / 36-60 中度 / 61+ 高
export function aslecRiskOf(score: number, thr?: ScaleThreshold): string {
  return riskLevelOfScoreT(score, thr, (s) => riskLevelOfScore(s, [[15, '低风险'], [35, '轻度风险'], [60, '中度风险']]))
}

export function loadRecords(): AssessmentRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function persistRecords(records: AssessmentRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  } catch {
    // localStorage 不可用时静默降级（仅内存展示）
  }
}

export function appendRecord(record: AssessmentRecord): void {
  const all = loadRecords()
  all.push(record)
  persistRecords(all)
}

export function makeRecordId(): string {
  return 'A' + String(Date.now()).slice(-5)
}