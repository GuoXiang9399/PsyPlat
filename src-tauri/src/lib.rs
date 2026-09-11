// Rust后端主模块 - 多模态无接触式心理问题早期预警系统

use std::sync::Arc;
use tokio::sync::Mutex;

pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use models::app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
.setup(|app| {
            // 数据保存在安装目录下的 Data 文件夹内（随应用一起打包，便于用户直接查看与备份）
            let resource_dir = app.path().resource_dir()
                .expect("Failed to get resource dir");
            let data_dir = resource_dir.join("Data");
            // 安装位置不可写时（如 Program Files），兜底使用系统应用数据目录
            let app_dir = match std::fs::create_dir_all(&data_dir) {
                Ok(_) => data_dir,
                Err(_) => {
                    let fallback = app.path().app_data_dir()
                        .expect("Failed to get app data dir");
                    std::fs::create_dir_all(&fallback)?;
                    fallback
                }
            };
            let db_path = app_dir.join("psych_warning.db");

            let state = tokio::runtime::Runtime::new()
                .expect("Failed to create tokio runtime")
                .block_on(async {
                    AppState::new(db_path.to_str().unwrap()).await
                        .expect("Failed to initialize app state")
                });

            app.manage(Arc::new(Mutex::new(state)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 鼠标追踪命令
            commands::mouse::start_mouse_tracking,
            commands::mouse::stop_mouse_tracking,
            commands::mouse::get_mouse_features,
            // 摄像头命令
            commands::camera::start_camera,
            commands::camera::stop_camera,
            commands::camera::get_facial_features,
            // 测评命令
            commands::assessment::submit_assessment,
            // 数据管理命令
            commands::data::get_assessments,
            commands::data::delete_assessment,
            commands::data::export_data,
            commands::data::get_statistics,
            // 设置命令
            commands::settings::get_settings,
            commands::settings::save_settings,
            // 任务队列命令
            commands::tasks::get_task_queue,
            commands::tasks::cancel_task,
            // 系统命令
            commands::system::get_system_status,
            commands::system::check_permissions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
