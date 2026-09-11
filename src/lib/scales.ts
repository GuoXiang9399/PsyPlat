// 补充量表共享定义与评分：测评页写入、数据管理页读取
// 量表条目依据通行中文版整理（筛查用途），正式投入使用前建议与量表版权方/现行中文版核校
// 计分与切分点参考：C-SSRS 筛查版（Posner 等）、NSSI（Nock 自伤频率框架）、
// PSS-10（Cohen）、PSQI（Buysse，7 成分计分）、SIAS-6 简化筛查、ASLEC（刘贤臣）

// ---------- 第一层：核心预警 ----------

// C-SSRS 自杀严重度评定量表（筛查版，过去一个月；0=否 1=是）
export const cssrsQuestions = [
  '过去一个月内，是否希望自己死去，或希望睡着后不再醒来？',
  '过去一个月内，是否想过要结束自己的生命？',
  '过去一个月内，是否有过具体的自杀方法（方式）的想法，但没有采取行动的打算？',
  '过去一个月内，是否有过具体的自杀方法，并且有采取行动的意图或计划？'
]
export const cssrsOptions = ['否', '是']

// NSSI 非自杀性自伤（过去一年）
export const nssiQuestions = [
  '过去一年内，是否曾有意地伤害自己的身体，但并非为了结束生命（如割伤、烫伤、撞头、抓挠、咬伤等）？',
  '若发生过上述行为，过去一年内大约发生了几次？'
]
export const nssiHasOptions = ['否', '是']
export const nssiFreqOptions = ['未发生', '1-2 次', '3-5 次', '6-10 次', '11 次及以上']

// ---------- 第二层：扩充画像 ----------

// PSS-10 感知压力（过去一个月；0=从不 1=偶尔 2=有时 3=经常 4=总是）
// 第 4/5/7/8 题为反向计分
export const pss10Questions = [
  '因意料之外的事情而感到心烦',
  '感到无法控制生活中重要的事情',
  '感到紧张或有压力',
  '能够成功地处理生活中的麻烦事',
  '觉得事情处理得得心应手',
  '觉得自己无法承担所有必须做的事情',
  '能够控制生活中的情绪波动',
  '觉得事情都在自己的掌控之中',
  '因为事情超出自己的控制而感到气愤',
  '觉得困难堆积如山，自己无法克服'
]
export const pss10Options = ['从不', '偶尔', '有时', '经常', '总是']
export const PSS10_REVERSED = [3, 4, 6, 7] // 0-based 反向题索引

// PSQI 匹兹堡睡眠质量指数（过去一个月，患者自评 7 成分）
// 存储：bed=就寝时刻(0-23)、latency=入睡分钟数、wake=起床时刻(0-23)、hours=实际睡眠小时、
// d[10]=睡眠障碍频率 10 项(a-j)、quality=总体睡眠质量(0-3)、meds=催眠药物(0-3)、day=白天清醒困难(0-3)、energy=精力不足(0-3)
export interface PsqiAnswers {
  bed: number
  latency: number
  wake: number
  hours: number
  d: number[] // 10 项，0=过去一个月没有 1=每周少于1次 2=每周1-2次 3=每周3次或以上
  quality: number
  meds: number
  day: number
  energy: number
}
export function emptyPsqiAnswers(): PsqiAnswers {
  return { bed: 23, latency: 15, wake: 7, hours: 7, d: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], quality: 0, meds: 0, day: 0, energy: 0 }
}
export const psqiDisturbanceItems = [
  '入睡困难（30 分钟内无法入睡）',
  '夜间易醒或早醒',
  '需要起床上厕所',
  '呼吸不畅',
  '咳嗽或大声打鼾',
  '感觉太冷',
  '感觉太热',
  '做噩梦',
  '疼痛不适',
  '其他影响睡眠的情况'
]
export const psqiFreqOptions = ['无', '每周少于1次', '每周1-2次', '每周3次或以上']
export const psqiQualityOptions = ['很好', '尚好', '较差', '很差']

// PSQI 7 成分计分（0-3 各成分，总分 0-21）
export function scorePsqi(a: PsqiAnswers): { comps: number[]; total: number } {
  const clamp = (v: number) => Math.max(0, Math.min(3, v))
  // C1 主观睡眠质量
  const c1 = clamp(a.quality)
  // C2 入睡时间：入睡分钟数 + 入睡困难频率
  const latencyScore = a.latency <= 15 ? 0 : a.latency <= 30 ? 1 : a.latency <= 60 ? 2 : 3
  const sleepOnset = latencyScore + (a.d[0] ?? 0)
  const c2 = sleepOnset === 0 ? 0 : sleepOnset <= 2 ? 1 : sleepOnset <= 4 ? 2 : 3
  // C3 睡眠时长
  const c3 = a.hours >= 7 ? 0 : a.hours >= 6 ? 1 : a.hours >= 5 ? 2 : 3
  // C4 睡眠效率 = 实际睡眠小时 / 卧床小时 * 100
  let bedDur = a.wake - a.bed
  if (bedDur <= 0) bedDur += 24
  if (bedDur <= 0) bedDur = a.hours + 1
  const eff = (a.hours / bedDur) * 100
  const c4 = eff >= 85 ? 0 : eff >= 75 ? 1 : eff >= 65 ? 2 : 3
  // C5 睡眠障碍：d[1..9] 之和（不含 d[0]，d[0] 已计入 C2）
  const distSum = a.d.slice(1).reduce((s, v) => s + v, 0)
  const c5 = distSum === 0 ? 0 : distSum <= 9 ? 1 : distSum <= 18 ? 2 : 3
  // C6 催眠药物
  const c6 = clamp(a.meds)
  // C7 日间功能障碍
  const daySum = a.day + a.energy
  const c7 = daySum === 0 ? 0 : daySum <= 2 ? 1 : daySum <= 4 ? 2 : 3
  const comps = [c1, c2, c3, c4, c5, c6, c7]
  return { comps, total: comps.reduce((s, v) => s + v, 0) }
}
export const psqiComponentNames = ['睡眠质量', '入睡时间', '睡眠时长', '睡眠效率', '睡眠障碍', '催眠药物', '日间功能']
export const psqiLevelOf = (t: number) => (t <= 5 ? '睡眠正常' : t <= 10 ? '轻度睡眠障碍' : t <= 15 ? '中度睡眠障碍' : '重度睡眠障碍')

