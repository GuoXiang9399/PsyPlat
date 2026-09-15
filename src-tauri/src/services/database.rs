use crate::models::data_models::{AppSettings, AssessmentFilters, AssessmentRecord, DailyCount, RiskLevel, Statistics};
use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::Path;
use uuid::Uuid;

pub struct DatabaseService {
    conn: Connection,
}

impl DatabaseService {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)
            .context("Failed to open database")?;
        let mut service = Self { conn };
        service.init()?;
        Ok(service)
    }

    pub fn init(&mut self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS assessments (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                hashed_id TEXT NOT NULL,
                phq9_score INTEGER NOT NULL,
                gad7_score INTEGER NOT NULL,
                mouse_features TEXT,
                facial_features TEXT,
                risk_level TEXT NOT NULL,
                risk_score REAL NOT NULL,
                risk_factors TEXT NOT NULL,
                suggestions TEXT NOT NULL,
                notes TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_assessments_timestamp ON assessments(timestamp);
            CREATE INDEX IF NOT EXISTS idx_assessments_risk_level ON assessments(risk_level);
            CREATE INDEX IF NOT EXISTS idx_assessments_hashed_id ON assessments(hashed_id);

            CREATE TABLE IF NOT EXISTS access_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            "
        ).context("Failed to initialize database tables")?;
        Ok(())
    }

    pub fn save_assessment(&self, record: &AssessmentRecord) -> Result<String> {
        let id = record.id.clone();
        let mouse_json = record.mouse_features.as_ref()
            .map(|f| serde_json::to_string(f).unwrap_or_default());
        let facial_json = record.facial_features.as_ref()
            .map(|f| serde_json::to_string(f).unwrap_or_default());
        let risk_factors_json = serde_json::to_string(&record.risk_factors).unwrap_or_default();
        let suggestions_json = serde_json::to_string(&record.suggestions).unwrap_or_default();

        self.conn.execute(
            "INSERT INTO assessments (id, timestamp, hashed_id, phq9_score, gad7_score,
             mouse_features, facial_features, risk_level, risk_score, risk_factors, suggestions, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET
             timestamp=?2, hashed_id=?3, phq9_score=?4, gad7_score=?5,
             mouse_features=?6, facial_features=?7, risk_level=?8, risk_score=?9,
             risk_factors=?10, suggestions=?11, notes=?12",
            params![
                id, record.timestamp, record.hashed_id, record.phq9_score, record.gad7_score,
                mouse_json, facial_json, record.risk_level.as_str(), record.risk_score,
                risk_factors_json, suggestions_json, record.notes
            ]
        ).context("Failed to save assessment")?;

        Ok(id)
    }

    pub fn get_assessments(&self, filters: &AssessmentFilters) -> Result<Vec<AssessmentRecord>> {
        let mut query = String::from("SELECT * FROM assessments WHERE 1=1");
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(start) = &filters.start_date {
            query.push_str(" AND timestamp >= ?");
            params_vec.push(Box::new(start.clone()));
        }
        if let Some(end) = &filters.end_date {
            query.push_str(" AND timestamp <= ?");
            params_vec.push(Box::new(end.clone()));
        }
        if let Some(level) = &filters.risk_level {
            query.push_str(" AND risk_level = ?");
            params_vec.push(Box::new(level.as_str().to_string()));
        }
        if let Some(min) = filters.min_score {
            query.push_str(" AND (phq9_score + gad7_score) >= ?");
            params_vec.push(Box::new(min));
        }
        if let Some(max) = filters.max_score {
            query.push_str(" AND (phq9_score + gad7_score) <= ?");
            params_vec.push(Box::new(max));
        }

        query.push_str(" ORDER BY timestamp DESC");

        if let Some(limit) = filters.limit {
            query.push_str(" LIMIT ?");
            params_vec.push(Box::new(limit));
        }
        if let Some(offset) = filters.offset {
            query.push_str(" OFFSET ?");
            params_vec.push(Box::new(offset));
        }

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter()
            .map(|p| p.as_ref()).collect();

        let mut stmt = self.conn.prepare(&query)?;
        let records = stmt.query_map(&params_refs[..], |row| {
            let risk_level_str: String = row.get(7)?;
            let risk_level = match risk_level_str.as_str() {
                "低风险" => RiskLevel::Low,
                "轻度风险" => RiskLevel::Mild,
                "中度风险" => RiskLevel::Moderate,
                _ => RiskLevel::High,
            };

            let mouse_features: Option<String> = row.get(5)?;
            let facial_features: Option<String> = row.get(6)?;
            let risk_factors_json: String = row.get(9)?;
            let suggestions_json: String = row.get(10)?;

            Ok(AssessmentRecord {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                hashed_id: row.get(2)?,
                phq9_score: row.get(3)?,
                gad7_score: row.get(4)?,
                mouse_features: mouse_features.and_then(|s| serde_json::from_str(&s).ok()),
                facial_features: facial_features.and_then(|s| serde_json::from_str(&s).ok()),
                risk_level,
                risk_score: row.get(8)?,
                risk_factors: serde_json::from_str(&risk_factors_json).unwrap_or_default(),
                suggestions: serde_json::from_str(&suggestions_json).unwrap_or_default(),
                notes: row.get(11)?,
            })
        })?;

        let mut result = Vec::new();
        for record in records {
            result.push(record?);
        }
        Ok(result)
    }

    pub fn delete_assessment(&self, id: &str) -> Result<bool> {
        let affected = self.conn.execute(
            "DELETE FROM assessments WHERE id = ?1",
            params![id]
        ).context("Failed to delete assessment")?;
        Ok(affected > 0)
    }

    pub fn get_statistics(&self) -> Result<Statistics> {
        let total: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM assessments", [], |row| row.get(0)
        ).unwrap_or(0);

        let mut stmt = self.conn.prepare(
            "SELECT risk_level, COUNT(*) FROM assessments GROUP BY risk_level"
        )?;
        let risk_rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })?;

        let mut risk_distribution = HashMap::new();
        for row in risk_rows {
            let (level, count) = row?;
            risk_distribution.insert(level, count);
        }

        let avg_phq9: f64 = self.conn.query_row(
            "SELECT AVG(CAST(phq9_score AS REAL)) FROM assessments", [], |row| row.get(0)
        ).unwrap_or(0.0);

        let avg_gad7: f64 = self.conn.query_row(
            "SELECT AVG(CAST(gad7_score AS REAL)) FROM assessments", [], |row| row.get(0)
        ).unwrap_or(0.0);

        let mut stmt = self.conn.prepare(
            "SELECT date(timestamp), COUNT(*) FROM assessments
             WHERE timestamp >= date('now', '-30 days')
             GROUP BY date(timestamp)
             ORDER BY date(timestamp)"
        )?;
        let daily_rows = stmt.query_map([], |row| {
            Ok(DailyCount {
                date: row.get(0)?,
                count: row.get(1)?,
            })
        })?;

        let mut daily_counts = Vec::new();
        for row in daily_rows {
            daily_counts.push(row?);
        }

        let last_7: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM assessments WHERE timestamp >= date('now', '-7 days')",
            [], |row| row.get(0)
        ).unwrap_or(0);

        let last_30: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM assessments WHERE timestamp >= date('now', '-30 days')",
            [], |row| row.get(0)
        ).unwrap_or(0);

        Ok(Statistics {
            total_assessments: total,
            risk_distribution,
            avg_phq9_score: avg_phq9,
            avg_gad7_score: avg_gad7,
            daily_counts,
            last_7_days_count: last_7,
            last_30_days_count: last_30,
        })
    }

    pub fn export_to_csv(&self, filepath: &str) -> Result<()> {
        let records = self.get_assessments(&AssessmentFilters {
            start_date: None, end_date: None, risk_level: None,
            min_score: None, max_score: None, limit: None, offset: None,
        })?;

        let mut writer = csv::Writer::from_path(filepath)
            .context("Failed to create CSV file")?;

        writer.write_record(&[
            "id", "timestamp", "hashed_id", "phq9_score", "gad7_score",
            "risk_level", "risk_score", "risk_factors", "suggestions", "notes"
        ])?;

        for record in records {
            writer.write_record(&[
                &record.id,
                &record.timestamp,
                &record.hashed_id,
                &record.phq9_score.to_string(),
                &record.gad7_score.to_string(),
                record.risk_level.as_str(),
                &format!("{:.2}", record.risk_score),
                &record.risk_factors.join("; "),
                &record.suggestions.join("; "),
                &record.notes.unwrap_or_default(),
            ])?;
        }

        writer.flush()?;
        Ok(())
    }

    pub fn export_to_json(&self, filepath: &str) -> Result<()> {
        let records = self.get_assessments(&AssessmentFilters {
            start_date: None, end_date: None, risk_level: None,
            min_score: None, max_score: None, limit: None, offset: None,
        })?;

        let json = serde_json::to_string_pretty(&records)
            .context("Failed to serialize assessments")?;

        std::fs::write(filepath, json)
            .context("Failed to write JSON file")?;

        Ok(())
    }

    pub fn load_settings(&self) -> Result<AppSettings> {
        let mut settings = AppSettings::default();

        let mut stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "auto_start" => settings.auto_start = value.parse().unwrap_or(false),
                "tracking_enabled" => settings.tracking_enabled = value.parse().unwrap_or(true),
                "camera_enabled" => settings.camera_enabled = value.parse().unwrap_or(false),
                "sample_rate_hz" => settings.sample_rate_hz = value.parse().unwrap_or(60),
                "tracking_duration_sec" => settings.tracking_duration_sec = value.parse().unwrap_or(300),
                "data_retention_days" => settings.data_retention_days = value.parse().unwrap_or(365),
                "encryption_enabled" => settings.encryption_enabled = value.parse().unwrap_or(true),
                "language" => settings.language = value,
                "theme" => settings.theme = value,
                "notification_enabled" => settings.notification_enabled = value.parse().unwrap_or(true),
                "risk_threshold_mild" => settings.risk_threshold_mild = value.parse().unwrap_or(0.25),
                "risk_threshold_moderate" => settings.risk_threshold_moderate = value.parse().unwrap_or(0.50),
                "risk_threshold_high" => settings.risk_threshold_high = value.parse().unwrap_or(0.75),
                _ => {}
            }
        }

        Ok(settings)
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let settings_map = vec![
            ("auto_start", settings.auto_start.to_string()),
            ("tracking_enabled", settings.tracking_enabled.to_string()),
            ("camera_enabled", settings.camera_enabled.to_string()),
            ("sample_rate_hz", settings.sample_rate_hz.to_string()),
            ("tracking_duration_sec", settings.tracking_duration_sec.to_string()),
            ("data_retention_days", settings.data_retention_days.to_string()),
            ("encryption_enabled", settings.encryption_enabled.to_string()),
            ("language", settings.language.clone()),
            ("theme", settings.theme.clone()),
            ("notification_enabled", settings.notification_enabled.to_string()),
            ("risk_threshold_mild", settings.risk_threshold_mild.to_string()),
            ("risk_threshold_moderate", settings.risk_threshold_moderate.to_string()),
            ("risk_threshold_high", settings.risk_threshold_high.to_string()),
        ];

        for (key, value) in settings_map {
            self.conn.execute(
                "INSERT INTO settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = ?2",
                params![key, value]
            )?;
        }

        Ok(())
    }

    pub fn log_access(&self, action: &str, details: Option<&str>) -> Result<()> {
        let timestamp = chrono::Local::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO access_logs (timestamp, action, details) VALUES (?1, ?2, ?3)",
            params![timestamp, action, details]
        ).context("Failed to log access")?;
        Ok(())
    }
}
