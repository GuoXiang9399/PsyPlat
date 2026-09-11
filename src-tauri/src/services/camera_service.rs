use crate::models::data_models::FacialFeatures;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

pub struct CameraService {
    capturing: Arc<AtomicBool>,
    frame_count: Arc<tokio::sync::Mutex<i32>>,
    last_features: Arc<tokio::sync::Mutex<Option<FacialFeatures>>>,
}

impl CameraService {
    pub fn new() -> Self {
        Self {
            capturing: Arc::new(AtomicBool::new(false)),
            frame_count: Arc::new(tokio::sync::Mutex::new(0)),
            last_features: Arc::new(tokio::sync::Mutex::new(None)),
        }
    }

    pub async fn start_capture(&self, duration_sec: u32, fps: u32) {
        if self.capturing.load(Ordering::SeqCst) {
            return;
        }

        self.capturing.store(true, Ordering::SeqCst);
        let capturing = self.capturing.clone();
        let frame_count = self.frame_count.clone();
        let last_features = self.last_features.clone();

        let interval_ms = 1000 / fps as u64;
        let start_time = Instant::now();
        let max_duration = Duration::from_secs(duration_sec as u64);

        tokio::spawn(async move {
            let mut hr_samples = Vec::new();
            let mut blink_samples = Vec::new();
            let mut gaze_samples = Vec::new();
            let mut tension_samples = Vec::new();

            while capturing.load(Ordering::SeqCst) && start_time.elapsed() < max_duration {
                let mut count = frame_count.lock().await;
                *count += 1;
                drop(count);

                let hr = 60.0 + rand::random::<f64>() * 40.0;
                let hr_var = rand::random::<f64>() * 20.0;
                let blink = 5.0 + rand::random::<f64>() * 20.0;
                let gaze = 0.3 + rand::random::<f64>() * 0.7;
                let tension = rand::random::<f64>() * 0.8;

                hr_samples.push(hr);
                blink_samples.push(blink);
                gaze_samples.push(gaze);
                tension_samples.push(tension);

                let emotions = vec!["中性", "焦虑", "悲伤", "愤怒", "恐惧", "快乐"];
                let emotion_idx = (rand::random::<f64>() * emotions.len() as f64) as usize % emotions.len();
                let dominant_emotion = emotions[emotion_idx].to_string();

                let micro_expression = rand::random::<f64>() * 0.5;
                let skin_proxy = rand::random::<f64>() * 0.6;

                let features = FacialFeatures {
                    avg_heart_rate: hr,
                    heart_rate_variance: hr_var,
                    blink_rate: blink,
                    gaze_stability: gaze,
                    micro_expression_score: micro_expression,
                    skin_conductance_proxy: skin_proxy,
                    facial_tension: tension,
                    emotion_dominant: dominant_emotion,
                };

                let mut lf = last_features.lock().await;
                *lf = Some(features);
                drop(lf);

                sleep(Duration::from_millis(interval_ms)).await;
            }

            capturing.store(false, Ordering::SeqCst);
        });
    }

    pub async fn stop_capture(&self) {
        self.capturing.store(false, Ordering::SeqCst);
    }

    pub async fn extract_facial_features(&self) -> FacialFeatures {
        let lf = self.last_features.lock().await;
        if let Some(features) = lf.clone() {
            return features;
        }
        drop(lf);

        let emotions = vec!["中性", "焦虑", "悲伤", "愤怒", "恐惧", "快乐"];
        let emotion_idx = (rand::random::<f64>() * emotions.len() as f64) as usize % emotions.len();

        FacialFeatures {
            avg_heart_rate: 72.0,
            heart_rate_variance: 8.0,
            blink_rate: 15.0,
            gaze_stability: 0.75,
            micro_expression_score: 0.2,
            skin_conductance_proxy: 0.3,
            facial_tension: 0.3,
            emotion_dominant: emotions[emotion_idx].to_string(),
        }
    }

    pub async fn get_rppg_signal(&self) -> Option<Vec<f64>> {
        if !self.capturing.load(Ordering::SeqCst) {
            return None;
        }

        let mut signal = Vec::new();
        for _ in 0..30 {
            let intensity = 0.5 + rand::random::<f64>() * 0.5;
            signal.push(intensity);
        }
        Some(signal)
    }

    pub fn is_capturing(&self) -> bool {
        self.capturing.load(Ordering::SeqCst)
    }

    pub async fn get_frame_count(&self) -> i32 {
        *self.frame_count.lock().await
    }
}
