use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentRecord {
    pub id: String,
    pub timestamp: String,
    pub hashed_id: String,
    pub phq9_score: i32,
    pub gad7_score: i32,
    pub mouse_features: Option<MouseFeatures>,
    pub facial_features: Option<FacialFeatures>,
    pub risk_level: RiskLevel,
    pub risk_score: f64,
    pub risk_factors: Vec<String>,
    pub suggestions: Vec<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MouseFeatures {
    pub avg_speed: f64,
    pub speed_variance: f64,
    pub direction_changes: i32,
    pub pause_frequency: f64,
    pub pause_duration_avg: f64,
    pub trajectory_length: f64,
    pub click_frequency: f64,
    pub movement_entropy: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacialFeatures {
    pub avg_heart_rate: f64,
    pub heart_rate_variance: f64,
    pub blink_rate: f64,
    pub gaze_stability: f64,
    pub micro_expression_score: f64,
    pub skin_conductance_proxy: f64,
    pub facial_tension: f64,
    pub emotion_dominant: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Mild,
    Moderate,
    High,
}

impl RiskLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Low => "低风险",
            RiskLevel::Mild => "轻度风险",
            RiskLevel::Moderate => "中度风险",
            RiskLevel::High => "高风险",
        }
    }

    pub fn as_color(&self) -> &'static str {
        match self {
            RiskLevel::Low => "#4CAF50",
            RiskLevel::Mild => "#FFC107",
            RiskLevel::Moderate => "#FF9800",
            RiskLevel::High => "#F44336",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub auto_start: bool,
    pub tracking_enabled: bool,
    pub camera_enabled: bool,
    pub sample_rate_hz: u32,
    pub tracking_duration_sec: u32,
    pub data_retention_days: i32,
    pub encryption_enabled: bool,
    pub language: String,
    pub theme: String,
    pub notification_enabled: bool,
    pub risk_threshold_mild: f64,
    pub risk_threshold_moderate: f64,
    pub risk_threshold_high: f64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_start: false,
            tracking_enabled: true,
            camera_enabled: false,
            sample_rate_hz: 60,
            tracking_duration_sec: 300,
            data_retention_days: 365,
            encryption_enabled: true,
            language: "zh-CN".to_string(),
            theme: "light".to_string(),
            notification_enabled: true,
            risk_threshold_mild: 0.25,
            risk_threshold_moderate: 0.50,
            risk_threshold_high: 0.75,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStatus {
    pub id: String,
    pub task_type: String,
    pub status: String,
    pub progress: f64,
    pub created_at: String,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub total_assessments: i64,
    pub risk_distribution: HashMap<String, i64>,
    pub avg_phq9_score: f64,
    pub avg_gad7_score: f64,
    pub daily_counts: Vec<DailyCount>,
    pub last_7_days_count: i64,
    pub last_30_days_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyCount {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskResult {
    pub risk_level: RiskLevel,
    pub risk_score: f64,
    pub risk_factors: Vec<String>,
    pub suggestions: Vec<String>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssessmentFilters {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub risk_level: Option<RiskLevel>,
    pub min_score: Option<i32>,
    pub max_score: Option<i32>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
