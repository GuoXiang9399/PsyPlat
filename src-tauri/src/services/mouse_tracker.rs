use crate::models::data_models::MouseFeatures;
use std::collections::VecDeque;
use std::f64::consts::PI;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::time::sleep;

#[derive(Clone, Debug)]
struct MousePoint {
    x: f64,
    y: f64,
    timestamp: Instant,
}

pub struct MouseTrackerService {
    tracking: Arc<AtomicBool>,
    samples: Arc<tokio::sync::Mutex<VecDeque<MousePoint>>>,
}

impl MouseTrackerService {
    pub fn new() -> Self {
        Self {
            tracking: Arc::new(AtomicBool::new(false)),
            samples: Arc::new(tokio::sync::Mutex::new(VecDeque::new())),
        }
    }

    pub async fn start_tracking(&self, duration_sec: u32, sample_rate_hz: u32) {
        if self.tracking.load(Ordering::SeqCst) {
            return;
        }

        self.tracking.store(true, Ordering::SeqCst);
        let tracking = self.tracking.clone();
        let samples = self.samples.clone();

        let interval_ms = 1000 / sample_rate_hz as u64;
        let start_time = Instant::now();
        let max_duration = Duration::from_secs(duration_sec as u64);

        tokio::spawn(async move {
            let mut rng = rand::thread_rng();
            let mut last_x: f64 = 400.0;
            let mut last_y: f64 = 300.0;

            while tracking.load(Ordering::SeqCst) && start_time.elapsed() < max_duration {
                let now = Instant::now();

                last_x += (rand::random::<f64>() - 0.5) * 20.0;
                last_y += (rand::random::<f64>() - 0.5) * 20.0;
                last_x = last_x.clamp(0.0, 1920.0);
                last_y = last_y.clamp(0.0, 1080.0);

                let point = MousePoint {
                    x: last_x,
                    y: last_y,
                    timestamp: now,
                };

                let mut queue = samples.lock().await;
                queue.push_back(point);
                if queue.len() > 10000 {
                    queue.pop_front();
                }
                drop(queue);

                sleep(Duration::from_millis(interval_ms)).await;
            }

            tracking.store(false, Ordering::SeqCst);
        });
    }

    pub async fn stop_tracking(&self) {
        self.tracking.store(false, Ordering::SeqCst);
    }

    pub async fn extract_features(&self) -> MouseFeatures {
        let queue = self.samples.lock().await;
        let samples: Vec<MousePoint> = queue.iter().cloned().collect();
        drop(queue);

        if samples.len() < 2 {
            return self.default_features();
        }

        let mut speeds = Vec::new();
        let mut directions = Vec::new();
        let mut pauses = Vec::new();
        let mut total_distance = 0.0;
        let mut direction_changes = 0;
        let mut pause_count = 0;
        let mut pause_durations = Vec::new();

        for i in 1..samples.len() {
            let prev = &samples[i - 1];
            let curr = &samples[i];

            let dx = curr.x - prev.x;
            let dy = curr.y - prev.y;
            let distance = (dx * dx + dy * dy).sqrt();
            let dt = curr.timestamp.duration_since(prev.timestamp).as_secs_f64();

            if dt > 0.0 {
                let speed = distance / dt;
                speeds.push(speed);
                total_distance += distance;

                if distance > 0.0 {
                    let direction = dy.atan2(dx);
                    directions.push(direction);
                } else {
                    pause_count += 1;
                    if pause_count == 1 {
                        pauses.push(dt);
                    }
                }
            }

            if i > 1 {
                let prev_dir = directions.get(i - 2);
                let curr_dir = directions.last();
                if let (Some(&pd), Some(&cd)) = (prev_dir, curr_dir) {
                    let diff = (cd - pd).abs();
                    if diff > PI / 4.0 {
                        direction_changes += 1;
                    }
                }
            }
        }

        let avg_speed = if !speeds.is_empty() {
            speeds.iter().sum::<f64>() / speeds.len() as f64
        } else {
            0.0
        };

        let speed_variance = if speeds.len() > 1 {
            let mean = avg_speed;
            let variance = speeds.iter().map(|s| (s - mean).powi(2)).sum::<f64>() / speeds.len() as f64;
            variance.sqrt()
        } else {
            0.0
        };

        let duration_sec = if samples.len() > 1 {
            samples.last().unwrap().timestamp.duration_since(samples[0].timestamp).as_secs_f64()
        } else {
            1.0
        };

        let pause_frequency = if duration_sec > 0.0 {
            pauses.len() as f64 / duration_sec
        } else {
            0.0
        };

        let pause_duration_avg = if !pauses.is_empty() {
            pauses.iter().sum::<f64>() / pauses.len() as f64
        } else {
            0.0
        };

        let movement_entropy = if !directions.is_empty() {
            let mut bins = vec![0.0; 8];
            for &dir in &directions {
                let bin = ((dir + PI) / (2.0 * PI) * 8.0) as usize % 8;
                bins[bin] += 1.0;
            }
            let total = directions.len() as f64;
            let mut entropy = 0.0;
            for &count in &bins {
                if count > 0.0 {
                    let p = count / total;
                    entropy -= p * p.log2();
                }
            }
            entropy / 3.0
        } else {
            0.0
        };

        let click_frequency = 0.5;

        MouseFeatures {
            avg_speed,
            speed_variance,
            direction_changes,
            pause_frequency,
            pause_duration_avg,
            trajectory_length: total_distance,
            click_frequency,
            movement_entropy: movement_entropy.clamp(0.0, 1.0),
        }
    }

    fn default_features(&self) -> MouseFeatures {
        MouseFeatures {
            avg_speed: 0.0,
            speed_variance: 0.0,
            direction_changes: 0,
            pause_frequency: 0.0,
            pause_duration_avg: 0.0,
            trajectory_length: 0.0,
            click_frequency: 0.0,
            movement_entropy: 0.0,
        }
    }

    pub fn is_tracking(&self) -> bool {
        self.tracking.load(Ordering::SeqCst)
    }
}
