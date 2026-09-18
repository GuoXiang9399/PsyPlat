// 报告导出（需求 8/9）：数据管理「行级明细报告」与数据分析「批次分析报告」
// 生成自包含 HTML（内联样式 + 内联 SVG），可直接本地查阅，或经浏览器打印为 PDF
import type { AssessmentRecord, BehaviorSignal, MouseMetrics, TrajectoryPoint } from './records'
import {
  phq9Questions,
  gad7Questions,
  riskOptions,
  depRiskOf,
  anxRiskOf,
  cssrsRiskOf,
  nssiRiskOf,
  pss10RiskOf,
  psqiRiskOf,
  sias6RiskOf,
  aslecRiskOf,
  BEHAVIOR_SIGNAL_LABELS,
} from './records'
import {
  cssrsQuestions,
  cssrsOptions,
  nssiQuestions,
  nssiHasOptions,
  nssiFreqOptions,
  pss10Questions,
  pss10Options,
  PSS10_REVERSED,
  psqiDisturbanceItems,
  psqiFreqOptions,
  psqiQualityOptions,
  psqiComponentNames,
  psqiLevelOf,
  pss10LevelOf,
  sias6Questions,
  sias6Options,
  aslecItems,
  aslecImpactOptions,
} from './scales'
import { downloadBlob } from './videoStore'
import { loadAssessSettings } from './appSettings'
import {
  analyzeSummary,
  behaviorSignalByRisk,
  cameraModeByRisk,
  computeScaleMetricCorr,
  metricsRowOf,
  summarizeNums,
  CAMERA_MODE_LABELS,
  METRIC_KEYS,
  METRIC_LABELS,
  RISK_ORDER,
  SIGNAL_LABELS,
} from './analysis'

export function maskStudentId(id: string): string {
  if (!id || id.length <= 4) return '****'
  return id.slice(0, 2) + '****' + id.slice(-2)
}

const STATUS_TEXT: Record<string, string> = {
  completed: '已完成',
  pending_review: '待审核',
  intervened: '已干预',
}

const RISK_BADGE_STYLE: Record<string, string> = {
  低风险: 'background:#E7F6EC;color:#15803D',
  轻度风险: 'background:#FEF7DC;color:#A16207',
  中度风险: 'background:#FDEEDD;color:#C2410C',
  高风险: 'background:#FDE5E3;color:#DC2626',
}

