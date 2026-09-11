// 测评记录与量表共享定义：测评页写入、数据管理页读取，跨页面统一数据结构
import type { PsqiAnswers } from './scales'

export interface TrajectoryPoint {
  x: number
  y: number
  t: number
  k?: 'm' | 'c' // 采样类型：m=mousemove 挪动；c=click 点击（旧记录无此字段，视为 m）
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

// PHQ-9 / GAD-7（0-27 / 0-21）：0-4 低 / 5-9 轻度 / 10-14 中度 / 15+ 高
export function depRiskOf(score: number): string {
  return riskLevelOfScore(score, [[4, '低风险'], [9, '轻度风险'], [14, '中度风险']])
}
export function anxRiskOf(score: number): string {
  return depRiskOf(score)
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
export function pss10RiskOf(score: number): string {
  return riskLevelOfScore(score, [[13, '低风险'], [19, '轻度风险'], [26, '中度风险']])
}
// PSQI（0-21）：0-5 低 / 6-10 轻度 / 11-15 中度 / 16+ 高
export function psqiRiskOf(score: number): string {
  return riskLevelOfScore(score, [[5, '低风险'], [10, '轻度风险'], [15, '中度风险']])
}
// SIAS-6（0-24）：0-6 低 / 7-12 轻度 / 13-18 中度 / 19+ 高
export function sias6RiskOf(score: number): string {
  return riskLevelOfScore(score, [[6, '低风险'], [12, '轻度风险'], [18, '中度风险']])
}
// ASLEC（影响总分 0-135）：0-15 低 / 16-35 轻度 / 36-60 中度 / 61+ 高
export function aslecRiskOf(score: number): string {
  return riskLevelOfScore(score, [[15, '低风险'], [35, '轻度风险'], [60, '中度风险']])
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