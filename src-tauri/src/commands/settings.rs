use crate::models::app_state::AppState;
use crate::models::data_models::AppSettings;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_settings(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<AppSettings, String> {
    let app_state = state.lock().await;
    let settings = app_state.get_settings();
    let s = settings.lock().await.clone();
    Ok(s)
}

#[tauri::command]
pub async fn save_settings(
    state: State<'_, Arc<Mutex<AppState>>>,
    settings: AppSettings,
) -> Result<String, String> {
    let app_state = state.lock().await;

    let db = app_state.get_db();
    match db.lock().await.save_settings(&settings).await {
        Ok(()) => {
            let mut current = app_state.get_settings().lock().await;
            *current = settings;
            drop(current);

            let _ = db.lock().await.log_access("save_settings", None).await;
            Ok("设置已保存".to_string())
        }
        Err(e) => Err(format!("保存设置失败: {}", e)),
    }
}
