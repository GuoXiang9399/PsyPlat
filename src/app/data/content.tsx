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
  Eye
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
  aslecRiskOf
} from '@/lib/records'
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

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

// 鼠标轨迹可视化：按采样顺序绘制折线（奶油色主题），标注起点/终点
function TrajectoryCanvas({ traj }: { traj: { x: number; y: number; t: number; k?: 'm' | 'c' }[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || traj.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#F7F2E8'
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
    ctx.strokeStyle = '#A8905F'
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
      ctx.fillStyle = isClick ? '#dc2626' : isEdge ? '#8F7A4E' : '#A8905F'
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
    ctx.fillStyle = '#8F7A4E'
    ctx.font = '10px sans-serif'
    ctx.fillText('起点', px(first.x) - 14, py(first.y) - 6)
    ctx.fillText('终点 ' + last.t + 'ms', px(last.x) - 18, py(last.y) + 14)
  }, [traj])
  return (
    <canvas
      ref={ref}
      width={560}
      height={220}
      className="w-full rounded-lg"
      style={{ background: '#F7F2E8', maxHeight: 220 }}
      aria-label="鼠标轨迹图"
    />
  )
}

function Sidebar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const tabs = [
    { key: 'dashboard' as TabKey, label: '首页概览', icon: LayoutDashboard },
    { key: 'assessment' as TabKey, label: '心理测评', icon: FileText },
    { key: 'data' as TabKey, label: '数据管理', icon: Database },
    { key: 'settings' as TabKey, label: '系统设置', icon: Settings },
    { key: 'about' as TabKey, label: '关于系统', icon: Info },
  ]

  return (
    <aside className="w-64 bg-white border-r border-warm-300 flex flex-col">
      <div className="p-4 border-b border-warm-300">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-orange-500" />
          <h1 className="text-sm font-bold text-slate-800 leading-tight">河南大学基础医学院心理站</h1>
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
                  ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [scaleFilter, setScaleFilter] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>('time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<AssessmentRecord | null>(null)

  // 量表列定义：分值 + 独立风险等级（数据管理表格"所有量表结果分值 + 每个量表单独风险等级"）
  type ScaleKey = 'phq9' | 'gad7' | 'cssrs' | 'nssi' | 'pss10' | 'psqi' | 'sias6' | 'aslec'
  const scaleMeta: { key: ScaleKey; label: string; score: (r: AssessmentRecord) => number; risk: (r: AssessmentRecord) => string }[] = [
    { key: 'phq9', label: 'PHQ-9', score: (r) => r.phq9Score ?? 0, risk: (r) => depRiskOf(r.phq9Score ?? 0) },
    { key: 'gad7', label: 'GAD-7', score: (r) => r.gad7Score ?? 0, risk: (r) => anxRiskOf(r.gad7Score ?? 0) },
    { key: 'cssrs', label: 'C-SSRS', score: (r) => r.cssrsPositive ?? 0, risk: (r) => cssrsRiskOf(r.cssrsPositive ?? 0) },
    { key: 'nssi', label: 'NSSI', score: (r) => (r.nssi ?? [])[0] ?? 0, risk: (r) => nssiRiskOf(r.nssi ?? [], r.phq9) },
    { key: 'pss10', label: 'PSS-10', score: (r) => r.pss10Score ?? 0, risk: (r) => pss10RiskOf(r.pss10Score ?? 0) },
    { key: 'psqi', label: 'PSQI', score: (r) => r.psqiScore ?? 0, risk: (r) => psqiRiskOf(r.psqiScore ?? 0) },
    { key: 'sias6', label: 'SIAS-6', score: (r) => r.sias6Score ?? 0, risk: (r) => sias6RiskOf(r.sias6Score ?? 0) },
    { key: 'aslec', label: 'ASLEC', score: (r) => r.aslecScore ?? 0, risk: (r) => aslecRiskOf(r.aslecScore ?? 0) },
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
        mouseTrajectory: mkTraj(12),
        mouseSamples: 12,
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

  const getRiskClass = (risk: string) => {
    switch (risk) {
      case '高风险': return 'bg-red-500/20 text-red-400'
      case '中度风险': return 'bg-orange-500/20 text-orange-400'
      case '轻度风险': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-green-500/20 text-green-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成'
      case 'pending_review': return '待审核'
      case 'intervened': return '已干预'
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-orange-500/15 text-orange-500'
      case 'pending_review': return 'bg-yellow-500/20 text-yellow-400'
      case 'intervened': return 'bg-purple-500/20 text-purple-400'
      default: return 'bg-warm-200 text-slate-400'
    }
  }

const handleExportCSV = () => {
    const headers = ['ID', '学号', '时间', ...scaleMeta.flatMap((m) => [`${m.label}分值`, `${m.label}风险`]), '整体风险', '状态']
    const rows = filteredRecords.map(r => [
      r.id, r.studentId, r.time,
      ...scaleMeta.flatMap((m) => [m.score(r), m.risk(r)]),
      r.risk, getStatusText(r.status)
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `assessment_data_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">数据管理</h1>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="w-4 h-4" />
          共 {records.length} 条记录
        </div>
      </div>

      {/* 统计面板 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">总记录数</span>
            <FileCheck className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">高风险</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.highRisk}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">待审核</span>
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-warm-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">已完成</span>
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
            placeholder="搜索学号或ID..."
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
            <option value="all">整体风险：全部</option>
            <option value="低风险">低风险</option>
            <option value="轻度风险">轻度风险</option>
            <option value="中度风险">中度风险</option>
            <option value="高风险">高风险</option>
          </select>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Download className="w-4 h-4" /> 导出CSV
        </button>
      </div>

      {/* 各量表独立风险等级筛选 */}
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-xs text-slate-400 font-medium">量表风险筛选：</span>
        {scaleMeta.map((meta) => (
          <select
            key={meta.key}
            value={scaleFilter[meta.key] ?? 'all'}
            onChange={(e) => setScaleFilter((prev) => ({ ...prev, [meta.key]: e.target.value }))}
            className="bg-white border border-warm-300 rounded-lg px-2 py-1.5 text-xs text-slate-500 focus:outline-none focus:border-orange-500"
            aria-label={`按${meta.label}风险筛选`}
          >
            <option value="all">{meta.label}：全部</option>
            <option value="低风险">低风险</option>
            <option value="轻度风险">轻度风险</option>
            <option value="中度风险">中度风险</option>
            <option value="高风险">高风险</option>
          </select>
        ))}
        <button
          onClick={() => setScaleFilter({})}
          className="text-xs text-slate-400 hover:text-orange-500 transition-colors underline underline-offset-2"
        >
          清除量表筛选
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
                  { key: 'studentId' as SortKey, label: '学号' },
                  { key: 'time' as SortKey, label: '时间' },
                  ...scaleMeta.map((m) => ({ key: m.key as SortKey, label: m.label })),
                  { key: 'risk' as SortKey, label: '整体风险' },
                  { key: 'status' as SortKey, label: '状态' },
                ]).map((col) => (
                  <th key={col.key} className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-orange-500 transition-colors"
                      title={`按${col.label}排序`}
                    >
                      {col.label}
                      <span className="text-[10px]">
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="text-left p-3 text-slate-400 text-sm font-medium whitespace-nowrap">操作</th>
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
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${getRiskClass(risk)}`}>{risk}</span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getRiskClass(record.risk)}`}>
                      {record.risk}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusClass(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      onClick={() => setSelected(record)}
                      className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/30 px-2.5 py-1 rounded flex items-center gap-1 text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> 查看明细
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            没有找到匹配的记录
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
                <h2 className="text-lg font-bold text-slate-800">测评记录明细</h2>
                <span className={`px-2 py-1 rounded text-xs ${getRiskClass(selected.risk)}`}>
                  {selected.risk}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusClass(selected.status)}`}>
                  {getStatusText(selected.status)}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 基本信息 */}
              <div className="bg-warm-100 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-2">
                  学号：<span className="text-slate-700 font-medium">{selected.studentId}</span>
                  <span className="mx-2 text-warm-400">|</span>
                  时间：<span className="text-slate-700">{selected.time}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>学习层次：{selected.educationLevel}</span>
                  <span>年级：{selected.grade || '-'}</span>
                  <span>专业：{selected.major || '-'}</span>
                  {selected.age && <span>年龄：{selected.age}</span>}
                  <span>性别：{selected.gender === 'male' ? '男' : selected.gender === 'female' ? '女' : '其他'}</span>
                </div>
              </div>

              {/* 各量表分值 + 独立风险等级摘要 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">各量表分值 · 风险等级</h3>
                  <span className="text-sm text-slate-400">点击查看下方逐题明细</span>
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
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${getRiskClass(risk)}`}>{risk}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PHQ-9 逐题 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">PHQ-9 抑郁症筛查量表</h3>
                  <span className="text-sm text-slate-500">
                    总分：<b className="text-orange-500 text-base">{selected.phq9Score}</b> / 27
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
                                ? 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                  <h3 className="text-sm font-semibold text-slate-800">GAD-7 广泛性焦虑量表</h3>
                  <span className="text-sm text-slate-500">
                    总分：<b className="text-orange-500 text-base">{selected.gad7Score}</b> / 21
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
                                ? 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                  <h3 className="text-sm font-semibold text-slate-800">第一层 · 核心预警</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {((selected.riskFlags ?? []).includes('suicide')) && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-500 border border-red-500/40 font-medium">自杀风险</span>
                    )}
                    {((selected.riskFlags ?? []).includes('nssi')) && (
                      <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-500 border border-orange-500/40 font-medium">自伤风险</span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-6">
                  {/* C-SSRS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">C-SSRS 自杀严重度评定量表（筛查版，过去一个月）</h4>
                      <span className="text-sm text-slate-500">
                        阳性条目：<b className="text-red-500 text-base">{selected.cssrsPositive ?? 0}</b> / 4
                      </span>
                    </div>
                    {(selected.cssrs ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 C-SSRS 数据（旧版本记录）。</p>
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
                                        : 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                      <h4 className="text-sm font-semibold text-slate-700">NSSI 非自杀性自伤筛查（过去一年）</h4>
                      <span className="text-sm text-slate-500">
                        {(selected.nssi ?? [])[0] === 1 ? (
                          <b className="text-orange-500 text-sm">自伤行为阳性</b>
                        ) : (
                          <span className="text-slate-400">无自伤行为</span>
                        )}
                      </span>
                    </div>
                    {(selected.nssi ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 NSSI 数据（旧版本记录）。</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-sm text-slate-600 mb-2">1. {nssiQuestions[0]}</div>
                          <div className="flex flex-wrap gap-2">
                            {nssiHasOptions.map((opt, oi) => (
                              <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                (selected.nssi ?? [])[0] === oi
                                  ? oi === 1
                                    ? 'bg-orange-500/20 text-orange-500 border-orange-500/40 font-medium'
                                    : 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                                  ? 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                  <h3 className="text-sm font-semibold text-slate-800">第二层 · 扩充画像</h3>
                  <span className="text-sm text-slate-500">辅助评估与干预参考</span>
                </div>
                <div className="p-4 space-y-6">
                  {/* PSS-10 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-700">PSS-10 感知压力量表（过去一个月）</h4>
                      <span className="text-sm text-slate-500">
                        总分：<b className="text-orange-500 text-base">{selected.pss10Score ?? 0}</b> / 40
                        <span className="ml-2 text-xs text-slate-400">{pss10LevelOf(selected.pss10Score ?? 0)}</span>
                      </span>
                    </div>
                    {(selected.pss10 ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 PSS-10 数据（旧版本记录）。</p>
                    ) : (
                      <div className="space-y-2">
                        {pss10Questions.map((q, i) => {
                          const ans = (selected.pss10 ?? [])[i]
                          return (
                            <div key={i} className="bg-warm-100 rounded-lg p-3">
                              <div className="text-sm text-slate-600 mb-2">
                                {i + 1}. {q}
                                {PSS10_REVERSED.includes(i) && (
                                  <span className="ml-2 text-[10px] text-slate-400 bg-white border border-warm-300 rounded px-1 py-0.5">反向计分</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {pss10Options.map((opt, oi) => (
                                  <span key={oi} className={`px-2.5 py-1 rounded text-xs border ${
                                    ans === oi
                                      ? 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                      <h4 className="text-sm font-semibold text-slate-700">PSQI 匹兹堡睡眠质量指数（过去一个月）</h4>
                      <span className="text-sm text-slate-500">
                        总分：<b className="text-orange-500 text-base">{selected.psqiScore ?? 0}</b> / 21
                        <span className="ml-2 text-xs text-slate-400">{psqiLevelOf(selected.psqiScore ?? 0)}</span>
                      </span>
                    </div>
                    {!selected.psqi ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 PSQI 数据（旧版本记录）。</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-2">7 项成分得分（0-3）：</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(selected.psqiComps ?? []).map((c, i) => (
                              <span key={i} className="px-2 py-1 rounded text-xs border border-warm-300 bg-white text-slate-600">
                                {psqiComponentNames[i]}：<b className="text-orange-500">{c}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">就寝 / 起床</div>
                            <div className="text-slate-700">{selected.psqi.bed}:00 — {selected.psqi.wake}:00</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">入睡耗时 / 睡眠时长</div>
                            <div className="text-slate-700">{selected.psqi.latency} 分钟 / {selected.psqi.hours} 小时</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">总体睡眠质量</div>
                            <div className="text-slate-700">{psqiQualityOptions[selected.psqi.quality] ?? '-'}</div>
                          </div>
                          <div className="bg-warm-100 rounded-lg p-3">
                            <div className="text-xs text-slate-400 mb-1">催眠药物 / 白天困倦 / 精力不足</div>
                            <div className="text-slate-700">{psqiFreqOptions[selected.psqi.meds] ?? '-'} / {psqiFreqOptions[selected.psqi.day] ?? '-'} / {psqiFreqOptions[selected.psqi.energy] ?? '-'}</div>
                          </div>
                        </div>
                        <div className="bg-warm-100 rounded-lg p-3">
                          <div className="text-xs text-slate-400 mb-2">睡眠障碍频率（10 项）：</div>
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
                      <h4 className="text-sm font-semibold text-slate-700">SIAS-6 社交焦虑筛查（过去两周）</h4>
                      <span className="text-sm text-slate-500">总分：<b className="text-orange-500 text-base">{selected.sias6Score ?? 0}</b> / 24</span>
                    </div>
                    {(selected.sias6 ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 SIAS-6 数据（旧版本记录）。</p>
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
                                      ? 'bg-orange-500/15 text-orange-500 border-orange-500/30 font-medium'
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
                      <h4 className="text-sm font-semibold text-slate-700">ASLEC 青少年生活事件（过去一年）</h4>
                      <span className="text-sm text-slate-500">
                        发生事件：<b className="text-orange-500 text-base">{selected.aslecCount ?? 0}</b> 件
                        <span className="mx-2 text-warm-400">·</span>
                        影响总分：<b className="text-orange-500">{selected.aslecScore ?? 0}</b>
                      </span>
                    </div>
                    {(selected.aslec ?? []).length === 0 ? (
                      <p className="text-sm text-slate-400 py-2">该记录未采集 ASLEC 数据（旧版本记录）。</p>
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
                                  : ans === 4 ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                  : ans === 3 ? 'bg-yellow-500/15 text-yellow-600 border border-yellow-500/30'
                                  : 'bg-warm-200 text-slate-500'
                              }`}>
                                {aslecImpactOptions[ans] ?? '未发生'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 鼠标轨迹（行为数据）——测评第 3 步答题过程中自动采样 */}
              <div className="bg-white rounded-lg border border-warm-300 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-warm-100/60 border-b border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-800">鼠标轨迹（行为数据）</h3>
                  <span className="text-sm text-slate-500">
                    采样点：<b className="text-orange-500 text-base">{selected.mouseTrajectory?.length ?? 0}</b>
                    <span className="mx-2 text-warm-400">·</span>
                    采集模式：{selected.cameraMode === 'degraded' ? '摄像头降级' : '正常'}
                  </span>
                </div>
                <div className="p-4">
                  {selected.mouseTrajectory && selected.mouseTrajectory.length > 0 ? (
                    <div className="space-y-3">
                      <TrajectoryCanvas traj={selected.mouseTrajectory} />
                      <div className="bg-warm-100 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 text-xs text-slate-400 border-b border-warm-300/60 flex items-center justify-between">
                          <span>坐标序列（x, y, 相对时间 ms）</span>
                          <span>共 {selected.mouseTrajectory.length} 点</span>
                        </div>
                        <pre className="p-3 text-xs text-slate-500 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                          {selected.mouseTrajectory.map(p => `(${p.x}, ${p.y}, ${p.t}ms${p.k === 'c' ? '[点击]' : ''})`).join('  ')}
                        </pre>
                      </div>
                      <p className="text-xs text-slate-400">
                        鼠标行为在测评第 3 步答题过程中全量采集（记录每一次鼠标挪动与点击动作，红色方块为点击点），用于行为特征分析，不涉及键盘输入内容。
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 py-2">
                      本次测评未采集到鼠标轨迹样本（可能因设备/浏览器限制或作答时间过短），其余测评数据不受影响。
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
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

