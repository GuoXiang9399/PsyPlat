'use client'

import { useState } from 'react'
import {
  Settings,
  LayoutDashboard,
  FileText,
  Database,
  Info,
  Brain,
  Wifi,
  Monitor,
  CheckCircle,
  Eye,
  Shield,
  Bell,
  SlidersHorizontal,
  Save,
  RotateCcw,
  ChevronRight,
  FolderOpen,
  Lock
} from 'lucide-react'

type TabKey = 'dashboard' | 'assessment' | 'data' | 'settings' | 'about'
type SettingsTab = 'capture' | 'privacy' | 'warning' | 'system'

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
    theme: 'dark',
    autoSave: true,
    debugMode: false
  })

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
        <h1 className="text-2xl font-bold text-slate-100">系统设置</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> {saved ? '已保存' : '保存设置'}
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm border border-slate-700 transition-colors">
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
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 设置内容 */}
        <div className="flex-1 bg-slate-800 rounded-lg border border-slate-700 p-6">
          {activeTab === 'capture' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
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
                      className="flex-1 accent-blue-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.mouseSampleRate}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseSampleRate: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
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
                      className="flex-1 accent-blue-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.mouseDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, mouseDuration: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
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
                      className="flex-1 accent-blue-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.cameraFps}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraFps: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">摄像头分辨率</label>
                  <select
                    value={captureSettings.cameraResolution}
                    onChange={(e) => setCaptureSettings({ ...captureSettings, cameraResolution: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
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
                      className="flex-1 accent-blue-500"
                    />
                    <input
                      type="number"
                      value={captureSettings.cameraDuration}
                      onChange={(e) => setCaptureSettings({ ...captureSettings, cameraDuration: parseInt(e.target.value) || 0 })}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
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
                    <div key={item.key} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={privacySettings[item.key as keyof typeof privacySettings]}
                        onChange={(e) => setPrivacySettings({ ...privacySettings, [item.key]: e.target.checked })}
                        className="mt-1 w-4 h-4 accent-blue-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-200 font-medium">{item.label}</span>
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
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" />
                预警阈值配置
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">PHQ-9 阈值</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">轻度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Mild}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Mild: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">中度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Moderate}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Moderate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">重度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.phq9Severe}
                        onChange={(e) => setWarningSettings({ ...warningSettings, phq9Severe: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">GAD-7 阈值</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">轻度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Mild}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Mild: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">中度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Moderate}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Moderate: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">重度阈值</label>
                      <input
                        type="number"
                        value={warningSettings.gad7Severe}
                        onChange={(e) => setWarningSettings({ ...warningSettings, gad7Severe: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-300 text-sm text-center focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">通知设置</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={warningSettings.notifyEmail}
                        onChange={(e) => setWarningSettings({ ...warningSettings, notifyEmail: e.target.checked })}
                        className="w-4 h-4 accent-blue-500 rounded"
                      />
                      <span className="text-sm text-slate-300">高风险时发送邮件通知</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={warningSettings.notifyPush}
                        onChange={(e) => setWarningSettings({ ...warningSettings, notifyPush: e.target.checked })}
                        className="w-4 h-4 accent-blue-500 rounded"
                      />
                      <span className="text-sm text-slate-300">高风险时发送推送通知</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
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
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">主题</label>
                  <select
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({ ...systemSettings, theme: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="dark">深色</option>
                    <option value="light">浅色</option>
                    <option value="auto">自动</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.autoSave}
                    onChange={(e) => setSystemSettings({ ...systemSettings, autoSave: e.target.checked })}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-200 font-medium">自动保存</div>
                    <p className="text-xs text-slate-500">测评完成后自动保存结果</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemSettings.debugMode}
                    onChange={(e) => setSystemSettings({ ...systemSettings, debugMode: e.target.checked })}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                  <div>
                    <div className="text-sm text-slate-200 font-medium">调试模式</div>
                    <p className="text-xs text-slate-500">启用详细的日志输出和调试信息</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-slate-900 text-slate-300">
      <Sidebar activeTab="settings" onTabChange={() => {}} />
      <main className="flex-1 overflow-auto p-6">
        <SettingsContent />
      </main>
    </div>
  )
}
