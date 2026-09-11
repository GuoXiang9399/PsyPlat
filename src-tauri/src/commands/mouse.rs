use crate::models::app_state::AppState;
use crate::models::data_models::MouseFeatures;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn start_mouse_tracking(
    state: State<'_, Arc<Mutex<AppState>>>,
    duration: u32,
    sample_rate: u32,
) -> Result<String, String> {
    let app_state = state.lock().await;

    if app_state.is_mouse_tracking_active().await {
        return Err("鼠标追踪已在进行中".to_string());
    }

    let tracker = app_state.get_mouse_tracker();
    let duration_val = if duration == 0 { 300 } else { duration };
    let rate_val = if sample_rate == 0 { 60 } else { sample_rate };

    tracker.lock().await.start_tracking(duration_val, rate_val).await;
    app_state.set_mouse_tracking_active(true).await;

    let db = app_state.get_db();
    let _ = db.lock().await.log_access("start_mouse_tracking", Some(&format!("duration={}s, rate={}Hz", duration_val, rate_val))).await;

    Ok(format!("鼠标追踪已启动，持续 {} 秒，采样率 {} Hz", duration_val, rate_val))
}

#[tauri::command]
pub async fn stop_mouse_tracking(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let app_state = state.lock().await;

    if !app_state.is_mouse_tracking_active().await {
        return Err("鼠标追踪未在进行中".to_string());
    }

    let tracker = app_state.get_mouse_tracker();
    tracker.lock().await.stop_tracking().await;
    app_state.set_mouse_tracking_active(false).await;

    let db = app_state.get_db();
    let _ = db.lock().await.log_access("stop_mouse_tracking", None).await;

    Ok("鼠标追踪已停止".to_string())
}

#[tauri::command]
pub async fn get_mouse_features(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<MouseFeatures, String> {
    let app_state = state.lock().await;
    let tracker = app_state.get_mouse_tracker();
    let features = tracker.lock().await.extract_features().await;
    Ok(features)
}