const RISK_COLORS: Record<string, string> = {
  低风险: '#16a34a',
  轻度风险: '#ca8a04',
  中度风险: '#ea580c',
  高风险: '#dc2626',
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function riskBadge(risk: string): string {
  const style = RISK_BADGE_STYLE[risk] || 'background:#F1EFE9;color:#8A8178'
  return `<span class="badge" style="${style}">${esc(risk)}</span>`
}

function dateStamp(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function dateTimeStamp(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dateStamp()} ${hh}:${mi}`
}

/** 各量表定义（分值 / 满分 / 独立风险），报告与分析页共用 */
export interface ReportScaleDef {
  key: string
  label: string
  full: string
  max: number
  score: (r: AssessmentRecord) => number
  risk: (r: AssessmentRecord) => string
  hasData: (r: AssessmentRecord) => boolean
  valueText?: (r: AssessmentRecord) => string
}

// 风险切分点读取「测评设置 → 量表管理」中的自定义阈值（生成报告时按需加载一次）
let thrCache: ReturnType<typeof loadAssessSettings>['thresholds'] | null = null
function thrOf(key: string) {
  if (!thrCache) thrCache = loadAssessSettings().thresholds
  return thrCache[key as 'phq9' | 'gad7' | 'pss10' | 'psqi' | 'sias6' | 'aslec']
}

export const REPORT_SCALE_DEFS: ReportScaleDef[] = [
  { key: 'phq9', label: 'PHQ-9', full: 'PHQ-9 抑郁症筛查量表', max: 27, score: (r) => r.phq9Score ?? 0, risk: (r) => depRiskOf(r.phq9Score ?? 0, thrOf('phq9')), hasData: () => true },
  { key: 'gad7', label: 'GAD-7', full: 'GAD-7 广泛性焦虑量表', max: 21, score: (r) => r.gad7Score ?? 0, risk: (r) => anxRiskOf(r.gad7Score ?? 0, thrOf('gad7')), hasData: () => true },
  { key: 'cssrs', label: 'C-SSRS', full: 'C-SSRS 自杀严重度评定量表', max: 4, score: (r) => r.cssrsPositive ?? 0, risk: (r) => cssrsRiskOf(r.cssrsPositive ?? 0), hasData: (r) => (r.cssrs ?? []).length > 0 },
  { key: 'nssi', label: 'NSSI', full: 'NSSI 非自杀性自伤筛查', max: 1, score: (r) => (r.nssi ?? [])[0] ?? 0, risk: (r) => nssiRiskOf(r.nssi ?? [], r.phq9), hasData: (r) => (r.nssi ?? []).length > 0, valueText: (r) => ((r.nssi ?? [])[0] ?? -1) === 1 ? '自伤行为阳性' : '无自伤行为' },
  { key: 'pss10', label: 'PSS-10', full: 'PSS-10 感知压力量表', max: 40, score: (r) => r.pss10Score ?? 0, risk: (r) => pss10RiskOf(r.pss10Score ?? 0, thrOf('pss10')), hasData: (r) => (r.pss10 ?? []).length > 0 },
  { key: 'psqi', label: 'PSQI', full: 'PSQI 匹兹堡睡眠质量指数', max: 21, score: (r) => r.psqiScore ?? 0, risk: (r) => psqiRiskOf(r.psqiScore ?? 0, thrOf('psqi')), hasData: (r) => Boolean(r.psqi) },
  { key: 'sias6', label: 'SIAS-6', full: 'SIAS-6 社交焦虑简化筛查', max: 24, score: (r) => r.sias6Score ?? 0, risk: (r) => sias6RiskOf(r.sias6Score ?? 0, thrOf('sias6')), hasData: (r) => (r.sias6 ?? []).length > 0 },
  { key: 'aslec', label: 'ASLEC', full: 'ASLEC 青少年生活事件量表', max: 135, score: (r) => r.aslecScore ?? 0, risk: (r) => aslecRiskOf(r.aslecScore ?? 0, thrOf('aslec')), hasData: (r) => (r.aslec ?? []).length > 0 },
]

/* ================= 通用 HTML 片段 ================= */

function kvGrid(pairs: [string, string][]): string {
  return `<div class="kv-grid">${pairs
    .map(([k, v]) => `<div class="kv">${esc(k)}<b>${v}</b></div>`)
    .join('')}</div>`
}

function itemsTable(
  questions: string[],
  answers: number[] | undefined,
  options: string[],
  opts?: { tag?: (i: number) => string }
): string {
  const rows = questions
    .map((q, i) => {
      const ans = (answers ?? [])[i]
      const answered = typeof ans === 'number' && ans >= 0
      const tag = opts?.tag ? opts.tag(i) : ''
      return `<tr><td class="num">${i + 1}</td><td>${esc(q)}${tag}</td><td>${
        answered ? esc(options[ans] ?? '-') : '<span class="muted">未作答</span>'
      }</td><td class="num">${answered ? ans : '—'}</td></tr>`
    })
    .join('')
  return `<table><thead><tr><th class="num" style="width:36px">#</th><th>条目</th><th style="width:120px">作答</th><th class="num" style="width:52px">数值</th></tr></thead><tbody>${rows}</tbody></table>`
}

function section(title: string, sub: string, body: string): string {
  return `<div class="section"><h2>${esc(title)}${
    sub ? `<span class="sub">${sub}</span>` : ''
  }</h2><div class="body">${body}</div></div>`
}

const REVERSED_TAG = ' <span class="tag">反向计分</span>'

function nssiBlock(r: AssessmentRecord): string {
  const n = r.nssi ?? []
  if (n.length === 0) return '<p class="muted">该记录未采集 NSSI 数据。</p>'
  const cell = (v: number, opts: string[]) =>
    v >= 0 ? esc(opts[v] ?? '-') : '<span class="muted">未作答</span>'
  return `<table><thead><tr><th class="num" style="width:36px">#</th><th>条目</th><th style="width:140px">作答</th><th class="num" style="width:52px">数值</th></tr></thead><tbody>
<tr><td class="num">1</td><td>${esc(nssiQuestions[0])}</td><td>${cell(n[0], nssiHasOptions)}</td><td class="num">${n[0] >= 0 ? n[0] : '—'}</td></tr>
<tr><td class="num">2</td><td>${esc(nssiQuestions[1])}</td><td>${cell(n[1], nssiFreqOptions)}</td><td class="num">${n[1] >= 0 ? n[1] : '—'}</td></tr>
</tbody></table>`
}

function psqiBlock(r: AssessmentRecord): string {
  if (!r.psqi) return '<p class="muted">该记录未采集 PSQI 数据。</p>'
  const p = r.psqi
  const opt = (v: number, opts: string[]) => (v >= 0 ? esc(opts[v] ?? '-') : '<span class="muted">未作答</span>')
  const kv = kvGrid([
    ['就寝时刻', p.bed >= 0 ? `${p.bed}:00` : '未作答'],
    ['起床时刻', p.wake >= 0 ? `${p.wake}:00` : '未作答'],
    ['入睡耗时', p.latency >= 0 ? `${p.latency} 分钟` : '未作答'],
    ['实际睡眠时长', p.hours >= 0 ? `${p.hours} 小时` : '未作答'],
    ['总体睡眠质量', opt(p.quality, psqiQualityOptions)],
    ['催眠药物使用', opt(p.meds, psqiFreqOptions)],
    ['白天清醒困难', opt(p.day, psqiFreqOptions)],
    ['白天精力不足', opt(p.energy, psqiFreqOptions)],
  ])
  const comps = (r.psqiComps ?? []).length
    ? `<div class="chips" style="margin-top:12px">${(r.psqiComps ?? [])
        .map((c, i) => `<span class="chip">${esc(psqiComponentNames[i] ?? String(i + 1))}：<b>${c}</b></span>`)
        .join('')}</div>`
    : ''
  const total = `<p class="note">PSQI 总分：<b>${r.psqiScore ?? 0}</b> / 21 · ${psqiLevelOf(r.psqiScore ?? 0)}</p>`
  const dist = `<table style="margin-top:12px"><thead><tr><th class="num" style="width:36px">#</th><th>睡眠障碍条目（过去一个月）</th><th style="width:140px">频率</th><th class="num" style="width:52px">数值</th></tr></thead><tbody>${psqiDisturbanceItems
    .map(
      (item, i) =>
        `<tr><td class="num">${i + 1}</td><td>${esc(item)}</td><td>${opt(p.d[i] ?? -1, psqiFreqOptions)}</td><td class="num">${
          (p.d[i] ?? -1) >= 0 ? p.d[i] : '—'
        }</td></tr>`
    )
    .join('')}</tbody></table>`
  return kv + comps + total + dist
}

const METRIC_ROWS: { label: string; value: (m: MouseMetrics) => string }[] = [
  { label: '总时长', value: (m) => (m.duration / 1000).toFixed(1) + ' s' },
  { label: '采样点数', value: (m) => String(m.points) },
  { label: '点击数', value: (m) => String(m.clicks) },
  { label: '总位移', value: (m) => Math.round(m.distance) + ' px' },
  { label: '平均速度', value: (m) => m.avgSpeed.toFixed(4) + ' px/ms' },
  { label: '速度变异系数', value: (m) => m.speedCV.toFixed(3) },
  { label: '峰值速度', value: (m) => m.maxSpeed.toFixed(4) + ' px/ms' },
  { label: '停顿次数', value: (m) => String(m.pauseCount) },
  { label: '停顿时间占比', value: (m) => (m.pauseRatio * 100).toFixed(1) + ' %' },
  { label: '启动潜伏', value: (m) => m.initLatency + ' ms' },
  { label: '方向反转（横/纵）', value: (m) => `${m.xFlips} / ${m.yFlips}` },
  { label: '弯曲度', value: (m) => m.curvature.toFixed(2) },
  { label: '抖动分', value: (m) => String(m.tremorScore) },
]

function metricsTable(m: MouseMetrics): string {
  return `<table><tbody>${METRIC_ROWS.map(
    (row) => `<tr><td style="width:170px">${row.label}</td><td class="num"><b>${row.value(m)}</b></td></tr>`
  ).join('')}</tbody></table>`
}

function signalChips(signals: BehaviorSignal[] | undefined): string {
  const list = signals ?? []
  if (list.length === 0) return '<p class="muted" style="margin-top:10px">未见明显异常信号。</p>'
  return `<div class="chips" style="margin-top:10px">${list
    .map((s) => `<span class="chip">${esc(BEHAVIOR_SIGNAL_LABELS[s] ?? s)}</span>`)
    .join('')}</div>`
}

function trajSvg(traj: TrajectoryPoint[]): string {
  if (!traj || traj.length === 0) return '<p class="muted">未采集到鼠标轨迹样本。</p>'
  const W = 640
  const H = 240
  const pad = 24
  const xs = traj.map((p) => p.x)
  const ys = traj.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const px = (x: number) => pad + ((x - minX) / spanX) * (W - pad * 2)
  const py = (y: number) => pad + ((y - minY) / spanY) * (H - pad * 2)
  const polyline = traj.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
  const dots = traj
    .map((p, i) => {
      const edge = i === 0 || i === traj.length - 1
      if (p.k === 'c') return `<rect x="${px(p.x) - 3}" y="${py(p.y) - 3}" width="6" height="6" fill="#D54941"/>`
      return `<circle cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="${edge ? 3.2 : 1.4}" fill="${edge ? '#A83C24' : '#E05A3C'}"/>`
    })
    .join('')
  const first = traj[0]
  const last = traj[traj.length - 1]
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:#F7F6F4;border-radius:8px">
<polyline points="${polyline}" fill="none" stroke="#E05A3C" stroke-width="1.6" stroke-linejoin="round"/>
${dots}
<text x="${px(first.x).toFixed(1)}" y="${(py(first.y) - 8).toFixed(1)}" font-size="10" fill="#A83C24">起点</text>
<text x="${px(last.x).toFixed(1)}" y="${(py(last.y) + 14).toFixed(1)}" font-size="10" fill="#A83C24">终点 ${last.t}ms</text>
</svg>`
}

/* ================= 单份记录明细报告（需求 9） ================= */

function basicInfoRows(r: AssessmentRecord, privacy: boolean): [string, string][] {
  return [
    ['记录编号', esc(r.id)],
    ['学号', esc(privacy ? maskStudentId(r.studentId) : r.studentId)],
    ['测评时间', esc(r.time)],
    ['学习层次', esc(r.educationLevel || '—')],
    ['年级', esc(r.grade || '—')],
    ['专业', esc(privacy ? '已隐藏' : r.major || '—')],
    ['年龄', esc(privacy ? '已隐藏' : r.age || '—')],
    ['性别', r.gender === 'male' ? '男' : r.gender === 'female' ? '女' : '其他'],
    ['记录状态', esc(STATUS_TEXT[r.status] ?? r.status)],
    ['整体风险', riskBadge(r.risk)],
  ]
}

function scaleScoreTable(r: AssessmentRecord): string {
  const rows = REPORT_SCALE_DEFS.map((d) => {
    const has = d.hasData(r)
    const value = !has ? '—' : d.valueText ? esc(d.valueText(r)) : `${d.score(r)} / ${d.max}`
    const risk = has ? d.risk(r) : '未采集'
    return `<tr><td>${esc(d.full)}</td><td class="num">${value}</td><td>${riskBadge(risk)}</td></tr>`
  }).join('')
  return `<table><thead><tr><th>量表</th><th style="width:130px">得分</th><th style="width:110px">风险等级</th></tr></thead><tbody>${rows}</tbody></table>`
}

function customScalesSections(r: AssessmentRecord): string {
  const scales = r.customScales ?? []
  if (scales.length === 0) return ''
  const answersMap = r.customAnswers ?? {}
  return scales
    .map((s) => section(`自定义量表 · ${s.name}`, `${s.items.length} 条`, itemsTable(s.items, answersMap[s.id], s.options)))
    .join('')
}

function behaviorBlock(r: AssessmentRecord): string {
  const m = r.mouseMetrics ?? null
  if (!m) return '<p class="muted">该记录无行为指标数据（旧版本记录或轨迹样本不足）。</p>'
  const traj =
    r.mouseTrajectory && r.mouseTrajectory.length > 0
      ? `<div style="margin-top:14px">${trajSvg(r.mouseTrajectory)}</div>
<p class="note">采样点 ${r.mouseTrajectory.length} 个；红色方块为点击点。鼠标行为在答题过程中全量采集，不涉及键盘输入内容。</p>`
      : ''
  return (
    metricsTable(m) +
    signalChips(r.behaviorSignals) +
    traj +
    `<p class="note">行为动力学特征依据鼠标运动学研究（轨迹弯曲、速度剖面、方向反转、停顿）的启发式规则解读，仅供筛查参考，不代表临床诊断；请结合量表结果综合评估。</p>`
  )
}

function cameraBlock(r: AssessmentRecord): string {
  const mode =
    r.cameraMode === 'normal'
      ? '正常（已获授权，答题过程已录制）'
      : r.cameraMode === 'degraded'
        ? '不可用（用户未授权或设备/浏览器不支持）'
        : esc(r.cameraMode)
  return kvGrid([
    ['采集状态', mode],
    ['视频记录', r.cameraHasVideo ? '已保存（可在数据管理中导出 .webm）' : '无视频'],
    ['鼠标采样点数', String(r.mouseSamples ?? (r.mouseTrajectory?.length ?? 0))],
  ])
}

export function buildRecordReportHtml(record: AssessmentRecord, opts: { privacy: boolean }): string {
  const r = record
  const head = `<div class="head">
<h1>测评记录报告</h1>
<div class="meta">
<span>记录编号：<b>${esc(r.id)}</b></span>
<span>测评时间：<b>${esc(r.time)}</b></span>
<span>整体风险：${riskBadge(r.risk)}</span>
<span>报告形式：<b>${opts.privacy ? '隐私化（已脱敏学号与个人信息）' : '未隐私化（含完整信息，请妥善保管）'}</b></span>
<span>生成时间：<b>${dateTimeStamp()}</b></span>
</div>
</div>`

  const body = [
    section('基本信息', '', kvGrid(basicInfoRows(r, opts.privacy))),
    section('量表得分与风险等级', '', scaleScoreTable(r)),
    section('PHQ-9 抑郁症筛查量表', `总分 ${r.phq9Score ?? 0} / 27 · ${depRiskOf(r.phq9Score ?? 0)}`, itemsTable(phq9Questions, r.phq9, riskOptions)),
    section('GAD-7 广泛性焦虑量表', `总分 ${r.gad7Score ?? 0} / 21 · ${anxRiskOf(r.gad7Score ?? 0)}`, itemsTable(gad7Questions, r.gad7, riskOptions)),
    section('第一层 · 核心预警：C-SSRS 自杀严重度评定量表（筛查版）', `阳性条目 ${r.cssrsPositive ?? 0} / 4`, itemsTable(cssrsQuestions, r.cssrs, cssrsOptions)),
    section('第一层 · 核心预警：NSSI 非自杀性自伤筛查', (r.nssi ?? [])[0] === 1 ? '自伤行为阳性' : '无自伤行为', nssiBlock(r)),
    section('第二层 · 扩充画像：PSS-10 感知压力量表', `总分 ${r.pss10Score ?? 0} / 40 · ${pss10LevelOf(r.pss10Score ?? 0)}`, itemsTable(pss10Questions, r.pss10, pss10Options, { tag: (i) => (PSS10_REVERSED.includes(i) ? REVERSED_TAG : '') })),
    section('第二层 · 扩充画像：PSQI 匹兹堡睡眠质量指数', `总分 ${r.psqiScore ?? 0} / 21 · ${psqiLevelOf(r.psqiScore ?? 0)}`, psqiBlock(r)),
    section('第二层 · 扩充画像：SIAS-6 社交焦虑简化筛查', `总分 ${r.sias6Score ?? 0} / 24`, itemsTable(sias6Questions, r.sias6, sias6Options)),
    section('第二层 · 扩充画像：ASLEC 青少年生活事件量表', `发生 ${r.aslecCount ?? 0} 件 · 影响总分 ${r.aslecScore ?? 0}`, itemsTable(aslecItems, r.aslec, aslecImpactOptions)),
    customScalesSections(r),
    section('鼠标行为数据', '行为动力学特征与轨迹', behaviorBlock(r)),
    section('摄像头采集', '', cameraBlock(r)),
  ].join('')

  const foot = `<div class="foot">本报告由迹心心理测评服务平台自动生成，量表结果为筛查参考而非临床诊断；行为指标为启发式规则的探索性解读。${
    opts.privacy ? '本报告为隐私化版本，已脱敏学号、年龄与专业等个人信息。' : '本报告为未隐私化版本，包含学号等个人信息，请妥善保管。'
  }请结合专业访谈与原始记录综合判断，重要结论需专业人员复核。</div>`

  return wrapHtml(`测评报告_${r.id}_${dateStamp()}`, head + body + foot)
}

/* ================= 批次分析报告（需求 8） ================= */

function donutHtml(items: { label: string; value: number; color: string }[], centerValue: string | number, centerLabel: string): string {
  const size = 180
  const th = 26
  const rr = (size - th) / 2
  const circ = 2 * Math.PI * rr
  const total = items.reduce((s, x) => s + x.value, 0)
  let acc = 0
  const segs = items
    .filter((it) => it.value > 0 && total > 0)
    .map((it) => {
      const frac = it.value / total
      const dash = Math.max(frac * circ - 2, 0.5)
      const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="${it.color}" stroke-width="${th}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${(-acc * circ).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`
      acc += frac
      return seg
    })
    .join('')
  const legend = items
    .map((it) => `<span class="lg"><i style="background:${it.color}"></i>${esc(it.label)} <b>${it.value}</b></span>`)
    .join('')
  return `<div class="donut-wrap"><svg viewBox="0 0 ${size} ${size}" style="width:180px;height:180px">
<circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="#F1EFE9" stroke-width="${th}"/>
${segs}
<text x="50%" y="47%" text-anchor="middle" font-size="26" font-weight="700" fill="#3E3A36">${centerValue}</text>
<text x="50%" y="62%" text-anchor="middle" font-size="11" fill="#8A8178">${esc(centerLabel)}</text>
</svg><div class="legend">${legend}</div></div>`
}

