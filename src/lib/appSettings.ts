// 测评设置：量表启用开关 / 鼠标轨迹 / 摄像头 / 自定义量表
// 管理端「测评设置」页写入，用户端测评流程读取
import type { PsqiAnswers } from './scales'

export type ScaleKey = 'phq9' | 'gad7' | 'cssrs' | 'nssi' | 'pss10' | 'psqi' | 'sias6' | 'aslec'

export interface CustomScale {
  id: string
  name: string
  items: string[]
  options: string[]
}

/** 量表风险切分点：得分 ≥ mild 为轻度、≥ moderate 为中度、≥ severe 为高风险 */
export interface ScaleThreshold {
  mild: number
  moderate: number
  severe: number
}

/** 分级筛查量表（阳性即预警，无可调切分点） */
export const BINARY_SCALES: ScaleKey[] = ['cssrs', 'nssi']

export interface AssessmentSettings {
  enabledScales: Record<ScaleKey, boolean>
  mouseTracking: boolean
  camera: boolean
  customScales: CustomScale[]
  thresholds: Partial<Record<ScaleKey, ScaleThreshold>>
  scaleMeta: Record<string, { name?: string; desc?: string }>
}

export const SCALE_DEFS: { key: ScaleKey; name: string; count: number; desc: string }[] = [
  { key: 'phq9', name: 'PHQ-9 抑郁症筛查量表', count: 9, desc: '抑郁症状频率（过去两周）' },
  { key: 'gad7', name: 'GAD-7 广泛性焦虑量表', count: 7, desc: '焦虑症状频率（过去两周）' },
  { key: 'cssrs', name: 'C-SSRS 自杀严重度评定量表', count: 4, desc: '自杀风险筛查（过去一个月）' },
  { key: 'nssi', name: 'NSSI 非自杀性自伤筛查', count: 2, desc: '自伤行为与频率（过去一年）' },
  { key: 'pss10', name: 'PSS-10 感知压力量表', count: 10, desc: '感知压力水平（过去一个月）' },
  { key: 'psqi', name: 'PSQI 匹兹堡睡眠质量指数', count: 19, desc: '睡眠质量 7 成分（过去一个月）' },
  { key: 'sias6', name: 'SIAS-6 社交焦虑简化筛查', count: 6, desc: '社交焦虑（过去两周）' },
  { key: 'aslec', name: 'ASLEC 青少年生活事件量表', count: 27, desc: '负性生活事件影响（过去一年）' },
]

/** 各量表默认切分点（与评分逻辑通行阈值一致，可在量表管理中调整） */
export const DEFAULT_THRESHOLDS: Partial<Record<ScaleKey, ScaleThreshold>> = {
  phq9: { mild: 5, moderate: 10, severe: 15 },
  gad7: { mild: 5, moderate: 10, severe: 15 },
  pss10: { mild: 14, moderate: 20, severe: 27 },
  psqi: { mild: 6, moderate: 11, severe: 16 },
  sias6: { mild: 7, moderate: 13, severe: 19 },
  aslec: { mild: 16, moderate: 36, severe: 61 },
}

/** 取量表当前阈值（未自定义时回退默认） */
export function thresholdOf(s: AssessmentSettings, key: ScaleKey): ScaleThreshold {
  return s.thresholds[key] ?? DEFAULT_THRESHOLDS[key] ?? { mild: 1, moderate: 2, severe: 3 }
}

/** 取量表显示名称（支持在「编辑」中自定义覆盖） */
export function scaleNameOf(s: AssessmentSettings, key: ScaleKey): string {
  const def = SCALE_DEFS.find((d) => d.key === key)
  return s.scaleMeta[key]?.name?.trim() || def?.name || key
}

/** 取量表显示描述 */
export function scaleDescOf(s: AssessmentSettings, key: ScaleKey): string {
  const def = SCALE_DEFS.find((d) => d.key === key)
  return s.scaleMeta[key]?.desc?.trim() || def?.desc || ''
}

