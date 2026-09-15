use crate::models::app_state::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub mouse_tracking_active: bool,
    pub camera_active: bool,
    pub db_connected: bool,
    pub task_queue_size: usize,
    pub version: String,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub camera_permission: bool,
    pub screen_recording_permission: bool,
    pub accessibility_permission: bool,
}

#[tauri::command]
pub async fn get_system_status(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<SystemStatus, String> {
    let app_state = state.lock().await;

    let mouse_active = app_state.is_mouse_tracking_active().await;
    let camera_active = app_state.is_camera_active().await;
    let queue = app_state.get_task_queue();
    let queue_size = queue.lock().await.len();

    let db = app_state.get_db();
    let db_connected = db.lock().await.log_access("ping", None).is_ok();

    let status = SystemStatus {
        mouse_tracking_active: mouse_active,
        camera_active,
        db_connected,
        task_queue_size: queue_size,
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: 0,
    };

    Ok(status)
}

#[tauri::command]
pub async fn check_permissions() -> Result<PermissionStatus, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(PermissionStatus {
            camera_permission: false,
            screen_recording_permission: false,
            accessibility_permission: false,
        })
    }

    #[cfg(target_os = "windows")]
    {
        Ok(PermissionStatus {
            camera_permission: true,
            screen_recording_permission: true,
            accessibility_permission: true,
        })
    }

    #[cfg(target_os = "linux")]
    {
        Ok(PermissionStatus {
            camera_permission: true,
            screen_recording_permission: true,
            accessibility_permission: true,
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Ok(PermissionStatus {
            camera_permission: false,
            screen_recording_permission: false,
            accessibility_permission: false,
        })
    }
}
