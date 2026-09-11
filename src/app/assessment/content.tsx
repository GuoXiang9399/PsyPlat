'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import {
  FileText,
  LayoutDashboard,
  Database,
  Settings,
  Info,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User,
  Shield,
  RotateCcw,
  Maximize,
  Minimize,
  BarChart3
} from 'lucide-react'
import {
  AssessmentRecord,
  TrajectoryPoint,
  phq9Questions,
  gad7Questions,
  riskOptions,
  scoreOf,
  appendRecord,
  makeRecordId,
  computeMouseMetrics,
  behaviorSignalsOf
} from '@/lib/records'
import {
  cssrsQuestions,
  cssrsOptions,
  nssiQuestions,
  nssiHasOptions,
  nssiFreqOptions,
  pss10Questions,
  pss10Options,
  psqiDisturbanceItems,
  psqiFreqOptions,
  psqiQualityOptions,
  sias6Questions,
  sias6Options,
  aslecItems,
  aslecImpactOptions,
  scorePss10,
  scorePsqi,
  scoreSias6,
  scoreAslec,
  buildRisk,
  emptyPsqiAnswers
} from '@/lib/scales'
import type { PsqiAnswers } from '@/lib/scales'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'

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

const stepLabels = ['基本信息', '知情同意', '心理测评', '结束']

