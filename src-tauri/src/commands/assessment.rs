use crate::models::app_state::AppState;
use crate::models::data_models::{AssessmentRecord, RiskResult};
use crate::services::fusion_model::FusionModel;
use crate::utils::hash::hash_identifier;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AssessmentInput {
    pub phq9_score: i32,
    pub gad7_score: i32,
    pub mouse_features: Option<crate::models::data_models::MouseFeatures>,
    pub facial_features: Option<crate::models::data_models::FacialFeatures>,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn submit_assessment(
    state: State<'_, Arc<Mutex<AppState>>>,
    data: AssessmentInput,
) -> Result<RiskResult, String> {
    let app_state = state.lock().await;

    let model = FusionModel::new();
    let result = model.predict(
        data.mouse_features.as_ref(),
        data.facial_features.as_ref(),
        data.phq9_score,
        data.gad7_score,
    );

    let now = chrono::Local::now();
    let timestamp = now.to_rfc3339();
    let id = Uuid::new_v4().to_string();
    let salt = now.timestamp_millis().to_string();
    let hashed_id = hash_identifier(&id, &salt);

    let record = AssessmentRecord {
        id: id.clone(),
        timestamp: timestamp.clone(),
        hashed_id: hashed_id.clone(),
        phq9_score: data.phq9_score,
        gad7_score: data.gad7_score,
        mouse_features: data.mouse_features,
        facial_features: data.facial_features,
        risk_level: result.risk_level.clone(),
        risk_score: result.risk_score,
        risk_factors: result.risk_factors.clone(),
        suggestions: result.suggestions.clone(),
        notes: data.notes,
    };

    let db = app_state.get_db();
    let saved = db.lock().await.save_assessment(&record);
    match saved {
        Ok(saved_id) => {
            let _ = db.lock().await.log_access(
                "submit_assessment",
                Some(&format!("id={}, risk={}", saved_id, result.risk_level.as_str()))
            );
            Ok(result)
        }
        Err(e) => Err(format!("保存评估记录失败: {}", e)),
    }
}
