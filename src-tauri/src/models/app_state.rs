use super::data_models::{AppSettings, TaskStatus};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    db: Arc<Mutex<crate::services::database::DatabaseService>>,
    settings: Arc<Mutex<AppSettings>>,
    task_queue: Arc<Mutex<Vec<TaskStatus>>>,
    mouse_tracking_active: Arc<Mutex<bool>>,
    camera_active: Arc<Mutex<bool>>,
    mouse_tracker: Arc<Mutex<crate::services::mouse_tracker::MouseTrackerService>>,
    camera_service: Arc<Mutex<crate::services::camera_service::CameraService>>,
}

impl AppState {
    pub async fn new(db_path: &str) -> anyhow::Result<Self> {
        let db = crate::services::database::DatabaseService::new(db_path).await?;
        let settings = db.load_settings().await.unwrap_or_default();
        
        Ok(Self {
            db: Arc::new(Mutex::new(db)),
            settings: Arc::new(Mutex::new(settings)),
            task_queue: Arc::new(Mutex::new(Vec::new())),
            mouse_tracking_active: Arc::new(Mutex::new(false)),
            camera_active: Arc::new(Mutex::new(false)),
            mouse_tracker: Arc::new(Mutex::new(
                crate::services::mouse_tracker::MouseTrackerService::new()
            )),
            camera_service: Arc::new(Mutex::new(
                crate::services::camera_service::CameraService::new()
            )),
        })
    }

    pub fn get_db(&self) -> Arc<Mutex<crate::services::database::DatabaseService>> {
        self.db.clone()
    }

    pub fn get_settings(&self) -> Arc<Mutex<AppSettings>> {
        self.settings.clone()
    }

    pub fn get_task_queue(&self) -> Arc<Mutex<Vec<TaskStatus>>> {
        self.task_queue.clone()
    }

    pub fn get_mouse_tracker(&self) -> Arc<Mutex<crate::services::mouse_tracker::MouseTrackerService>> {
        self.mouse_tracker.clone()
    }

    pub fn get_camera_service(&self) -> Arc<Mutex<crate::services::camera_service::CameraService>> {
        self.camera_service.clone()
    }

    pub async fn is_mouse_tracking_active(&self) -> bool {
        *self.mouse_tracking_active.lock().await
    }

    pub async fn set_mouse_tracking_active(&self, active: bool) {
        *self.mouse_tracking_active.lock().await = active;
    }

    pub async fn is_camera_active(&self) -> bool {
        *self.camera_active.lock().await
    }

    pub async fn set_camera_active(&self, active: bool) {
        *self.camera_active.lock().await = active;
    }
}
