use crate::models::app_state::AppState;
use crate::models::data_models::FacialFeatures;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn start_camera(
    state: State<'_, Arc<Mutex<AppState>>>,
    duration: u32,
    fps: u32,
) -> Result<String, String> {
    let app_state = state.lock().await;

    if app_state.is_camera_active().await {
        return Err("摄像头采集已在进行中".to_string());
    }

    let camera = app_state.get_camera_service();
    let duration_val = if duration == 0 { 60 } else { duration };
    let fps_val = if fps == 0 { 30 } else { fps };

    camera.lock().await.start_capture(duration_val, fps_val).await;
    app_state.set_camera_active(true).await;

    let db = app_state.get_db();
    let _ = db.lock().await.log_access("start_camera", Some(&format!("duration={}s, fps={}", duration_val, fps_val))).await;

    Ok(format!("摄像头采集已启动，持续 {} 秒，帧率 {} fps", duration_val, fps_val))
}

#[tauri::command]
pub async fn stop_camera(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let app_state = state.lock().await;

    if !app_state.is_camera_active().await {
        return Err("摄像头采集未在进行中".to_string());
    }

    let camera = app_state.get_camera_service();
    camera.lock().await.stop_capture().await;
    app_state.set_camera_active(false).await;

    let db = app_state.get_db();
    let _ = db.lock().await.log_access("stop_camera", None).await;

    Ok("摄像头采集已停止".to_string())
}

#[tauri::command]
pub async fn get_facial_features(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<FacialFeatures, String> {
    let app_state = state.lock().await;
    let camera = app_state.get_camera_service();
    let features = camera.lock().await.extract_facial_features().await;
    Ok(features)
}
