'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import {
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
  ClipboardList
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
  buildRisk
} from '@/lib/scales'
import type { PsqiAnswers } from '@/lib/scales'
import {
  AssessmentSettings,
  CustomScale,
  ScaleKey,
  loadAssessSettings,
  blankPsqiAnswers,
  psqiFullyAnswered
} from '@/lib/appSettings'
import { saveVideo } from '@/lib/videoStore'
import { useT, tFmt } from '@/lib/i18n'

// 步骤 3 的问卷分页：按启用顺序排列，不向用户展示量表名称
type QPage =
  | { type: 'phq9' } | { type: 'gad7' } | { type: 'cssrs' } | { type: 'nssi' }
  | { type: 'pss10' } | { type: 'psqi' } | { type: 'sias6' } | { type: 'aslec' }
  | { type: 'custom'; custom: CustomScale }

const BUILTIN_ORDER: ScaleKey[] = ['phq9', 'gad7', 'cssrs', 'nssi', 'pss10', 'psqi', 'sias6', 'aslec']

const PAGE_INTRO: Record<string, string> = {
  phq9: '在过去两周里，以下问题困扰您的频率如何？',
  gad7: '在过去两周里，以下问题困扰您的频率如何？',
  cssrs: '请根据过去一个月内的实际情况作答。',
  nssi: '请根据过去一年内的实际情况作答。',
  pss10: '过去一个月里，以下情况发生的频率如何？',
  psqi: '请根据过去一个月的睡眠情况填写。',
  sias6: '过去两周里，以下情况与您的符合程度如何？',
  aslec: '过去一年内是否发生过以下事件？若发生过，请评估其影响程度。',
  custom: '请根据您的实际情况作答。'
}

