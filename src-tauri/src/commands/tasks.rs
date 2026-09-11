use crate::models::app_state::AppState;
use crate::models::data_models::TaskStatus;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_task_queue(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<TaskStatus>, String> {
    let app_state = state.lock().await;
    let queue = app_state.get_task_queue();
    let tasks = queue.lock().await.clone();
    Ok(tasks)
}

#[tauri::command]
pub async fn cancel_task(
    state: State<'_, Arc<Mutex<AppState>>>,
    id: String,
) -> Result<bool, String> {
    let app_state = state.lock().await;
    let queue = app_state.get_task_queue();
    let mut tasks = queue.lock().await;

    if let Some(index) = tasks.iter().position(|t| t.id == id) {
        let mut task = tasks.remove(index);
        task.status = "cancelled".to_string();
        task.completed_at = Some(chrono::Local::now().to_rfc3339());
        tasks.push(task);
        drop(tasks);

        let db = app_state.get_db();
        let _ = db.lock().await.log_access(
            "cancel_task",
            Some(&format!("id={}", id))
        ).await;

        Ok(true)
    } else {
        Ok(false)
    }
}