// SIAS 社交焦虑简化筛查（SIAS-6 思路，过去两周；0=完全不符合 … 4=完全符合）
export const sias6Questions = [
  '与不熟悉的人在一起时，我会感到紧张',
  '在社交场合中，我担心自己会说错话或做错事',
  '与老师、领导等权威人物交谈时，我感到困难',
  '我担心别人会注意到我在社交中的不自在',
  '在人群中，我会感到不自然',
  '当众发言或做事时，我会紧张不安'
]
export const sias6Options = ['完全不符合', '有点符合', '基本符合', '比较符合', '完全符合']

// ASLEC 青少年生活事件量表（过去一年；0=未发生，1-5=影响程度递增）
export const aslecItems = [
  '被人误会或错怪',
  '受人歧视或冷遇',
  '考试失败或不理想',
  '与同学或好友发生纠纷',
  '生活习惯（饮食、作息）明显变化',
  '不喜欢上学或学习环境不佳',
  '恋爱不顺利或失恋',
  '与人发生打架或冲突',
  '遭家长打骂',
  '家庭给你施加学习压力',
  '意外惊吓或事故',
  '家人重病或病故',
  '家庭经济困难',
  '父母（或监护人）离异',
  '父母（或监护人）吵架、不和睦',
  '家庭成员患严重疾病需住院治疗',
  '本人患重病或重伤',
  '本人因病休学或停学',
  '与老师关系紧张',
  '被学校处分或批评',
  '转学或休学',
  '学习负担过重',
  '与家长（或监护人）关系紧张',
  '名誉受损',
  '被同学或他人欺凌',
  '重要考试或考核失利',
  '其他重要生活事件'
]
export const aslecImpactOptions = ['未发生', '无影响', '轻度', '中度', '重度', '极重']
// 说明：选项索引即计分值（0=未发生 0 分，1-5=无影响到极重影响 1-5 分），发生事件计影响分

// ---------- 评分函数 ----------

export function scoreOfList(answers: number[]): number {
  return answers.reduce((s, v) => s + (v > 0 ? v : 0), 0)
}

export function scorePss10(answers: number[]): number {
  return answers.reduce((s, v, i) => s + (PSS10_REVERSED.includes(i) ? 4 - v : v), 0)
}
export const pss10LevelOf = (t: number) => (t <= 13 ? '压力水平较低' : t <= 19 ? '压力水平中等' : t <= 26 ? '压力水平偏高' : '压力水平高')

export function scoreSias6(answers: number[]): number {
  return answers.reduce((s, v) => s + v, 0)
}

export function scoreAslec(answers: number[]): { total: number; count: number } {
  const total = answers.reduce((s, v) => s + (v > 0 ? v : 0), 0) // 选项索引即影响分值（0-5）
  const count = answers.filter((v) => v > 0).length // 发生事件数
  return { total, count }
}

// ---------- 风险整合 ----------
// 优先级：C-SSRS 阳性（自杀意念/行为）> NSSI 阳性 + PHQ-9 第 9 题阳性 > 原 PHQ/GAD 等级
export interface RiskResult {
  level: number // 0 低 1 轻度 2 中度 3 高风险
  label: string
  flags: string[] // 风险标记：suicide/ nssi / severe-sleep / high-stress / social-anxiety / life-events
}
export const RISK_LABELS = ['低风险', '轻度风险', '中度风险', '高风险']

export function buildRisk(
  phq9Answers: number[],
  gad7Answers: number[],
  cssrs: number[],
  nssi: number[]
): RiskResult {
  const flags: string[] = []
  const phq9Score = scoreOfList(phq9Answers.filter((v) => v >= 0 && v <= 3))
  const gad7Score = scoreOfList(gad7Answers.filter((v) => v >= 0 && v <= 3))
  const baseLevel = Math.max(
    phq9Score <= 4 ? 0 : phq9Score <= 9 ? 1 : phq9Score <= 14 ? 2 : 3,
    gad7Score <= 4 ? 0 : gad7Score <= 9 ? 1 : gad7Score <= 14 ? 2 : 3
  )
  let level = baseLevel
  const cssrsPos = cssrs.filter((v) => v === 1).length
  if (cssrsPos > 0) {
    flags.push('suicide')
    level = Math.max(level, 3) // 自杀意念/行为阳性：直接高风险
  }
  const nssiPositive = (nssi[0] ?? 0) === 1
  const phq9Item9Positive = (phq9Answers[8] ?? -1) > 0 // PHQ-9 第 9 题"自杀念头"近两周出现过
  if (nssiPositive) {
    flags.push('nssi')
    level = Math.max(level, 2)
    if (phq9Item9Positive) level = Math.max(level, 3)
  }
  return { level, label: RISK_LABELS[level], flags }
}