export const DEFAULT_ASSESS_SETTINGS: AssessmentSettings = {
  enabledScales: {
    phq9: true, gad7: true, cssrs: true, nssi: true,
    pss10: true, psqi: true, sias6: true, aslec: true,
  },
  mouseTracking: true,
  camera: true,
  customScales: [],
  thresholds: {},
  scaleMeta: {},
}

const ASSESS_SETTINGS_KEY = 'psyc_assess_settings'

export function loadAssessSettings(): AssessmentSettings {
  try {
    const raw = localStorage.getItem(ASSESS_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_ASSESS_SETTINGS, enabledScales: { ...DEFAULT_ASSESS_SETTINGS.enabledScales } }
    const parsed = JSON.parse(raw)
    return {
      enabledScales: { ...DEFAULT_ASSESS_SETTINGS.enabledScales, ...(parsed.enabledScales || {}) },
      mouseTracking: parsed.mouseTracking !== false,
      camera: parsed.camera !== false,
      customScales: Array.isArray(parsed.customScales) ? parsed.customScales : [],
      thresholds: parsed.thresholds && typeof parsed.thresholds === 'object' ? parsed.thresholds : {},
      scaleMeta: parsed.scaleMeta && typeof parsed.scaleMeta === 'object' ? parsed.scaleMeta : {},
    }
  } catch {
    return { ...DEFAULT_ASSESS_SETTINGS, enabledScales: { ...DEFAULT_ASSESS_SETTINGS.enabledScales } }
  }
}

export function saveAssessSettings(settings: AssessmentSettings): void {
  try { localStorage.setItem(ASSESS_SETTINGS_KEY, JSON.stringify(settings)) } catch {}
}

export function makeCustomScaleId(): string {
  return 'C' + String(Date.now()).slice(-6)
}

/** 解析自定义量表表单文本：每行一条目；选项以 / 分隔 */
export function parseCustomScaleForm(name: string, itemsText: string, optionsText: string): CustomScale | null {
  const items = itemsText.split('\n').map((s) => s.trim()).filter(Boolean)
  const options = optionsText.split('/').map((s) => s.trim()).filter(Boolean)
  if (!name.trim() || items.length === 0 || options.length < 2) return null
  return { id: makeCustomScaleId(), name: name.trim(), items, options }
}

/** 解析上传的自定义量表文件：JSON（{name, options[], items[]}）或 TXT（首行选项 / 分隔，其余每行一条目） */
export function parseCustomScaleUpload(fileName: string, text: string): CustomScale | null {
  const base = fileName.replace(/\.(json|txt)$/i, '').trim() || '未命名量表'
  let name = base
  let options: string[] = []
  let items: string[] = []
  const trimmed = text.trim()
  if (/\.json$/i.test(fileName)) {
    try {
      const data = JSON.parse(trimmed)
      if (!data || typeof data !== 'object') return null
      name = String(data.name || base).trim()
      options = Array.isArray(data.options) ? data.options.map(String) : []
      items = Array.isArray(data.items) ? data.items.map(String) : []
    } catch {
      return null
    }
  } else {
    const lines = trimmed.split('\n').map((s) => s.trim()).filter(Boolean)
    if (lines.length < 2) return null
    options = lines[0].split('/').map((s) => s.trim()).filter(Boolean)
    items = lines.slice(1)
  }
  if (!name || items.length === 0 || options.length < 2) return null
  return { id: makeCustomScaleId(), name, items, options }
}

/** 全未作答的 PSQI 初始值（-1 表示未选择；测评页默认无选项） */
export function blankPsqiAnswers(): PsqiAnswers {
  return {
    bed: -1, latency: -1, wake: -1, hours: -1,
    d: new Array(10).fill(-1),
    quality: -1, meds: -1, day: -1, energy: -1,
  }
}

export function psqiFullyAnswered(a: PsqiAnswers): boolean {
  return (
    a.bed >= 0 && a.latency >= 0 && a.wake >= 0 && a.hours >= 0 &&
    a.quality >= 0 && a.meds >= 0 && a.day >= 0 && a.energy >= 0 &&
    a.d.every((v) => v >= 0)
  )
}