export function AssessmentContent() {
  const { t } = useT()
  const [settings] = useState<AssessmentSettings>(() => loadAssessSettings())
  const [currentStep, setCurrentStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [basicInfo, setBasicInfo] = useState({ studentId: '', age: '', gender: 'male', grade: '', educationLevel: 'undergraduate', major: '' })
  const [phq9Answers, setPhq9Answers] = useState<number[]>(new Array(9).fill(-1))
  const [gad7Answers, setGad7Answers] = useState<number[]>(new Array(7).fill(-1))
  const [cssrsAnswers, setCssrsAnswers] = useState<number[]>(new Array(4).fill(-1))
  const [nssiAnswers, setNssiAnswers] = useState<number[]>([-1, -1])
  const [pss10Answers, setPss10Answers] = useState<number[]>(new Array(10).fill(-1))
  const [psqiAnswers, setPsqiAnswers] = useState<PsqiAnswers>(() => blankPsqiAnswers())
  const [sias6Answers, setSias6Answers] = useState<number[]>(new Array(6).fill(-1))
  const [aslecAnswers, setAslecAnswers] = useState<number[]>(new Array(27).fill(-1))
  // 自定义量表作答（key 为量表 id，值与条目一一对应，-1 未作答）
  const [customAnswers, setCustomAnswers] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(loadAssessSettings().customScales.map(s => [s.id, new Array(s.items.length).fill(-1)]))
  )
  const [isFullscreen, setIsFullscreen] = useState(false)
  // 步骤 3 问卷分页游标
  const [page, setPage] = useState(0)

  // 分页问卷列表：仅启用量表 + 自定义量表
  const pages: QPage[] = [
    ...BUILTIN_ORDER.filter(k => settings.enabledScales[k]).map(k => ({ type: k }) as QPage),
    ...settings.customScales.map(s => ({ type: 'custom', custom: s }) as QPage),
  ]
  const lastPage = pages.length - 1
  const currentPage = pages[Math.min(page, Math.max(0, lastPage))]

  // 鼠标轨迹采样：记录 {x, y, t(相对首点毫秒)}，用于数据管理页查看行为数据
  const mouseTrajRef = useRef<TrajectoryPoint[]>([])
  const mouseActiveRef = useRef(false)
  const stopMouseTrackRef = useRef<(() => void) | null>(null)
  // 摄像头：知情同意后一次性预授权（无感），步骤 3 答题全程静默录制
  const cameraModeRef = useRef<'normal' | 'degraded'>('normal')
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const totalSteps = 4
  const stepLabels = [t('step1'), t('step2'), t('step3'), t('step4')]

  // 组件卸载时清理鼠标采样与摄像头资源
  useEffect(() => {
    return () => {
      if (stopMouseTrackRef.current) stopMouseTrackRef.current()
      try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop() } catch {}
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
        cameraStreamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

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

  // —— 摄像头预授权：用户点击「我同意」时一次性请求权限 ——
  const requestCameraOnConsent = () => {
    setAgreed(true)
    if (!settings.camera) {
      cameraModeRef.current = 'degraded'
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      cameraModeRef.current = 'degraded'
      return
    }
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (cameraStreamRef.current) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        cameraStreamRef.current = stream
        cameraModeRef.current = 'normal'
      })
      .catch(() => {
        cameraModeRef.current = 'degraded'
      })
  }

  const declineConsent = () => {
    setAgreed(false)
    stopCameraStream()
    cameraModeRef.current = 'degraded'
  }

  // —— 鼠标轨迹采集（步骤 3 答题全程） ——
  const MOUSE_MAX_SAMPLES = 50000
  const startMouseTracking = () => {
    if (mouseActiveRef.current) return
    mouseActiveRef.current = true
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
    stopMouseTrackRef.current = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick)
      mouseActiveRef.current = false
    }
  }

  const finishMouseTrack = () => {
    if (stopMouseTrackRef.current) {
      stopMouseTrackRef.current()
      stopMouseTrackRef.current = null
    }
  }

  // —— 摄像头录制（步骤 3 答题全程静默进行，用户无感） ——
  const startRecording = () => {
    const stream = cameraStreamRef.current
    if (!stream || typeof MediaRecorder === 'undefined') {
      cameraModeRef.current = 'degraded'
      return
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') return
    try {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start(2000)
      recorderRef.current = rec
      cameraModeRef.current = 'normal'
    } catch {
      cameraModeRef.current = 'degraded'
    }
  }

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current
      if (!rec || rec.state === 'inactive') {
        stopCameraStream()
        resolve(null)
        return
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' })
        recorderRef.current = null
        stopCameraStream()
        resolve(blob.size > 0 ? blob : null)
      }
      try {
        rec.stop()
      } catch {
        recorderRef.current = null
        stopCameraStream()
        resolve(null)
      }
    })
  }

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop())
      cameraStreamRef.current = null
    }
  }

  // 进入步骤 3 时：自动开始鼠标采样与摄像头录制（全程无感）
  useEffect(() => {
    if (currentStep !== 3) return
    if (settings.mouseTracking) startMouseTracking()
    startRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  // —— 分页问卷完成判定（当前页全部作答才可进入下一份） ——
  const pageComplete = (p: QPage): boolean => {
    switch (p.type) {
      case 'phq9': return phq9Answers.every(a => a >= 0)
      case 'gad7': return gad7Answers.every(a => a >= 0)
      case 'cssrs': return cssrsAnswers.every(a => a >= 0)
      case 'nssi': return nssiAnswers[0] >= 0 && (nssiAnswers[0] === 0 || nssiAnswers[1] >= 0)
      case 'pss10': return pss10Answers.every(a => a >= 0)
      case 'psqi': return psqiFullyAnswered(psqiAnswers)
      case 'sias6': return sias6Answers.every(a => a >= 0)
      case 'aslec': return aslecAnswers.every(a => a >= 0)
      case 'custom': return (customAnswers[p.custom.id] ?? []).every(a => a >= 0)
      default: return true
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return basicInfo.studentId.trim().length > 0
      case 2: return agreed
      case 3: return currentPage ? pageComplete(currentPage) : true
      default: return true
    }
  }

  // 提交测评：停止采集 → 归档记录 → 保存视频（IndexedDB）→ 进入结束页
  const handleSubmit = async () => {
    finishMouseTrack()
    const videoBlob = await stopRecording()
    const traj = mouseTrajRef.current
    const psqiEnabled = settings.enabledScales.psqi
    const psqiResult = psqiEnabled ? scorePsqi(psqiAnswers) : { comps: [0, 0, 0, 0, 0, 0, 0], total: 0 }
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
      mouseTrajectory: settings.mouseTracking
        ? traj.map(p => ({ x: p.x, y: p.y, t: Math.max(0, p.t - (traj[0] ? traj[0].t : 0)), k: p.k }))
        : [],
      mouseSamples: settings.mouseTracking ? traj.length : 0,
      cameraMode: cameraModeRef.current,
      cameraHasVideo: Boolean(videoBlob),
      customScales: settings.customScales.length > 0 ? settings.customScales.map(s => ({ ...s })) : undefined,
      customAnswers: settings.customScales.length > 0 ? { ...customAnswers } : undefined,
      mouseMetrics: metrics,
      behaviorSignals: behaviorSignalsOf(metrics),
    }
    appendRecord(record)
    if (videoBlob) saveVideo(record.id, videoBlob)
    setCurrentStep(4)
  }

  const handleNext = async () => {
    if (currentStep === 3) {
      if (currentPage && page < lastPage) {
        setPage(page + 1)
        return
      }
      await handleSubmit()
      return
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep === 3 && page > 0) {
      setPage(page - 1)
      return
    }
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetAll = () => {
    if (stopMouseTrackRef.current) stopMouseTrackRef.current()
    stopMouseTrackRef.current = null
    mouseTrajRef.current = []
    try { recorderRef.current && recorderRef.current.state !== 'inactive' && recorderRef.current.stop() } catch {}
    recorderRef.current = null
    chunksRef.current = []
    stopCameraStream()
    setCurrentStep(1)
    setPage(0)
    setAgreed(false)
    setBasicInfo({ studentId: '', age: '', gender: 'male', grade: '', educationLevel: 'undergraduate', major: '' })
    setPhq9Answers(new Array(9).fill(-1))
    setGad7Answers(new Array(7).fill(-1))
    setCssrsAnswers(new Array(4).fill(-1))
    setNssiAnswers([-1, -1])
    setPss10Answers(new Array(10).fill(-1))
    setPsqiAnswers(blankPsqiAnswers())
    setSias6Answers(new Array(6).fill(-1))
    setAslecAnswers(new Array(27).fill(-1))
    setCustomAnswers(Object.fromEntries(settings.customScales.map(s => [s.id, new Array(s.items.length).fill(-1)])))
  }

  const setPsqi = (patch: Partial<PsqiAnswers>) => setPsqiAnswers(prev => ({ ...prev, ...patch }))

  // 单题选项按钮组
  const OptionRow = ({ options, value, onPick, compact }: { options: string[]; value: number; onPick: (oi: number) => void; compact?: boolean }) => (
    <div className={`flex ${compact ? 'flex-wrap' : ''} gap-2`}>
      {options.map((option, optionIndex) => (
        <button
          key={optionIndex}
          onClick={() => onPick(optionIndex)}
          className={`${compact ? 'py-1.5 px-3' : 'flex-1 py-2 px-2'} rounded text-xs transition-colors ${
            value === optionIndex
              ? 'bg-[#FDEEE8] text-ink font-medium'
              : 'bg-white text-slate-400 border border-warm-300 hover:bg-warm-200'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )

  // 问卷页内容（不显示量表名称，仅条目）
  const renderPage = (p: QPage) => {
    switch (p.type) {
      case 'phq9':
        return (
          <div className="space-y-4">
            {phq9Questions.map((question, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                <OptionRow
                  options={riskOptions}
                  value={phq9Answers[index]}
                  onPick={(oi) => {
                    const next = [...phq9Answers]
                    next[index] = oi
                    setPhq9Answers(next)
                  }}
                />
              </div>
            ))}
          </div>
        )
      case 'gad7':
        return (
          <div className="space-y-4">
            {gad7Questions.map((question, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                <OptionRow
                  options={riskOptions}
                  value={gad7Answers[index]}
                  onPick={(oi) => {
                    const next = [...gad7Answers]
                    next[index] = oi
                    setGad7Answers(next)
                  }}
                />
              </div>
            ))}
          </div>
        )
      case 'cssrs':
        return (
          <div className="space-y-4">
            {cssrsQuestions.map((question, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                <div className="flex gap-2 max-w-sm">
                  <OptionRow
                    options={cssrsOptions}
                    value={cssrsAnswers[index]}
                    onPick={(oi) => {
                      const next = [...cssrsAnswers]
                      next[index] = oi
                      setCssrsAnswers(next)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      case 'nssi':
        return (
          <div className="space-y-4">
            <div className="bg-warm-100 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-3">1. {nssiQuestions[0]}</div>
              <div className="flex gap-2 max-w-sm">
                <OptionRow
                  options={nssiHasOptions}
                  value={nssiAnswers[0]}
                  onPick={(oi) => setNssiAnswers([oi, oi === 0 ? 0 : nssiAnswers[1] < 0 ? -1 : nssiAnswers[1]])}
                />
              </div>
            </div>
            {nssiAnswers[0] === 1 && (
              <div className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">2. {nssiQuestions[1]}</div>
                <OptionRow
                  options={nssiFreqOptions}
                  value={nssiAnswers[1]}
                  onPick={(oi) => setNssiAnswers([1, oi])}
                  compact
                />
              </div>
            )}
          </div>
        )
      case 'pss10':
        return (
          <div className="space-y-4">
            {pss10Questions.map((question, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                <OptionRow
                  options={pss10Options}
                  value={pss10Answers[index]}
                  onPick={(oi) => {
                    const next = [...pss10Answers]
                    next[index] = oi
                    setPss10Answers(next)
                  }}
                />
              </div>
            ))}
          </div>
        )
      case 'psqi':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">通常几点上床睡觉（小时 0-23）</label>
                <input
                  type="number" min={0} max={23}
                  value={psqiAnswers.bed < 0 ? '' : psqiAnswers.bed}
                  onChange={(e) => setPsqi({ bed: e.target.value === '' ? -1 : Math.max(0, Math.min(23, Number(e.target.value))) })}
                  className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  placeholder={t('as_input_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">通常需要多少分钟入睡</label>
                <input
                  type="number" min={0} max={240}
                  value={psqiAnswers.latency < 0 ? '' : psqiAnswers.latency}
                  onChange={(e) => setPsqi({ latency: e.target.value === '' ? -1 : Math.max(0, Math.min(240, Number(e.target.value))) })}
                  className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  placeholder={t('as_input_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">通常几点起床（小时 0-23）</label>
                <input
                  type="number" min={0} max={23}
                  value={psqiAnswers.wake < 0 ? '' : psqiAnswers.wake}
                  onChange={(e) => setPsqi({ wake: e.target.value === '' ? -1 : Math.max(0, Math.min(23, Number(e.target.value))) })}
                  className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  placeholder={t('as_input_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">每晚实际睡眠大约几小时（0-12）</label>
                <input
                  type="number" min={0} max={12}
                  value={psqiAnswers.hours < 0 ? '' : psqiAnswers.hours}
                  onChange={(e) => setPsqi({ hours: e.target.value === '' ? -1 : Math.max(0, Math.min(12, Number(e.target.value))) })}
                  className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  placeholder={t('as_input_placeholder')}
                />
              </div>
            </div>
            <div className="text-sm text-slate-500">过去一个月里，以下情况发生频率如何？</div>
            {psqiDisturbanceItems.map((item, i) => (
              <div key={i} className="bg-warm-100 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-2">{i + 1}. {item}</div>
                <OptionRow
                  options={psqiFreqOptions}
                  value={psqiAnswers.d[i]}
                  onPick={(oi) => {
                    const d = [...psqiAnswers.d]
                    d[i] = oi
                    setPsqi({ d })
                  }}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: 'quality' as const, label: '总体睡眠质量', options: psqiQualityOptions },
                { key: 'meds' as const, label: '服用催眠药物的频率', options: psqiFreqOptions },
                { key: 'day' as const, label: '白天保持清醒的困难程度', options: psqiFreqOptions },
                { key: 'energy' as const, label: '做事时精力不足的频率', options: psqiFreqOptions },
              ]).map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-slate-500 mb-1">{f.label}</label>
                  <select
                    value={psqiAnswers[f.key]}
                    onChange={(e) => setPsqi({ [f.key]: Number(e.target.value) } as Partial<PsqiAnswers>)}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value={-1} disabled>{t('psqi_select')}</option>
                    {f.options.map((o, i) => <option key={i} value={i}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      case 'sias6':
        return (
          <div className="space-y-4">
            {sias6Questions.map((question, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {question}</div>
                <OptionRow
                  options={sias6Options}
                  value={sias6Answers[index]}
                  onPick={(oi) => {
                    const next = [...sias6Answers]
                    next[index] = oi
                    setSias6Answers(next)
                  }}
                />
              </div>
            ))}
          </div>
        )
      case 'aslec':
        return (
          <div className="space-y-3">
            {aslecItems.map((item, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-3">
                <div className="text-xs text-slate-600 mb-2">{index + 1}. {item}</div>
                <OptionRow
                  options={aslecImpactOptions}
                  value={aslecAnswers[index]}
                  onPick={(oi) => {
                    const next = [...aslecAnswers]
                    next[index] = oi
                    setAslecAnswers(next)
                  }}
                  compact
                />
              </div>
            ))}
          </div>
        )
      case 'custom': {
        const scale = p.custom
        const answers = customAnswers[scale.id] ?? new Array(scale.items.length).fill(-1)
        return (
          <div className="space-y-4">
            {scale.items.map((item, index) => (
              <div key={index} className="bg-warm-100 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-3">{index + 1}. {item}</div>
                <OptionRow
                  options={scale.options}
                  value={answers[index]}
                  onPick={(oi) => {
                    const next = [...answers]
                    next[index] = oi
                    setCustomAnswers(prev => ({ ...prev, [scale.id]: next }))
                  }}
                />
              </div>
            ))}
          </div>
        )
      }
      default:
        return null
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
                {t('step1')}
              </h3>
              <p className="text-sm text-slate-500 mb-4">{t('assess_basic_desc')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_student_id')} <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={basicInfo.studentId}
                    onChange={(e) => setBasicInfo({ ...basicInfo, studentId: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('assess_student_id_ph')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_age')}</label>
                  <input
                    type="number"
                    value={basicInfo.age}
                    onChange={(e) => setBasicInfo({ ...basicInfo, age: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('assess_age_ph')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_gender')}</label>
                  <select
                    value={basicInfo.gender}
                    onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="male">{t('gender_male')}</option>
                    <option value="female">{t('gender_female')}</option>
                    <option value="other">{t('gender_other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_edu')}</label>
                  <select
                    value={basicInfo.educationLevel}
                    onChange={(e) => setBasicInfo({ ...basicInfo, educationLevel: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                  >
                    <option value="undergraduate">{t('edu_undergrad')}</option>
                    <option value="master">{t('edu_master')}</option>
                    <option value="doctor">{t('edu_doctor')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_grade')}</label>
                  <input
                    type="text"
                    value={basicInfo.grade}
                    onChange={(e) => setBasicInfo({ ...basicInfo, grade: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('assess_grade_ph')}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('assess_major')}</label>
                  <input
                    type="text"
                    value={basicInfo.major}
                    onChange={(e) => setBasicInfo({ ...basicInfo, major: e.target.value })}
                    className="w-full bg-warm-100 border border-warm-300 rounded-lg px-3 py-2 text-slate-600 text-sm focus:outline-none focus:border-orange-500"
                    placeholder={t('assess_major_ph')}
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
                {t('consent_title')}
              </h3>
              <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
                <p>{t('consent_intro')}</p>
                <p>{t('consent_before')}</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>{t('consent_li1')}</li>
                  <li>{t('consent_li2')}</li>
                  <li>{t('consent_li3')}</li>
                  <li>{t('consent_li4')}</li>
                  <li>{t('consent_li5')}</li>
                </ul>
                <p className="text-slate-400">{t('consent_tail')}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={requestCameraOnConsent}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                  agreed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white text-slate-500 border border-warm-300 hover:bg-warm-200'
                }`}
              >
                <Check className="w-4 h-4" /> {t('consent_agree')}
              </button>
              <button
                onClick={declineConsent}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                  !agreed
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white text-slate-500 border border-warm-300 hover:bg-warm-200'
                }`}
              >
                <X className="w-4 h-4" /> {t('consent_disagree')}
              </button>
            </div>
          </div>
        )

      case 3: {
        if (!currentPage) {
          return (
            <div className="bg-white rounded-lg border border-warm-300 p-10 text-center text-sm text-slate-400">
              {t('assess_no_scales')}
            </div>
          )
        }
        return (
          <div className="space-y-5">
            {/* 问卷分页指示 */}
            <div className="bg-white rounded-lg p-4 border border-warm-300 flex items-center justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-orange-500" />
                {tFmt('q_progress', { x: page + 1, n: pages.length })}
              </span>
              <span className="text-xs text-slate-400">{t('q_pager_hint')}</span>
            </div>
            {/* 当前问卷条目（不显示问卷名称） */}
            <div className="bg-white rounded-lg p-6 border border-warm-300">
              <p className="text-sm text-slate-400 mb-4">{currentPage.type === 'custom' ? t('intro_custom') : PAGE_INTRO[currentPage.type]}</p>
              {renderPage(currentPage)}
            </div>
          </div>
        )
      }

      case 4:
        return (
          <div className="bg-white rounded-lg border border-warm-300 p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">{t('assess_done_title')}</h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
              {t('assess_done_desc')}
            </p>
            <button
              onClick={resetAll}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg inline-flex items-center gap-2 text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> {t('assess_restart')}
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
          <span className="truncate">{t('fullscreen_tip')}</span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          {isFullscreen
            ? <><Minimize className="w-4 h-4" /> {t('fullscreen_off')}</>
            : <><Maximize className="w-4 h-4" /> {t('fullscreen_on')}</>}
        </button>
      </div>
      {isFullscreen && (
        <div className="bg-[#FDEEE8] border border-orange-200 rounded-lg px-4 py-2 text-xs text-ink-soft">
          {t('fullscreen_active')}
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
                        ? 'bg-[#FDEEE8] text-ink font-medium'
                        : 'bg-warm-100 text-slate-500 border border-warm-300'
                  }`}>
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  <span className={`text-xs mt-1 whitespace-nowrap ${
                    step === currentStep ? 'text-ink' : step < currentStep ? 'text-emerald-500' : 'text-ink-muted'
                  }`}>
                    {stepLabels[step - 1]}
                  </span>
                </div>
                {step < totalSteps && (
                  <div className={`flex-1 h-0.5 mx-2 ${step < currentStep ? 'bg-green-500/30' : 'bg-warm-200'}`} />
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
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 3 && page > 0 ? t('q_prev') : t('btn_prev')}
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-warm-200 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            {currentStep === 3
              ? (page < lastPage ? t('q_next') : t('btn_finish'))
              : t('btn_next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