function statCard(l: string, v: string | number, s?: string): string {
  return `<div class="stat"><div class="l">${esc(l)}</div><div class="v">${v}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`
}

function scaleDistBlock(records: AssessmentRecord[]): string {
  const rows = REPORT_SCALE_DEFS.map((d) => {
    const counts = RISK_ORDER.map((lv) => records.filter((r) => d.hasData(r) && d.risk(r) === lv).length)
    const scores = records.filter((r) => d.hasData(r)).map((r) => d.score(r))
    return { d, counts, sum: summarizeNums(scores) }
  })
  const maxTotal = Math.max(
    ...rows.map((x) => x.counts.reduce((a, b) => a + b, 0)),
    1
  )
  const bars = rows
    .map((x) => {
      const total = x.counts.reduce((a, b) => a + b, 0)
      const segs = x.counts
        .map((c, i) => (c > 0 ? `<span style="flex:${Math.max(c, maxTotal / 40)};background:${RISK_COLORS[RISK_ORDER[i]]}"></span>` : ''))
        .join('')
      return `<div class="sb-row"><span class="sb-label">${esc(x.d.label)}</span><div class="sb-track">${segs}</div><span class="sb-num">${total}</span></div>`
    })
    .join('')
  const legend = `<div class="legend" style="flex-direction:row;gap:14px">${RISK_ORDER.map(
    (lv) => `<span class="lg"><i style="background:${RISK_COLORS[lv]}"></i>${lv}</span>`
  ).join('')}</div>`
  const table = `<table style="margin-top:14px"><thead><tr><th>量表</th><th class="num">满分</th><th class="num">n</th><th class="num">均值</th><th class="num">中位数</th><th class="num">标准差</th>${RISK_ORDER.map(
    (lv) => `<th class="num">${lv}</th>`
  ).join('')}</tr></thead><tbody>${rows
    .map((x) => {
      const n = x.counts.reduce((a, b) => a + b, 0)
      return `<tr><td>${esc(x.d.full)}</td><td class="num">${x.d.max}</td><td class="num">${n}</td><td class="num">${
        x.sum ? x.sum.mean.toFixed(1) : '—'
      }</td><td class="num">${x.sum ? x.sum.median.toFixed(1) : '—'}</td><td class="num">${
        x.sum ? x.sum.sd.toFixed(1) : '—'
      }</td>${x.counts.map((c) => `<td class="num">${c}</td>`).join('')}</tr>`
    })
    .join('')}</tbody></table>`
  return bars + legend + table
}

