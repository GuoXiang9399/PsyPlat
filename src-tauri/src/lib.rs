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
            let app_dir = app.path().app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir)?;
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
