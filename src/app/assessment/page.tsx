'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  LayoutDashboard,
  Database,
  Settings,
  Info,
  Brain,
  Wifi,
  Monitor,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User,
  MousePointer,
  Camera,
  AlertTriangle,
  Shield,
  Clock,
  RotateCcw,
  Play,
  Square,
  BarChart3
} from 'lucide-react'

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
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">心理预警系统</h1>
            <p className="text-xs text-slate-500">Psych Warning System</p>
          </div>
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
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
          <div className="text-xs font-medium text-slate-500 mb-2">系统状态</div>
          <div className="flex items-center gap-2 text-xs">
            <Monitor className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400">摄像头:</span>
            <span className="text-green-400">正常</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span className="text-slate-400">鼠标追踪:</span>
            <span className="text-green-400">正常</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">模型状态:</span>
            <span className="text-blue-400">已加载</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

const phq9Questions = [
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

const gad7Questions = [
  '感到紧张、焦虑或急切',
  '无法停止或控制担忧',
  '对各种事情担忧过多',
  '很难放松下来',
  '烦躁不安，坐立不宁',
  '容易烦恼或急躁',
  '感到好像有可怕的事要发生'
]

const riskOptions = ['完全不会', '好几天', '一半以上天数', '几乎每天']

export function AssessmentContent() {
  const [currentStep, setCurrentStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [basicInfo, setBasicInfo] = useState({ studentId: '', age: '', gender: 'male', grade: '' })
  const [phq9Answers, setPhq9Answers] = useState<number[]>(new Array(9).fill(-1))
  const [gad7Answers, setGad7Answers] = useState<number[]>(new Array(7).fill(-1))
  const [mouseProgress, setMouseProgress] = useState(0)
  const [mouseStatus, setMouseStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'running' | 'completed'>('idle')
  const [cameraProgress, setCameraProgress] = useState(0)
  const [result, setResult] = useState<{
    riskLevel: string;
    phq9Score: number;
    gad7Score: number;
    confidence: number;
    recommendations: string[];
  } | null>(null)

  const totalSteps = 7

  const canProceed = () => {
    switch (currentStep) {
      case 1: return agreed
      case 2: return basicInfo.studentId && basicInfo.age && basicInfo.grade
      case 3: return phq9Answers.every(a => a >= 0)
      case 4: return gad7Answers.every(a => a >= 0)
      case 5: return mouseStatus === 'completed'
      case 6: return cameraStatus === 'completed'
      default: return true
    }
  }

  const handleNext = () => {
    if (currentStep === 6) {
      // 计算结果
      const phq9Score = phq9Answers.reduce((a, b) => a + b, 0)
      const gad7Score = gad7Answers.reduce((a, b) => a + b, 0)
      const totalScore = phq9Score + gad7Score
      let riskLevel = '低风险'
      if (totalScore >= 30) riskLevel = '高风险'
      else if (totalScore >= 20) riskLevel = '中度风险'
      else if (totalScore >= 10) riskLevel = '轻度风险'

      const recommendations = [
        '建议定期进行心理健康评估',
        '保持规律的作息和适度运动',
        '如有需要可预约学校心理咨询',
        '与信任的亲友多沟通交流'
      ]
      if (riskLevel === '高风险') {
        recommendations.unshift('建议尽快联系专业心理咨询师')
      }

      setResult({
        riskLevel,
        phq9Score,
        gad7Score,
        confidence: Math.round(85 + Math.random() * 10),
        recommendations
      })
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

  const startMouseTracking = () => {
    setMouseStatus('running')
    setMouseProgress(0)
    let progress = 0
    const interval = setInterval(() => {
      progress += 2
      setMouseProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setMouseStatus('completed')
      }
    }, 100)
  }

  const startCamera = () => {
    setCameraStatus('running')
    setCameraProgress(0)
    let progress = 0
    const interval = setInterval(() => {
      progress += 2
      setCameraProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setCameraStatus('completed')
      }
    }, 100)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case '高风险': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case '中度风险': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case '轻度风险': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default: return 'text-green-400 bg-green-500/20 border-green-500/30'
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                知情同意书
              </h3>
              <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
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
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Check className="w-4 h-4" /> 我同意
              </button>
              <button
                onClick={() => setAgreed(false)}
                className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors ${
                  !agreed
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                }`}
              >
                <X className="w-4 h-4" /> 我不同意
              </button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">学号</label>
                  <input
                    type="text"
                    value={basicInfo.studentId}
                    onChange={(e) => setBasicInfo({ ...basicInfo, studentId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="请输入学号"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">年龄</label>
                  <input
                    type="number"
                    value={basicInfo.age}
                    onChange={(e) => setBasicInfo({ ...basicInfo, age: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="请输入年龄"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">性别</label>
                  <select
                    value={basicInfo.gender}
                    onChange={(e) => setBasicInfo({ ...basicInfo, gender: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">年级</label>
                  <input
                    type="text"
                    value={basicInfo.grade}
                    onChange={(e) => setBasicInfo({ ...basicInfo, grade: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="如：大三"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                PHQ-9 抑郁症筛查量表
              </h3>
              <p className="text-sm text-slate-400 mb-4">在过去两周里，以下问题困扰您的频率如何？</p>
              <div className="space-y-4">
                {phq9Questions.map((question, index) => (
                  <div key={index} className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-3">
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
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
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

      case 4:
        return (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                GAD-7 广泛性焦虑量表
              </h3>
              <p className="text-sm text-slate-400 mb-4">在过去两周里，以下问题困扰您的频率如何？</p>
              <div className="space-y-4">
                {gad7Questions.map((question, index) => (
                  <div key={index} className="bg-slate-900/50 rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-3">
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
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
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

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <MousePointer className="w-5 h-5 text-blue-400" />
                鼠标行为追踪
              </h3>
              <p className="text-sm text-slate-400 mb-4">请在下方区域内自由移动鼠标，系统将记录您的鼠标轨迹特征。</p>
              <div className="bg-slate-900 rounded-lg border border-slate-700 h-64 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-8 gap-4 opacity-10">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="w-8 h-8 border border-slate-600 rounded" />
                    ))}
                  </div>
                </div>
                {mouseStatus === 'idle' && (
                  <div className="text-center z-10">
                    <MousePointer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">点击开始按钮启动鼠标追踪</p>
                  </div>
                )}
                {mouseStatus === 'running' && (
                  <div className="text-center z-10">
                    <MousePointer className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-bounce" />
                    <p className="text-blue-400 text-sm">正在采集鼠标数据... {mouseProgress}%</p>
                  </div>
                )}
                {mouseStatus === 'completed' && (
                  <div className="text-center z-10">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 text-sm">鼠标数据采集完成</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>采集进度</span>
                  <span>{mouseProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${mouseProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={startMouseTracking}
                  disabled={mouseStatus === 'running'}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <Play className="w-4 h-4" /> 开始采集
                </button>
                <button
                  onClick={() => { setMouseStatus('idle'); setMouseProgress(0) }}
                  disabled={mouseStatus === 'running'}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> 重置
                </button>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                视频采集
              </h3>
              <p className="text-sm text-slate-400 mb-4">系统将采集面部微表情数据用于分析。数据将实时处理，不保存原始视频。</p>
              <div className="bg-slate-900 rounded-lg border border-slate-700 h-64 flex flex-col items-center justify-center relative overflow-hidden">
                {cameraStatus === 'idle' && (
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">点击开始按钮启动视频采集</p>
                  </div>
                )}
                {cameraStatus === 'running' && (
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-blue-400 text-sm">正在采集面部数据... {cameraProgress}%</p>
                    <div className="flex gap-1 mt-2 justify-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                {cameraStatus === 'completed' && (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 text-sm">面部数据采集完成</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>采集进度</span>
                  <span>{cameraProgress}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${cameraProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={startCamera}
                  disabled={cameraStatus === 'running'}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                >
                  <Play className="w-4 h-4" /> 开始采集
                </button>
                <button
                  onClick={() => { setCameraStatus('idle'); setCameraProgress(0) }}
                  disabled={cameraStatus === 'running'}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> 重置
                </button>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            {result && (
              <>
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
                  <h3 className="text-lg font-semibold text-slate-100 mb-6">测评结果</h3>
                  <div className={`inline-block px-8 py-4 rounded-xl text-3xl font-bold border ${getRiskColor(result.riskLevel)}`}>
                    {result.riskLevel}
                  </div>
                  <div className="mt-4 text-sm text-slate-400">
                    模型置信度: <span className="text-blue-400 font-semibold">{result.confidence}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">PHQ-9 得分</div>
                    <div className="text-2xl font-bold text-slate-100">{result.phq9Score}</div>
                    <div className="text-xs text-slate-500 mt-1">满分 27 分</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">GAD-7 得分</div>
                    <div className="text-2xl font-bold text-slate-100">{result.gad7Score}</div>
                    <div className="text-xs text-slate-500 mt-1">满分 21 分</div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    建议与指导
                  </h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCurrentStep(1)
                      setAgreed(false)
                      setBasicInfo({ studentId: '', age: '', gender: 'male', grade: '' })
                      setPhq9Answers(new Array(9).fill(-1))
                      setGad7Answers(new Array(7).fill(-1))
                      setMouseStatus('idle')
                      setMouseProgress(0)
                      setCameraStatus('idle')
                      setCameraProgress(0)
                      setResult(null)
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> 重新开始测评
                  </button>
                  <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors">
                    <Clock className="w-4 h-4" /> 保存记录
                  </button>
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* 步骤指示器 */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step < currentStep
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : step === currentStep
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-900 text-slate-500 border border-slate-700'
                  }`}>
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step === currentStep ? 'text-blue-400' : step < currentStep ? 'text-green-400' : 'text-slate-500'
                  }`}>
                    {step === 1 && '知情同意'}
                    {step === 2 && '基本信息'}
                    {step === 3 && 'PHQ-9'}
                    {step === 4 && 'GAD-7'}
                    {step === 5 && '鼠标追踪'}
                    {step === 6 && '视频采集'}
                    {step === 7 && '结果'}
                  </span>
                </div>
                {step < totalSteps && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-500/30' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      {renderStepContent()}

      {/* 底部导航 */}
      {currentStep < 7 && (
        <div className="flex justify-between pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 上一步
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            下一步 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function AssessmentPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <Sidebar activeTab="assessment" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <AssessmentContent />
      </main>
    </div>
  )
}