export function AssessmentContent() {
  const [currentStep, setCurrentStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [basicInfo, setBasicInfo] = useState({ studentId: '', age: '', gender: 'male', grade: '', educationLevel: '本科', major: '' })
  const [phq9Answers, setPhq9Answers] = useState<number[]>(new Array(9).fill(-1))
  const [gad7Answers, setGad7Answers] = useState<number[]>(new Array(7).fill(-1))
  // 补充量表：自杀风险筛查（C-SSRS + NSSI）
  const [cssrsAnswers, setCssrsAnswers] = useState<number[]>(new Array(4).fill(-1))
  const [nssiAnswers, setNssiAnswers] = useState<number[]>([-1, -1])
  // 补充量表：扩充画像（PSS-10 / PSQI / SIAS-6 / ASLEC）
  const [pss10Answers, setPss10Answers] = useState<number[]>(new Array(10).fill(-1))
  const [psqiAnswers, setPsqiAnswers] = useState(emptyPsqiAnswers)
  const [sias6Answers, setSias6Answers] = useState<number[]>(new Array(6).fill(-1))
  const [aslecAnswers, setAslecAnswers] = useState<number[]>(new Array(27).fill(0))
  const [mouseProgress, setMouseProgress] = useState(0)
  const [mouseStatus, setMouseStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [cameraProgress, setCameraProgress] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 鼠标轨迹采样：记录 {x, y, t(相对首点毫秒)}，用于数据管理页查看行为数据
  const mouseTrajRef = useRef<TrajectoryPoint[]>([])
  const mouseTimerRef = useRef<number | null>(null)
  const stopMouseTrackRef = useRef<(() => void) | null>(null)
  // 摄像头采集模式（index 3 统一改造：真实 getUserMedia）
  const cameraModeRef = useRef<'normal' | 'degraded'>('normal')
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraTimerRef = useRef<number | null>(null)

  const totalSteps = 4

  // 组件卸载时清理鼠标采样与摄像头资源
  useEffect(() => {
    return () => {
      if (stopMouseTrackRef.current) stopMouseTrackRef.current()
      if (mouseTimerRef.current) window.clearTimeout(mouseTimerRef.current)
      stopCameraStream()
      if (cameraTimerRef.current) window.clearTimeout(cameraTimerRef.current)
    }
  }, [])

useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // 进入心理测评步骤时，鼠标轨迹与面部数据自动随答题一并采集，无需使用者单独操作
  useEffect(() => {
    if (currentStep !== 3) return
    if (mouseStatus === 'idle') startMouseTracking()
    if (cameraStatus === 'idle') startCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (e) {
      console.warn('全屏切换失败，请检查浏览器权限', e)
    }
  }

const supplementaryDone = () =>
    cssrsAnswers.every(a => a >= 0) &&
    nssiAnswers[0] >= 0 &&
    (nssiAnswers[0] === 0 || nssiAnswers[1] >= 0) &&
    pss10Answers.every(a => a >= 0) &&
    psqiAnswers.latency >= 0 && psqiAnswers.hours > 0 &&
    sias6Answers.every(a => a >= 0)

  const canProceed = () => {
    switch (currentStep) {
      case 1: return basicInfo.studentId.trim().length > 0
      case 2: return agreed
      case 3: return (
        phq9Answers.every(a => a >= 0) &&
        gad7Answers.every(a => a >= 0) &&
        supplementaryDone() &&
        cameraStatus === 'completed'
      )
      default: return true
    }
  }

const handleNext = () => {
    if (currentStep === 3) {
      // 提交测评前停止轨迹采样，确保轨迹覆盖整个答题过程
      finishMouseTrack()
      // 量表全部作答且数据采集完成后，归档为一条记录（供数据管理页查看逐题结果与行为数据）
      const traj = mouseTrajRef.current
      const psqiResult = scorePsqi(psqiAnswers)
      const aslecResult = scoreAslec(aslecAnswers)
      const riskResult = buildRisk(phq9Answers, gad7Answers, cssrsAnswers, nssiAnswers)
      const metrics = computeMouseMetrics(traj)
      const record: AssessmentRecord = {
        id: makeRecordId(),
        studentId: basicInfo.studentId.trim(),
        age: basicInfo.age,
        gender: basicInfo.gender,
        educationLevel: basicInfo.educationLevel,
        grade: basicInfo.grade,
        major: basicInfo.major,
        time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        phq9: [...phq9Answers],
        gad7: [...gad7Answers],
        phq9Score: scoreOf(phq9Answers),
        gad7Score: scoreOf(gad7Answers),
        risk: riskResult.label,
        riskFlags: riskResult.flags,
        cssrs: [...cssrsAnswers],
        cssrsPositive: cssrsAnswers.filter(v => v === 1).length,
        nssi: [...nssiAnswers],
        pss10: [...pss10Answers],
        pss10Score: scorePss10(pss10Answers),
        psqi: { ...psqiAnswers },
        psqiComps: psqiResult.comps,
        psqiScore: psqiResult.total,
        sias6: [...sias6Answers],
        sias6Score: scoreSias6(sias6Answers),
        aslec: [...aslecAnswers],
        aslecScore: aslecResult.total,
        aslecCount: aslecResult.count,
        status: 'completed',
        mouseTrajectory: traj.map(p => ({ x: p.x, y: p.y, t: Math.max(0, p.t - (traj[0] ? traj[0].t : 0)), k: p.k })),
        mouseSamples: traj.length,
        cameraMode: cameraModeRef.current,
        // 行为动力学指标与信号（依据《鼠标轨迹心理学研究调研》落地；旧记录无此字段）
        mouseMetrics: metrics,
        behaviorSignals: behaviorSignalsOf(metrics),
      }
      appendRecord(record)
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

const resetAll = () => {
    if (stopMouseTrackRef.current) stopMouseTrackRef.current()
    if (mouseTimerRef.current) window.clearTimeout(mouseTimerRef.current)
    mouseTrajRef.current = []
    stopMouseTrackRef.current = null
    stopCameraStream()
    if (cameraTimerRef.current) window.clearTimeout(cameraTimerRef.current)
    setCurrentStep(1)
    setAgreed(false)
    setBasicInfo({ studentId: '', age: '', gender: 'male', grade: '', educationLevel: '本科', major: '' })
    setPhq9Answers(new Array(9).fill(-1))
    setGad7Answers(new Array(7).fill(-1))
    setCssrsAnswers(new Array(4).fill(-1))
    setNssiAnswers([-1, -1])
    setPss10Answers(new Array(10).fill(-1))
    setPsqiAnswers(emptyPsqiAnswers())
    setSias6Answers(new Array(6).fill(-1))
    setAslecAnswers(new Array(27).fill(0))
    setMouseStatus('idle')
    setMouseProgress(0)
    setCameraStatus('idle')
    setCameraProgress(0)
  }

  // 进入第 3 步时自动开始鼠标行为采集（全量模式）：监听 document 上每一次 mousemove 与 click，
  // 记录鼠标挪动的所有动作与点击动作，直到提交测评（handleNext）时停止，覆盖整个答题过程
  const MOUSE_MAX_SAMPLES = 50000 // 安全上限：防止极端场景写入量过大（正常答题数分钟内远达不到）
  const startMouseTracking = () => {
    setMouseStatus('running')
    setMouseProgress(0)
    mouseTrajRef.current = []
    const t0 = performance.now()
    const push = (e: MouseEvent, k: 'm' | 'c') => {
      if (mouseTrajRef.current.length >= MOUSE_MAX_SAMPLES) return
      mouseTrajRef.current.push({
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
        t: Math.round(performance.now() - t0),
        k,
      })
    }
    const onMove = (e: MouseEvent) => push(e, 'm')
    const onClick = (e: MouseEvent) => push(e, 'c')
    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick)
    const stop = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick)
    }
    stopMouseTrackRef.current = stop
    // 全量采集：不设 80ms 节流、不设 60 点上限，提交测评（handleNext）时停止
  }

  const finishMouseTrack = () => {
    if (stopMouseTrackRef.current) {
      stopMouseTrackRef.current()
      stopMouseTrackRef.current = null
    }
    if (mouseTimerRef.current) {
      window.clearTimeout(mouseTimerRef.current)
      mouseTimerRef.current = null
    }
    setMouseStatus('completed')
    setMouseProgress(100)
  }

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop())
      cameraStreamRef.current = null
    }
  }

  // 面部数据采集：优先真实调用 getUserMedia；权限拒绝/无摄像头/桌面环境不可用时自动降级，
  // 以约 2.5s 的采集窗口完成状态流转，保证测评流程不被权限问题卡死
  const startCamera = () => {
    setCameraStatus('running')
    setCameraProgress(0)
    cameraModeRef.current = 'normal'
    let settled = false
    const settle = (mode: 'normal' | 'degraded') => {
      if (settled) return
      settled = true
      cameraModeRef.current = mode
      stopCameraStream()
      setCameraProgress(100)
      setCameraStatus('completed')
    }
    const failTimer = window.setTimeout(() => settle('degraded'), 8000)
    cameraTimerRef.current = failTimer
    const runWindow = () => {
      // 保持摄像头打开约 2.5s 的采集窗口，随后关闭轨道并完成
      cameraTimerRef.current = window.setTimeout(() => settle('normal'), 2500)
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // 环境不支持（如部分 WebView/桌面环境），降级并快速完成
        window.clearTimeout(failTimer)
        settle('degraded')
        return
      }
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
        .then((stream) => {
          if (settled) {
            stream.getTracks().forEach(t => t.stop())
            return
          }
          window.clearTimeout(failTimer)
          cameraStreamRef.current = stream
          runWindow()
        })
        .catch(() => {
          window.clearTimeout(failTimer)
          settle('degraded')
        })
    } catch (e) {
      window.clearTimeout(failTimer)
      settle('degraded')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-warm-300">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                基本信息
              </h3>
              <p className="text-sm text-slate-500 mb-4">请填写以下基本信息（标注 * 的为必填项），信息仅用于测评结果归档。</p>
<div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">学号 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={basicInfo.studentId}
                    onChange={(e) => setBasicInfo({ ...basicInfo, studentId: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="请输入学号"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">年龄</label>
                  <input
                    type="number"
                    value={basicInfo.age}
                    onChange={(e) => setBasicInfo({ ...basicInfo, age: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="请输入年龄"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">性别</label>
                  <select
                    value={basicInfo.gender}
                    onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">学习层次</label>
                  <select
                    value={basicInfo.educationLevel}
                    onChange={(e) => setBasicInfo({ ...basicInfo, educationLevel: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="本科">本科</option>
                    <option value="硕士研究生">硕士研究生</option>
                    <option value="博士研究生">博士研究生</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">年级</label>
                  <input
                    type="text"
                    value={basicInfo.grade}
                    onChange={(e) => setBasicInfo({ ...basicInfo, grade: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="如：2026"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">专业</label>
                  <input
                    type="text"
                    value={basicInfo.major}
                    onChange={(e) => setBasicInfo({ ...basicInfo, major: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder="请输入专业"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-warm-300">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-500" />
                知情同意书
              </h3>
              <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                <p>本系统旨在通过多模态数据采集（包括量表评估、鼠标行为追踪和面部微表情分析）进行心理问题早期预警。</p>
                <p>在参与测评前，请您了解以下事项：</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>所有数据仅用于心理健康评估目的</li>
                  <li>您的个人信息将被加密存储和匿名化处理</li>
                  <li>您可以随时终止测评过程</li>
                  <li>测评结果仅供参考，不作为临床诊断依据</li>
                  <li>数据采集过程不会记录可识别个人身份的视频图像</li>
                </ul>
                <p className="text-slate-400">请仔细阅读以上内容，确认理解并同意后继续。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setAgreed(true)}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                  agreed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white text-slate-500 border border-warm-300 hover:bg-warm-200'
                }`}
              >
                <Check className="w-4 h-4" /> 我同意
              </button>
              <button
                onClick={() => setAgreed(false)}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                  !agreed
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white text-slate-500 border border-warm-300 hover:bg-warm-200'
                }`}
              >
                <X className="w-4 h-4" /> 我不同意
              </button>
            </div>
          </div>
        )

      case 3:
        {
const answeredCount =
            phq9Answers.filter(a => a >= 0).length +
            gad7Answers.filter(a => a >= 0).length +
            cssrsAnswers.filter(a => a >= 0).length +
            (nssiAnswers[0] >= 0 ? (nssiAnswers[0] === 0 || nssiAnswers[1] >= 0 ? 2 : 1) : 0) +
            pss10Answers.filter(a => a >= 0).length +
            sias6Answers.filter(a => a >= 0).length
          const totalQuestions = phq9Questions.length + gad7Questions.length + 4 + 2 + pss10Questions.length + sias6Questions.length
          const nssiAnswered = () => nssiAnswers[0] >= 0 ? (nssiAnswers[0] === 0 || nssiAnswers[1] >= 0 ? 2 : 1) : 0
          const psqiValid = () => psqiAnswers.latency >= 0 && psqiAnswers.hours > 0
          const setPsqi = (patch: Partial<PsqiAnswers>) => setPsqiAnswers(prev => ({ ...prev, ...patch }))

return (
            <div className="space-y-6">
{/* 测评进度汇总 */}
              <div className="bg-white rounded-lg p-4 border border-warm-300 flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  量表答题进度：<span className="text-orange-500 font-semibold">{answeredCount}/{totalQuestions}</span>
                </span>
                <span className="text-slate-500">
                  温馨提示：作答过程中系统将自动同步采集行为与生理数据，无需额外操作。
                </span>
              </div>

              {/* PHQ-9 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    PHQ-9 抑郁症筛查量表
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${phq9Answers.every(a => a >= 0) ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {phq9Answers.every(a => a >= 0) ? '已完成' : `已答 ${phq9Answers.filter(a => a >= 0).length}/9`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">在过去两周里，以下问题困扰您的频率如何？</p>
                <div className="space-y-4">
                  {phq9Questions.map((question, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">
                        {index + 1}. {question}
                      </div>
                      <div className="flex gap-2">
                        {riskOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...phq9Answers]
                              newAnswers[index] = optionIndex
                              setPhq9Answers(newAnswers)
                            }}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              phq9Answers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

{/* GAD-7 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    GAD-7 广泛性焦虑量表
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${gad7Answers.every(a => a >= 0) ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {gad7Answers.every(a => a >= 0) ? '已完成' : `已答 ${gad7Answers.filter(a => a >= 0).length}/7`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">在过去两周里，以下问题困扰您的频率如何？</p>
                <div className="space-y-4">
                  {gad7Questions.map((question, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">
                        {index + 1}. {question}
                      </div>
                      <div className="flex gap-2">
                        {riskOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...gad7Answers]
                              newAnswers[index] = optionIndex
                              setGad7Answers(newAnswers)
                            }}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              gad7Answers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* C-SSRS 哥伦比亚自杀严重度评定量表 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    C-SSRS 哥伦比亚自杀严重度评定量表
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${cssrsAnswers.every(a => a >= 0) ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {cssrsAnswers.every(a => a >= 0) ? '已完成' : `已答 ${cssrsAnswers.filter(a => a >= 0).length}/4`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">请根据过去一个月内的实际情况作答（本次筛查结果仅用于预警参考）。</p>
                <div className="space-y-4">
                  {cssrsQuestions.map((question, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">
                        {index + 1}. {question}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        {cssrsOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...cssrsAnswers]
                              newAnswers[index] = optionIndex
                              setCssrsAnswers(newAnswers)
                            }}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              cssrsAnswers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NSSI 非自杀性自伤 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    NSSI 非自杀性自伤筛查
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${nssiAnswered() >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {nssiAnswered() >= 2 ? '已完成' : `已答 ${nssiAnswered()}/2`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">请根据过去一年内的实际情况作答。</p>
                <div className="space-y-4">
                  <div className="bg-warm-100 rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-3">1. {nssiQuestions[0]}</div>
                    <div className="flex gap-2 max-w-sm">
                      {nssiHasOptions.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => setNssiAnswers([optionIndex, optionIndex === 0 ? 0 : nssiAnswers[1]])}
                          className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                            nssiAnswers[0] === optionIndex
                              ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                              : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  {nssiAnswers[0] === 1 && (
                    <div className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">2. {nssiQuestions[1]}</div>
                      <div className="flex gap-2 flex-wrap">
                        {nssiFreqOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => setNssiAnswers([1, optionIndex])}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              nssiAnswers[1] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PSS-10 感知压力量表 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    PSS-10 感知压力量表
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${pss10Answers.every(a => a >= 0) ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {pss10Answers.every(a => a >= 0) ? '已完成' : `已答 ${pss10Answers.filter(a => a >= 0).length}/10`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">过去一个月里，以下情况发生的频率如何？（标注 * 的题目为反向计分题）</p>
                <div className="space-y-4">
                  {pss10Questions.map((question, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">
                        {index + 1}. {question}
                        {[3, 4, 6, 7].includes(index) && <span className="text-red-400 text-xs ml-1">（反向计分）</span>}
                      </div>
                      <div className="flex gap-2">
                        {pss10Options.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...pss10Answers]
                              newAnswers[index] = optionIndex
                              setPss10Answers(newAnswers)
                            }}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              pss10Answers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PSQI 匹兹堡睡眠质量指数 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    PSQI 匹兹堡睡眠质量指数
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${psqiValid() ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {psqiValid() ? '已完成' : '请完善睡眠信息'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">请根据过去一个月的睡眠情况填写。</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">通常几点上床睡觉（小时 0-23）</label>
                    <input type="number" min={0} max={23} value={psqiAnswers.bed}
                      onChange={(e) => setPsqi({ bed: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">通常需要多少分钟入睡</label>
                    <input type="number" min={0} max={240} value={psqiAnswers.latency}
                      onChange={(e) => setPsqi({ latency: Math.max(0, Math.min(240, Number(e.target.value) || 0)) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">通常几点起床（小时 0-23）</label>
                    <input type="number" min={0} max={23} value={psqiAnswers.wake}
                      onChange={(e) => setPsqi({ wake: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">每晚实际睡眠大约几小时（0-12）</label>
                    <input type="number" min={0} max={12} value={psqiAnswers.hours}
                      onChange={(e) => setPsqi({ hours: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
                <div className="text-sm text-slate-500 mb-2">过去一个月里，以下情况发生频率如何？</div>
                <div className="space-y-3">
                  {psqiDisturbanceItems.map((item, i) => (
                    <div key={i} className="bg-warm-100 rounded-lg p-3">
                      <div className="text-xs text-slate-600 mb-2">{i + 1}. {item}</div>
                      <div className="flex gap-2">
                        {psqiFreqOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const d = [...psqiAnswers.d]
                              d[i] = optionIndex
                              setPsqi({ d })
                            }}
                            className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${
                              psqiAnswers.d[i] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">总体睡眠质量</label>
                    <select value={psqiAnswers.quality}
                      onChange={(e) => setPsqi({ quality: Number(e.target.value) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500">
                      {psqiQualityOptions.map((o, i) => <option key={i} value={i}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">服用催眠药物的频率</label>
                    <select value={psqiAnswers.meds}
                      onChange={(e) => setPsqi({ meds: Number(e.target.value) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500">
                      {psqiFreqOptions.map((o, i) => <option key={i} value={i}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">白天保持清醒的困难程度</label>
                    <select value={psqiAnswers.day}
                      onChange={(e) => setPsqi({ day: Number(e.target.value) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500">
                      {psqiFreqOptions.map((o, i) => <option key={i} value={i}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1">做事时精力不足的频率</label>
                    <select value={psqiAnswers.energy}
                      onChange={(e) => setPsqi({ energy: Number(e.target.value) })}
                      className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500">
                      {psqiFreqOptions.map((o, i) => <option key={i} value={i}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SIAS-6 社交焦虑简化筛查 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    SIAS-6 社交焦虑简化筛查
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${sias6Answers.every(a => a >= 0) ? 'bg-green-500/20 text-green-400' : 'bg-warm-200 text-slate-500'}`}>
                    {sias6Answers.every(a => a >= 0) ? '已完成' : `已答 ${sias6Answers.filter(a => a >= 0).length}/6`}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">过去两周里，以下情况与您的符合程度如何？</p>
                <div className="space-y-4">
                  {sias6Questions.map((question, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                      <div className="flex gap-2">
                        {sias6Options.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...sias6Answers]
                              newAnswers[index] = optionIndex
                              setSias6Answers(newAnswers)
                            }}
                            className={`flex-1 py-2 px-2 rounded text-xs transition-colors ${
                              sias6Answers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ASLEC 青少年生活事件量表 */}
              <div className="bg-white rounded-lg p-6 border border-warm-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                    ASLEC 青少年生活事件量表
                  </h3>
                  <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">共 {aslecItems.length} 项</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">过去一年内是否发生过以下事件？若发生过，请评估其对你的影响程度。</p>
                <div className="space-y-3">
                  {aslecItems.map((item, index) => (
                    <div key={index} className="bg-warm-100 rounded-lg p-3">
                      <div className="text-xs text-slate-600 mb-2">{index + 1}. {item}</div>
                      <div className="flex gap-2 flex-wrap">
                        {aslecImpactOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              const newAnswers = [...aslecAnswers]
                              newAnswers[index] = optionIndex
                              setAslecAnswers(newAnswers)
                            }}
                            className={`py-1.5 px-3 rounded text-xs transition-colors ${
                              aslecAnswers[index] === optionIndex
                                ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                                : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

      case 4:
        return (
          <div className="bg-white rounded-lg border border-warm-300 p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">本次心理测评已完成</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
              感谢您的配合！您的测评数据已安全提交，将由心理站工作人员统一查看与跟进，请您耐心等待后续反馈。
            </p>
            <button
              onClick={resetAll}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2 text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> 重新开始测评
            </button>
          </div>
        )

      default:
        return null
    }
  }

return (
    <div className="space-y-6">
      {/* 测评全屏工具栏（覆盖整个心理测评流程，步骤 1-4 通用） */}
      <div className="bg-white rounded-lg p-4 border border-warm-300 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
          <Maximize className="w-4 h-4 text-orange-500 shrink-0" />
          <span className="truncate">
            心理测评全流程可开启全屏模式，不受其他界面干扰。
          </span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          {isFullscreen
            ? <><Minimize className="w-4 h-4" /> 退出全屏</>
            : <><Maximize className="w-4 h-4" /> 全屏模式</>}
        </button>
      </div>
      {isFullscreen && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2 text-xs text-orange-600">
          已进入全屏模式，测评过程中不会触碰到屏幕其他区域；可按 Esc 键或点击上方按钮退出。
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="bg-white rounded-lg p-4 border border-warm-300">
<div className="flex items-center">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1
            return (
              <Fragment key={step}>
                <div className="flex flex-col items-center w-20">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step < currentStep
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : step === currentStep
                      ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
                      : 'bg-warm-100 text-slate-500 border border-warm-300'
                  }`}>
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${
                    step === currentStep ? 'text-orange-500' : step < currentStep ? 'text-green-400' : 'text-slate-500'
                  }`}>
                    {stepLabels[step - 1]}
                  </span>
                </div>
                {step < totalSteps && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-500/30' : 'bg-warm-200'
                  }`} />
                )}
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      {renderStepContent()}

      {/* 底部导航 */}
      {currentStep < totalSteps && (
        <div className="flex justify-between pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="bg-white hover:bg-warm-200 disabled:opacity-50 text-slate-500 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-warm-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 上一步
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-warm-200 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            {currentStep === 3 ? '完成测评' : '下一步'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

