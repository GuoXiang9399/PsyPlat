use crate::models::app_state::AppState;
use crate::models::data_models::{AssessmentFilters, AssessmentRecord, Statistics};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExportFormat {
    pub format: String,
    pub filepath: String,
}

#[tauri::command]
pub async fn get_assessments(
    state: State<'_, Arc<Mutex<AppState>>>,
    filters: AssessmentFilters,
) -> Result<Vec<AssessmentRecord>, String> {
    let app_state = state.lock().await;
    let db = app_state.get_db();

    let queried = db.lock().await.get_assessments(&filters);
    match queried {
        Ok(records) => {
            let _ = db.lock().await.log_access(
                "get_assessments",
                Some(&format!("count={}", records.len()))
            );
            Ok(records)
        }
        Err(e) => Err(format!("查询评估记录失败: {}", e)),
    }
}

#[tauri::command]
pub async fn delete_assessment(
    state: State<'_, Arc<Mutex<AppState>>>,
    id: String,
) -> Result<bool, String> {
    let app_state = state.lock().await;
    let db = app_state.get_db();

    let deleted = db.lock().await.delete_assessment(&id);
    match deleted {
        Ok(deleted) => {
            let _ = db.lock().await.log_access(
                "delete_assessment",
                Some(&format!("id={}, deleted={}", id, deleted))
            );
            Ok(deleted)
        }
        Err(e) => Err(format!("删除评估记录失败: {}", e)),
    }
}

#[tauri::command]
pub async fn export_data(
    state: State<'_, Arc<Mutex<AppState>>>,
    format: String,
    filepath: String,
) -> Result<String, String> {
    let app_state = state.lock().await;
    let db = app_state.get_db();

    let result = match format.as_str() {
        "csv" => db.lock().await.export_to_csv(&filepath),
        "json" => db.lock().await.export_to_json(&filepath),
        _ => Err(anyhow::anyhow!("不支持的导出格式: {}", format)),
    };

    match result {
        Ok(()) => {
            let _ = db.lock().await.log_access(
                "export_data",
                Some(&format!("format={}, path={}", format, filepath))
            );
            Ok(format!("数据已导出至: {}", filepath))
        }
        Err(e) => Err(format!("导出数据失败: {}", e)),
    }
}

#[tauri::command]
pub async fn get_statistics(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Statistics, String> {
    let app_state = state.lock().await;
    let db = app_state.get_db();

    let stats = db.lock().await.get_statistics();
    match stats {
        Ok(stats) => {
            let _ = db.lock().await.log_access("get_statistics", None);
            Ok(stats)
        }
        Err(e) => Err(format!("获取统计信息失败: {}", e)),
    }
}
