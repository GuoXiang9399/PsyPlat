// Tauri IPC类型定义 - 前端与Rust后端的通信接口

// ====== 鼠标轨迹数据 ======
export interface MouseEvent {
  timestamp: number
  x: number
  y: number
  event_type: 'move' | 'click' | 'scroll' | 'pause'
  button?: string
}

export interface MouseFeatures {
  total_distance: number
  max_speed: number
  max_acceleration: number
  pause_count: number
  pause_duration: number
  click_count: number
  x_flips: number
  sample_entropy: number
  smoothness: number
}

// ====== 摄像头数据 ======
export interface FacialFeatures {
  timestamp: number
  face_detected: boolean
  hr_estimate?: number
  hrv_features?: {
    sdnn: number
    rmssd: number
    pnn50: number
  }
  au_intensities?: Record<string, number>
  eye_openness?: number
  blink_rate?: number
}

// ====== 量表数据 ======
export interface ScaleResult {
  phq9_score: number
  phq9_responses: number[]
  gad7_score: number
  gad7_responses: number[]
}

// ====== 测评记录 ======
export interface AssessmentRecord {
  id: string
  student_id_hash: string
  timestamp: string
  age: number
  gender: string
  grade: string
  phq9_score: number
  phq9_responses: number[]
  gad7_score: number
  gad7_responses: number[]
  risk_level: RiskLevel
  confidence: number
  mouse_features: MouseFeatures
  facial_features: FacialFeatures
  risk_factors: string[]
  recommendations: string[]
  status: 'completed' | 'pending_review' | 'intervened'
}

export type RiskLevel = '低风险' | '轻度风险' | '中度风险' | '高风险'

// ====== 统计信息 ======
export interface Statistics {
  total_assessments: number
  monthly_assessments: number
  high_risk_count: number
  average_phq9: number
  average_gad7: number
  risk_distribution: Record<string, number>
  monthly_stats: Record<string, { count: number; high_risk: number }>
}

// ====== 设置 ======
export interface AppSettings {
  mouse_sample_rate: number
  mouse_duration: number
  camera_fps: number
  camera_resolution: string
  camera_duration: number
  local_processing: boolean
  delete_raw: boolean
  encrypt_storage: boolean
  anonymize: boolean
  phq9_thresholds: { mild: number; moderate: number; severe: number }
  gad7_thresholds: { mild: number; moderate: number; severe: number }
  data_path: string
  theme: 'dark' | 'light' | 'auto'
}

// ====== 任务状态 ======
export interface TaskStatus {
  id: string
  type: 'mouse_tracking' | 'camera_capture' | 'assessment'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  start_time?: string
  end_time?: string
}

// ====== IPC Commands 类型 ======
export interface InvokeCommands {
  // 鼠标追踪
  'start_mouse_tracking': { duration?: number; sample_rate?: number }
  'stop_mouse_tracking': {}
  'get_mouse_features': {}

  // 摄像头
  'start_camera': { duration?: number; fps?: number }
  'stop_camera': {}
  'get_facial_features': {}

  // 测评
  'submit_assessment': {
    student_id: string
    age: number
    gender: string
    grade: string
    phq9_responses: number[]
    gad7_responses: number[]
    mouse_features: MouseFeatures
    facial_features: FacialFeatures
  }

  // 数据管理
  'get_assessments': { risk_level?: string; start_date?: string; end_date?: string }
  'delete_assessment': { id: string }
  'export_data': { format: 'csv' | 'json'; filepath: string }
  'get_statistics': {}

  // 设置
  'get_settings': {}
  'save_settings': { settings: AppSettings }

  // 任务队列
  'get_task_queue': {}
  'cancel_task': { id: string }

  // 系统
  'get_system_status': {}
  'check_permissions': {}
}

export interface InvokeResults {
  'start_mouse_tracking': { success: boolean; message: string }
  'stop_mouse_tracking': { success: boolean; features: MouseFeatures }
  'get_mouse_features': MouseFeatures
  'start_camera': { success: boolean; message: string }
  'stop_camera': { success: boolean; features: FacialFeatures }
  'get_facial_features': FacialFeatures
  'submit_assessment': { id: string; risk_level: RiskLevel; confidence: number; recommendations: string[]; risk_factors: string[] }
  'get_assessments': AssessmentRecord[]
  'delete_assessment': { success: boolean }
  'export_data': { success: boolean; filepath: string }
  'get_statistics': Statistics
  'get_settings': AppSettings
  'save_settings': { success: boolean }
  'get_task_queue': TaskStatus[]
  'cancel_task': { success: boolean }
  'get_system_status': { camera: string; mouse: string; model: string }
  'check_permissions': { has_camera: boolean; has_data_access: boolean }
}