function corrBlock(records: AssessmentRecord[]): string {
  const corr = computeScaleMetricCorr(records)
  const head = corr.cols
    .map((c) => `<th class="num">${esc(c.label.length > 6 ? c.label.slice(0, 6) + '…' : c.label)}</th>`)
    .join('')
  const body = corr.rows
    .map((rk, ri) => {
      const tds = corr.cols
        .map((_, ci) => {
          const cell = corr.cells[ri][ci]
          if (cell.rho === null) return `<td class="num corr" style="background:#F7F6F4;color:#B9B1A7">–</td>`
          const t = Math.min(Math.abs(cell.rho), 1)
          const bg =
            cell.rho >= 0
              ? `rgba(217,119,6,${(0.12 + t * 0.6).toFixed(2)})`
              : `rgba(37,99,235,${(0.12 + t * 0.6).toFixed(2)})`
          const color = Math.abs(cell.rho) >= 0.55 ? '#fff' : '#475569'
          return `<td class="num corr" style="background:${bg};color:${color}">${cell.rho >= 0 ? '+' : ''}${cell.rho.toFixed(2)}<div class="corr-sub">${cell.effect}·n=${cell.n}</div></td>`
        })
        .join('')
      return `<tr><td class="mname">${esc(METRIC_LABELS[rk])}</td>${tds}</tr>`
    })
    .join('')
  const note = `<p class="note">Spearman 秩相关（探索性）；橙红为正相关、蓝为负相关，格内标注效应强度与样本量 n。相关≠因果，不作显著性检验${
    corr.maxN < 5 ? '；当前样本量不足 5 条，结果仅供直观参考' : ''
  }。</p>`
  return `<table><thead><tr><th style="width:150px">轨迹指标</th>${head}</tr></thead><tbody>${body}</tbody></table>` + note
}

