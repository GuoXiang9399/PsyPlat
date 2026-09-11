'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Settings,
  LayoutDashboard,
  FileText,
  Database,
  Info,
  Brain,
  Eye,
  Shield,
  Bell,
  SlidersHorizontal,
  Save,
  RotateCcw,
  ChevronRight,
  FolderOpen,
  Lock,
  MousePointer,
  Camera,
  Trash2,
  Video,
  RefreshCw
} from 'lucide-react'
import {
  AssessmentRecord,
  loadRecords,
  persistRecords,
  computeMouseMetrics,
  behaviorSignalsOf,
  BEHAVIOR_SIGNAL_LABELS,
  MouseMetrics,
  TrajectoryPoint
} from '@/lib/records'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'
type SettingsTab = 'capture' | 'privacy' | 'warning' | 'system'

// 鼠标轨迹调试：行为指标摘要（实时计算，依据调研文档；旧记录无存储指标时现场计算）
function MouseMetricsSummary({
  traj,
  metrics
}: {
  traj: TrajectoryPoint[]
  metrics: MouseMetrics | null
}) {
  const m = metrics || computeMouseMetrics(traj)
  if (!m) return null
  const signals = behaviorSignalsOf(m)
  const items: { label: string; value: string }[] = [
    { label: '时长', value: (m.duration / 1000).toFixed(1) + ' s' },
    { label: '点数', value: String(m.points) },
    { label: '位移', value: Math.round(m.distance) + ' px' },
    { label: '平均速度', value: m.avgSpeed.toFixed(4) },
    { label: '速度变异', value: m.speedCV.toFixed(3) },
    { label: '停顿', value: m.pauseCount + ' 次 / ' + (m.pauseRatio * 100).toFixed(1) + ' %' },
    { label: '方向反转', value: m.xFlips + ' / ' + m.yFlips + '（横/纵）' },
    { label: '弯曲度', value: m.curvature.toFixed(2) },
    { label: '抖动分', value: String(m.tremorScore) },
    { label: '启动潜伏', value: m.initLatency + ' ms' }
  ]
  return (
    <div className="bg-warm-100 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">行为指标摘要</span>
        <span className="text-[11px] text-slate-400">启发式计算 · 非诊断</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {items.map(it => (
          <div key={it.label} className="flex items-baseline justify-between gap-2">
            <span>{it.label}</span>
            <b className="text-slate-700">{it.value}</b>
          </div>
        ))}
      </div>
      {signals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {signals.map(s => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              {BEHAVIOR_SIGNAL_LABELS[s]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// 鼠标轨迹调试画布：与数据管理页同款奶油色绘制（起点/终点标注 + 采样节点）
function DebugTrajCanvas({ traj }: { traj: { x: number; y: number; t: number }[] }) {
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
    ctx.strokeStyle = '#A8905F'
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'
    ctx.beginPath()
    traj.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y))
      else ctx.lineTo(px(p.x), py(p.y))
    })
    ctx.stroke()
    traj.forEach((p, i) => {
      ctx.fillStyle = i === 0 || i === traj.length - 1 ? '#8F7A4E' : '#A8905F'
      ctx.beginPath()
      ctx.arc(px(p.x), py(p.y), i === 0 || i === traj.length - 1 ? 3.2 : 1.6, 0, Math.PI * 2)
      ctx.fill()
    })
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
      aria-label="鼠标轨迹调试图"
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

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('capture')
  const [saved, setSaved] = useState(false)

  const [captureSettings, setCaptureSettings] = useState({
    mouseSampleRate: 50,
    mouseDuration: 30,
    cameraFps: 30,
    cameraResolution: '640x480',
    cameraDuration: 60
  })

  const [privacySettings, setPrivacySettings] = useState({
    localProcessing: true,
    deleteRaw: true,
    encryptStorage: true,
    anonymize: true
  })

  const [warningSettings, setWarningSettings] = useState({
    phq9Mild: 5,
    phq9Moderate: 10,
    phq9Severe: 15,
    gad7Mild: 5,
    gad7Moderate: 10,
    gad7Severe: 15,
    notifyEmail: true,
    notifyPush: true
  })

  const [systemSettings, setSystemSettings] = useState({
    dataPath: '/data/assessments',
    theme: 'light',
    autoSave: true,
    debugMode: false
  })

const [pwdForm, setPwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' })
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  // —— 采集设置调试：鼠标轨迹 ——
  const [trajRecords, setTrajRecords] = useState<AssessmentRecord[]>(() =>
    loadRecords().filter(r => (r.mouseTrajectory?.length ?? 0) > 0)
  )
  const [selectedTrajId, setSelectedTrajId] = useState<string>('')
  const selectedTraj = trajRecords.find(r => r.id === selectedTrajId) ?? null

  const refreshTraj = () => {
    setTrajRecords(loadRecords().filter(r => (r.mouseTrajectory?.length ?? 0) > 0))
    setSelectedTrajId('')
  }

  const clearTraj = () => {
    if (trajRecords.length === 0) return
    if (!window.confirm('将清空所有测评记录的鼠标轨迹数据（量表作答与其余数据保留），确定吗？')) return
    const all = loadRecords().map(r => ({ ...r, mouseTrajectory: [], mouseSamples: 0 }))
    persistRecords(all)
    setTrajRecords([])
    setSelectedTrajId('')
  }

  // —— 采集设置调试：摄像头 ——
  const [camStatus, setCamStatus] = useState<'idle' | 'testing' | 'normal' | 'degraded'>('idle')
  const [camMsg, setCamMsg] = useState('尚未检测。将验证摄像头权限、视频流与降级逻辑是否正常')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const camTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopCam = () => {
    if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => () => { stopCam() }, [])

  const testCamera = async () => {
    stopCam()
    setCamStatus('testing')
    setCamMsg('正在请求摄像头权限…')
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCamStatus('degraded')
      setCamMsg('当前环境不支持摄像头 API（无 mediaDevices），测评将自动降级为 normal 之外的能力受限模式，其余数据不受影响。')
      return
    }
    camTimerRef.current = setTimeout(() => {
      stopCam()
      setCamStatus('degraded')
      setCamMsg('摄像头权限等待超时（8 秒），已降级：本环境无法访问摄像头，正式测评时将自动使用受限模式，不会阻塞答题。')
    }, 8000)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamStatus('normal')
      setCamMsg('摄像头调用成功：权限与视频流正常（320×240）。预览将展示 2.5 秒后自动关闭，与测评第 3 步采集窗口一致。')
      camTimerRef.current = setTimeout(() => { stopCam() }, 2500)
    } catch (e) {
      if (camTimerRef.current) { clearTimeout(camTimerRef.current); camTimerRef.current = null }
      stopCam()
      setCamStatus('degraded')
      setCamMsg('摄像头调用失败或权限被拒绝：' + (e instanceof Error ? e.message : String(e)) + '。已降级：正式测评时会自动切换受限模式，答题流程不受影响。')
    }
  }

  const endCameraDebug = () => {
    stopCam()
    setCamStatus('idle')
    setCamMsg('已结束摄像头调试。可再次点击「开始检测」重新验证。')
  }

  const handleChangePassword = () => {
    const current = (() => { try { return localStorage.getItem('psyc_admin_pwd') || '123456' } catch { return '123456' } })()
    if (pwdForm.oldPwd !== current) {
      setPwdMsg({ type: 'error', text: '原密码不正确' })
      return
    }
    if (pwdForm.newPwd.length < 6) {
      setPwdMsg({ type: 'error', text: '新密码不能少于 6 位' })
      return
    }
    if (pwdForm.newPwd !== pwdForm.confirmPwd) {
      setPwdMsg({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }
    try { localStorage.setItem('psyc_admin_pwd', pwdForm.newPwd) } catch {}
    setPwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' })
    setPwdMsg({ type: 'ok', text: '管理密码修改成功' })
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { key: 'capture' as SettingsTab, label: '采集设置', icon: Eye },
    { key: 'privacy' as SettingsTab, label: '隐私保护', icon: Shield },
    { key: 'warning' as SettingsTab, label: '预警配置', icon: Bell },
    { key: 'system' as SettingsTab, label: '系统选项', icon: SlidersHorizontal },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> {saved ? '已保存' : '保存设置'}
          </button>
          <button className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors">
            <RotateCcw className="w-4 h-4" /> 重置
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* 标签页导航 */}
        <div className="w-48 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                    : 'text-slate-400 hover:bg-warm-200/70 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 设置内容 */}
        <div className="flex-1 bg-white rounded-lg border border-warm-300 p-6">
          {activeTab === 'capture' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-500" />
                数据采集设置
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">鼠标采样率 (Hz)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={captureSettings.mouseSampleRate}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseSampleRate: parseInt(e.target.value) })}
                      className="flex-1 accent-orange-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.mouseSampleRate}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseSampleRate: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-warm-100 border border-warm-300 rounded px-2 py-1 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">鼠标追踪时长 (秒)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="120"
                      value={captureSettings.mouseDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseDuration: parseInt(e.target.value) })}
                      className="flex-1 accent-orange-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.mouseDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseDuration: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-warm-100 border border-warm-300 rounded px-2 py-1 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">摄像头帧率 (FPS)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="15"
                      max="60"
                      value={captureSettings.cameraFps}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraFps: parseInt(e.target.value) })}
                      className="flex-1 accent-orange-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.cameraFps}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraFps: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-warm-100 border border-warm-300 rounded px-2 py-1 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">摄像头分辨率</label>
                  <select
                    value={captureSettings.cameraResolution}
                    onChange={(e) => setCaptureSettings({ ...captureSettings, cameraResolution: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="320x240">320x240</option>
                    <option value="640x480">640x480</option>
                    <option value="1280x720">1280x720</option>
                    <option value="1920x1080">1920x1080</option>
                  </select>
                </div>

<div>
                  <label className="block text-sm text-slate-400 mb-2">视频采集时长 (秒)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="180"
                      value={captureSettings.cameraDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraDuration: parseInt(e.target.value) })}
                      className="flex-1 accent-orange-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.cameraDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraDuration: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-warm-100 border border-warm-300 rounded px-2 py-1 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* —— 鼠标轨迹调试 —— */}
              <div className="bg-warm-100 rounded-lg p-4 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-orange-500" />
                    鼠标轨迹调试
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={refreshTraj}
                      className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-1.5 rounded text-xs border border-warm-300 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> 刷新
                    </button>
                    <button
                      onClick={clearTraj}
                      disabled={trajRecords.length === 0}
                      className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-1.5 rounded text-xs border border-warm-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 清空轨迹
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  选择任意一条已采集的测评记录，可查看其鼠标轨迹行为指标摘要、采样点、坐标序列与相对时间，确认行为数据采集是否正常（测评第 3 步答题时全量采集每一次鼠标挪动与点击动作，用于行为特征分析）。
                </p>
                {trajRecords.length === 0 ? (
                  <div className="bg-white rounded-lg p-4 text-sm text-slate-400 border border-warm-300">
                    暂无已采集的鼠标轨迹数据。可先到「心理测评」完成一次测评（填问卷时轨迹自动采集、无需单独操作），再回到这里点「刷新」查看。
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 mb-3">
                      {trajRecords.slice().reverse().slice(0, 6).map(r => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedTrajId(r.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
                            selectedTrajId === r.id
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-500'
                              : 'bg-white border-warm-300 text-slate-500 hover:bg-warm-200/70'
                          }`}
                        >
                          <span className="font-medium">{r.id}</span>
                          <span className="text-xs text-slate-400">{r.studentId}</span>
                          <span className="text-xs text-slate-400 ml-auto">{r.time}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-warm-100 text-slate-500">
                            {r.mouseTrajectory?.length ?? 0} 点 · {r.cameraMode === 'degraded' ? '摄像头降级' : '采集正常'}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedTraj && (
                      <div className="bg-white rounded-lg border border-warm-300 p-3 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>记录 {selectedTraj.id} · 学号 {selectedTraj.studentId}</span>
                          <span>
                            采样点 <b className="text-orange-500">{selectedTraj.mouseTrajectory?.length ?? 0}</b>
                            <span className="mx-2 text-warm-400">·</span>
                            采集模式 {selectedTraj.cameraMode === 'degraded' ? '摄像头降级' : '正常'}
                          </span>
                        </div>
                        <MouseMetricsSummary traj={selectedTraj.mouseTrajectory ?? []} metrics={selectedTraj.mouseMetrics ?? null} />
                        <DebugTrajCanvas traj={selectedTraj.mouseTrajectory ?? []} />
                        <div className="bg-warm-100 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 text-xs text-slate-400 border-b border-warm-300/60 flex items-center justify-between">
                            <span>坐标序列（x, y, 相对时间 ms）</span>
                            <span>共 {selectedTraj.mouseTrajectory?.length ?? 0} 点</span>
                          </div>
                          <pre className="p-3 text-xs text-slate-500 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap break-all">
                            {(selectedTraj.mouseTrajectory ?? []).map(p => `(${p.x}, ${p.y}, ${p.t}ms)`).join('  ')}
                          </pre>
                        </div>
                        <p className="text-xs text-slate-400">
                          可见数据的小写字段含义：x/y 为页面内采样坐标，t 为相对采集起点的毫秒时间。这些数据同样可在「数据管理 → 查看明细」中查阅。
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* —— 摄像头调试 —— */}
              <div className="bg-warm-100 rounded-lg p-4 border border-warm-300">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-500" />
                  摄像头调试
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  点击「开始检测」会请求摄像头权限并启动实时预览，模拟测评第 3 步的面部数据采集（320×240，采集窗口 2.5 秒）。若本机无摄像头、权限被拒绝或 8 秒等待超时，将提示降级信息——与正式测评的降级逻辑一致，答题流程不受影响。
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={testCamera}
                    disabled={camStatus === 'testing'}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    {camStatus === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                    {camStatus === 'testing' ? '检测中…' : camStatus === 'normal' ? '重新检测' : '开始检测'}
                  </button>
                  {(camStatus === 'normal' || camStatus === 'degraded') && (
                    <button
                      onClick={endCameraDebug}
                      className="bg-white hover:bg-warm-200 text-slate-500 px-4 py-2 rounded-lg text-sm border border-warm-300 transition-colors"
                    >
                      结束调试
                    </button>
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-3 text-sm border ${
                    camStatus === 'normal'
                      ? 'bg-green-500/10 text-green-600 border-green-500/30'
                      : camStatus === 'degraded'
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                        : camStatus === 'testing'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                          : 'bg-white text-slate-400 border-warm-300'
                  }`}
                >
                  {camMsg}
                </div>
                {camStatus === 'normal' && (
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full max-w-sm rounded-lg border border-warm-300 mt-3"
                    style={{ background: '#EAE3D5' }}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                隐私保护设置
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'localProcessing', label: '本地处理', desc: '所有数据处理在本地完成，不上传至云端', icon: Lock },
                  { key: 'deleteRaw', label: '删除原始数据', desc: '测评结束后自动删除原始视频和鼠标轨迹数据', icon: Eye },
                  { key: 'encryptStorage', label: '加密存储', desc: '使用AES-256加密存储测评结果', icon: Lock },
                  { key: 'anonymize', label: '匿名化处理', desc: '学号等敏感信息经过哈希处理', icon: Eye },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.key} className="flex items-start gap-3 p-3 bg-warm-100 rounded-lg">
                      <input
                        type="checkbox"
                        checked={privacySettings[item.key as keyof typeof privacySettings]}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, [item.key]: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-orange-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'warning' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                预警阈值配置
              </h2>

              <div className="space-y-4">
                <div className="bg-warm-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">PHQ-9 阈值</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">轻度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Mild}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Mild: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">中度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Moderate}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Moderate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">重度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Severe}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Severe: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-warm-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">GAD-7 阈值</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">轻度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Mild}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Mild: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">中度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Moderate}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Moderate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">重度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Severe}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Severe: parseInt(e.target.value) || 0 })}
                        className="w-full bg-warm-100 border border-warm-300 rounded px-3 py-2 text-slate-500 text-sm text-center focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-warm-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">通知设置</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={warningSettings.notifyEmail}
                        onChange={(e) => setWarningSettings({ ...warningSettings, notifyEmail: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      <span className="text-sm text-slate-500">高风险时发送邮件通知</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={warningSettings.notifyPush}
                        onChange={(e) => setWarningSettings({ ...warningSettings, notifyPush: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 rounded"
                      />
                      <span className="text-sm text-slate-500">高风险时发送推送通知</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                系统选项
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">数据存储路径</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={systemSettings.dataPath}
                      onChange={(e) => setSystemSettings({ ...systemSettings, dataPath: e.target.value })}
                      className="flex-1 bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
                    />
                    <button className="bg-white hover:bg-warm-200 text-slate-500 px-3 py-2 rounded-lg border border-warm-300 transition-colors">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">主题</label>
                  <select
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({ ...systemSettings, theme: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-500 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="light">浅色</option>
                    <option value="dark">深色</option>
                    <option value="auto">自动</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.autoSave}
                    onChange={(e) => setSystemSettings({ ...systemSettings, autoSave: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-700 font-medium">自动保存</div>
                    <p className="text-xs text-slate-500">测评完成后自动保存结果</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.debugMode}
                    onChange={(e) => setSystemSettings({ ...systemSettings, debugMode: e.target.checked })}
                    className="w-4 h-4 accent-orange-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-700 font-medium">调试模式</div>
                    <p className="text-xs text-slate-500">启用详细的日志输出和调试信息</p>
                  </div>
                </div>

                {/* 管理密码 */}
                <div className="bg-warm-100 rounded-lg p-4 border border-warm-300">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-orange-500" />
                    管理密码
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">数据管理、系统设置、关于系统页面的访问密码（至少 6 位）</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">原密码</label>
                      <input
                        type="password"
                        value={pwdForm.oldPwd}
                        onChange={(e) => setPwdForm({ ...pwdForm, oldPwd: e.target.value })}
                        className="w-full bg-white border border-warm-300 rounded px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                        placeholder="原密码"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">新密码</label>
                      <input
                        type="password"
                        value={pwdForm.newPwd}
                        onChange={(e) => setPwdForm({ ...pwdForm, newPwd: e.target.value })}
                        className="w-full bg-white border border-warm-300 rounded px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                        placeholder="至少 6 位"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">确认新密码</label>
                        <input
                          type="password"
                          value={pwdForm.confirmPwd}
                          onChange={(e) => setPwdForm({ ...pwdForm, confirmPwd: e.target.value })}
                          className="w-full bg-white border border-warm-300 rounded px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                          placeholder="再次输入"
                        />
                      </div>
                      <button
                        onClick={handleChangePassword}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg text-sm transition-colors shrink-0"
                      >
                        修改
                      </button>
                    </div>
                  </div>
                  {pwdMsg && (
                    <p className={`text-xs mt-2 ${pwdMsg.type === 'ok' ? 'text-green-500' : 'text-red-500'}`}>{pwdMsg.text}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