function behaviorBlockBatch(records: AssessmentRecord[]): string {
  const metricRows = METRIC_KEYS.map((key) => {
    const vals = records
      .filter((r) => r.mouseMetrics)
      .map((r) => metricsRowOf(r.mouseMetrics!)[key] as number)
    return { label: METRIC_LABELS[key], sum: summarizeNums(vals) }
  })
  const metricTable = `<table><thead><tr><th>指标</th><th class="num">n</th><th class="num">均值</th><th class="num">中位数</th><th class="num">标准差</th><th class="num">最小</th><th class="num">最大</th></tr></thead><tbody>${metricRows
    .map(
      (m) =>
        `<tr><td class="mname">${esc(m.label)}</td><td class="num">${m.sum ? m.sum.n : 0}</td><td class="num">${
          m.sum ? m.sum.mean.toFixed(2) : '—'
        }</td><td class="num">${m.sum ? m.sum.median.toFixed(2) : '—'}</td><td class="num">${
          m.sum ? m.sum.sd.toFixed(2) : '—'
        }</td><td class="num">${m.sum ? m.sum.min.toFixed(0) : '—'}</td><td class="num">${
          m.sum ? m.sum.max.toFixed(0) : '—'
        }</td></tr>`
    )
    .join('')}</tbody></table>`

  const signals = behaviorSignalByRisk(records)
  const signalTable =
    signals.length === 0
      ? '<p class="muted" style="margin-top:14px">暂无命中行为信号的记录。</p>'
      : `<table style="margin-top:14px"><thead><tr><th>行为信号</th><th class="num">记录数</th>${RISK_ORDER.map(
          (lv) => `<th class="num">${lv}</th>`
        ).join('')}<th class="num">高风险占比</th></tr></thead><tbody>${signals
          .map(
            (s) =>
              `<tr><td class="mname">${esc(SIGNAL_LABELS[s.signal] || s.signal)}</td><td class="num">${s.count}</td><td class="num">${s.low}</td><td class="num">${s.mild}</td><td class="num">${s.moderate}</td><td class="num">${s.high}</td><td class="num">${s.highPct}%</td></tr>`
          )
          .join('')}</tbody></table>`
  return metricTable + signalTable
}

function cameraBlockBatch(records: AssessmentRecord[]): string {
  const rows = cameraModeByRisk(records)
  const table = `<table><thead><tr><th>采集状态</th><th class="num">记录数</th><th class="num">高风险数</th><th class="num">高风险占比</th><th class="num">平均 PHQ-9</th><th class="num">平均 PSS-10</th></tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td>${esc(CAMERA_MODE_LABELS[row.mode] || row.mode)}</td><td class="num">${row.count}</td><td class="num">${row.high}</td><td class="num">${row.highPct}%</td><td class="num">${row.avgPhq9 ?? '–'}</td><td class="num">${row.avgPss10 ?? '–'}</td></tr>`
    )
    .join('')}</tbody></table>`
  const note = `<p class="note">视频行为信号（面部动作单元、表情贫乏度、注视等）的心理学依据详见调研文档；当前版本以采集状态为主，待帧级指标落库后可扩展关联分析。</p>`
  return table + note
}

export function buildAnalysisReportHtml(records: AssessmentRecord[]): string {
  const summary = analyzeSummary(records)
  const highRisk = records.filter((r) => r.risk === '高风险').length
  const head = `<div class="head">
<h1>数据分析报告（探索性）</h1>
<div class="meta">
<span>样本量：<b>${records.length} 条</b></span>
<span>含鼠标轨迹：<b>${summary.withTrajectory}</b></span>
<span>含行为指标：<b>${summary.withMetrics}</b></span>
<span>高风险记录：<b>${highRisk}</b></span>
<span>生成时间：<b>${dateTimeStamp()}</b></span>
</div>
</div>`

  const riskDonut = donutHtml(
    summary.riskDist.map((r) => ({ label: r.label, value: r.count, color: RISK_COLORS[r.label] || '#94a3b8' })),
    summary.total,
    '记录总数'
  )
  const cameraDonut = donutHtml(
    summary.cameraDist.map((c) => ({
      label: CAMERA_MODE_LABELS[c.mode] || c.mode,
      value: c.count,
      color: c.mode === 'normal' ? '#16a34a' : c.mode === 'degraded' ? '#ea580c' : '#94a3b8',
    })),
    summary.total,
    '记录总数'
  )

  const overviewCards = `<div class="stat-grid">${[
    statCard('测评记录总数', summary.total),
    statCard(
      '含鼠标轨迹',
      summary.withTrajectory,
      summary.total > 0 ? Math.round((summary.withTrajectory / summary.total) * 100) + '%' : ''
    ),
    statCard(
      '含行为指标',
      summary.withMetrics,
      summary.total > 0 ? Math.round((summary.withMetrics / summary.total) * 100) + '%' : ''
    ),
    statCard('高风险记录', highRisk),
  ].join('')}</div>`

  const body = [
    section('一、总览', '样本构成与采集概况', overviewCards + `<div class="two-col" style="margin-top:14px">${riskDonut}${cameraDonut}</div>`),
    section('二、量表分布', '各量表独立风险等级构成与得分描述统计', scaleDistBlock(records)),
    section('三、行为指标', '鼠标轨迹指标描述统计与行为信号交叉', behaviorBlockBatch(records)),
    section('四、关联探索', '量表分数 × 鼠标轨迹指标相关矩阵', corrBlock(records)),
    section('五、视频采集', '采集状态 × 量表分数概况', cameraBlockBatch(records)),
  ].join('')

  const foot = `<div class="foot">本报告为探索性分析：样本量、个体差异与情境噪声均可能影响结果，不构成心理健康评估结论；相关关系不代表因果关系。请结合原始测评记录与量表结果综合判断，重要结论需专业人员复核。报告由迹心心理测评服务平台自动生成。</div>`

  return wrapHtml(`数据分析报告_${dateStamp()}`, head + body + foot)
}

/* ================= 输出工具 ================= */

const REPORT_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0 }
body { font-family: 'PingFang SC','Microsoft YaHei','Segoe UI',system-ui,sans-serif; background: #F7F6F4; color: #3E3A36; line-height: 1.65; padding: 32px 16px; font-size: 14px }
.page { max-width: 900px; margin: 0 auto }
.head { padding: 4px 2px 14px; border-bottom: 2px solid #EAE5DF; margin-bottom: 6px }
.head h1 { font-size: 22px; letter-spacing: .5px }
.head .meta { margin-top: 8px; color: #8A8178; font-size: 12px; display: flex; gap: 14px; flex-wrap: wrap }
.head .meta b { color: #3E3A36 }
.section { background: #fff; border: 1px solid #EAE5DF; border-radius: 12px; margin-top: 18px; overflow: hidden }
.section > h2 { font-size: 15px; padding: 13px 18px; border-bottom: 1px solid #F0EBE5; background: #FBFAF8; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap }
.section > h2 .sub { font-size: 12px; color: #8A8178; font-weight: 400 }
.body { padding: 16px 18px }
table { width: 100%; border-collapse: collapse; font-size: 13px }
th { background: #F7F6F4; text-align: left; padding: 7px 10px; color: #8A8178; font-weight: 600; border-bottom: 2px solid #EAE5DF; white-space: nowrap }
td { padding: 7px 10px; border-bottom: 1px solid #F0EBE5; vertical-align: top }
tr:last-child td { border-bottom: none }
td.num, th.num { text-align: center; font-variant-numeric: tabular-nums }
td.mname { white-space: nowrap; font-weight: 500 }
.corr-sub { font-size: 10px; opacity: .85; font-weight: 400 }
.badge { display: inline-block; padding: 1px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap }
.kv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px 18px }
.kv { font-size: 13px; color: #8A8178 } .kv b { color: #3E3A36; margin-left: 6px; font-weight: 600 }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px }
.stat { background: #F7F6F4; border: 1px solid #EAE5DF; border-radius: 10px; padding: 12px 14px }
.stat .l { font-size: 12px; color: #8A8178 } .stat .v { font-size: 22px; font-weight: 700; margin-top: 2px } .stat .s { font-size: 11px; color: #B9B1A7 }
.donut-wrap { display: flex; gap: 28px; flex-wrap: wrap; align-items: center; justify-content: center }
.legend { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #6B6258 }
.legend .lg { display: inline-flex; align-items: center; gap: 6px } .legend .lg i { width: 10px; height: 10px; border-radius: 3px; display: inline-block } .legend .lg b { color: #3E3A36 }
.sb-row { display: flex; align-items: center; gap: 10px; margin: 6px 0 }
.sb-label { width: 66px; font-size: 12px; color: #6B6258; text-align: right; flex-shrink: 0; font-weight: 600 }
.sb-track { flex: 1; display: flex; height: 14px; border-radius: 4px; overflow: hidden; background: #F1EFE9 }
.sb-track span { height: 100% }
.sb-num { width: 30px; font-size: 12px; color: #8A8178 }
.chips { display: flex; flex-wrap: wrap; gap: 8px }
.chip { font-size: 12px; padding: 3px 12px; border-radius: 999px; background: #FDF3E4; border: 1px solid #F2DDC2; color: #9A6413; font-weight: 500 }
.chip b { color: #7A4E0E }
.tag { font-size: 10px; border: 1px solid #EAE5DF; background: #fff; color: #B9B1A7; border-radius: 4px; padding: 0 4px; margin-left: 6px }
.muted { color: #B9B1A7; font-size: 13px }
.note { font-size: 12px; color: #8A8178; margin-top: 10px }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px }
@media (max-width: 720px) { .two-col { grid-template-columns: 1fr } }
.foot { margin-top: 20px; background: #FFF8EC; border: 1px solid #F5E3BF; color: #92700B; padding: 12px 16px; border-radius: 10px; font-size: 12px; line-height: 1.7 }
@media print { body { background: #fff; padding: 0 } .page { max-width: none } .section { break-inside: avoid; page-break-inside: avoid } }
`

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${REPORT_CSS}</style>
</head>
<body><div class="page">${body}</div></body>
</html>`
}

export function downloadText(text: string, filename: string, mime = 'text/html;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), filename)
}

/** 调起浏览器打印（打印为 PDF）：将报告写入新窗口并触发打印 */
export function printHtml(html: string): void {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    try { w.print() } catch {}
  }, 400)
}
