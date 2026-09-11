use crate::models::data_models::{FacialFeatures, MouseFeatures, RiskLevel, RiskResult};

pub struct FusionModel;

impl FusionModel {
    pub fn new() -> Self {
        Self
    }

    pub fn predict(
        &self,
        mouse_features: Option<&MouseFeatures>,
        facial_features: Option<&FacialFeatures>,
        phq9_score: i32,
        gad7_score: i32,
    ) -> RiskResult {
        let questionnaire_score = self.calculate_questionnaire_risk(phq9_score, gad7_score);
        let facial_score = facial_features.map(|f| self.calculate_facial_risk(f)).unwrap_or(0.0);
        let mouse_score = mouse_features.map(|m| self.calculate_mouse_risk(m)).unwrap_or(0.0);

        let has_facial = facial_features.is_some();
        let has_mouse = mouse_features.is_some();

        let (weights, total_weight) = Self::calculate_weights(has_facial, has_mouse);

        let risk_score = if total_weight > 0.0 {
            (questionnaire_score * weights.0 + facial_score * weights.1 + mouse_score * weights.2) / total_weight
        } else {
            questionnaire_score
        };

        let risk_level = self.classify_risk(risk_score);
        let risk_factors = self.identify_risk_factors(
            questionnaire_score, facial_score, mouse_score,
            phq9_score, gad7_score, facial_features, mouse_features
        );
        let suggestions = self.generate_suggestions(&risk_level, &risk_factors);

        let confidence = Self::calculate_confidence(has_facial, has_mouse, risk_score);

        RiskResult {
            risk_level,
            risk_score: (risk_score * 100.0).round() / 100.0,
            risk_factors,
            suggestions,
            confidence: (confidence * 100.0).round() / 100.0,
        }
    }

    fn calculate_weights(has_facial: bool, has_mouse: bool) -> ((f64, f64, f64), f64) {
        let mut q_weight = 0.40;
        let mut f_weight = if has_facial { 0.35 } else { 0.0 };
        let mut m_weight = if has_mouse { 0.25 } else { 0.0 };

        if !has_facial && has_mouse {
            q_weight = 0.55;
            m_weight = 0.45;
        } else if has_facial && !has_mouse {
            q_weight = 0.50;
            f_weight = 0.50;
        } else if !has_facial && !has_mouse {
            q_weight = 1.0;
        }

        let total = q_weight + f_weight + m_weight;
        ((q_weight, f_weight, m_weight), total)
    }

    fn calculate_questionnaire_risk(&self, phq9: i32, gad7: i32) -> f64 {
        let phq9_max = 27.0;
        let gad7_max = 21.0;
        let phq9_norm = (phq9 as f64 / phq9_max).clamp(0.0, 1.0);
        let gad7_norm = (gad7 as f64 / gad7_max).clamp(0.0, 1.0);
        (phq9_norm * 0.6 + gad7_norm * 0.4).clamp(0.0, 1.0)
    }

    fn calculate_facial_risk(&self, features: &FacialFeatures) -> f64 {
        let hr_score = ((features.avg_heart_rate - 60.0) / 40.0).clamp(0.0, 1.0);
        let hr_var_score = (features.heart_rate_variance / 20.0).clamp(0.0, 1.0);
        let blink_score = if features.blink_rate > 20.0 {
            (features.blink_rate - 20.0) / 20.0
        } else if features.blink_rate < 8.0 {
            (8.0 - features.blink_rate) / 8.0
        } else {
            0.0
        };
        let gaze_score = (1.0 - features.gaze_stability).clamp(0.0, 1.0);
        let tension_score = features.facial_tension.clamp(0.0, 1.0);
        let emotion_score = if features.emotion_dominant == "焦虑" || features.emotion_dominant == "悲伤" {
            0.6
        } else if features.emotion_dominant == "愤怒" || features.emotion_dominant == "恐惧" {
            0.8
        } else {
            0.2
        };

        (hr_score * 0.15 + hr_var_score * 0.15 + blink_score * 0.20
            + gaze_score * 0.20 + tension_score * 0.15 + emotion_score * 0.15)
            .clamp(0.0, 1.0)
    }

    fn calculate_mouse_risk(&self, features: &MouseFeatures) -> f64 {
        let speed_score = if features.avg_speed < 100.0 {
            (100.0 - features.avg_speed) / 100.0
        } else {
            (features.avg_speed - 500.0) / 500.0
        }.clamp(0.0, 1.0);

        let pause_score = (features.pause_frequency / 5.0).clamp(0.0, 1.0);
        let pause_dur_score = (features.pause_duration_avg / 2.0).clamp(0.0, 1.0);
        let entropy_score = (1.0 - features.movement_entropy).clamp(0.0, 1.0);
        let dir_change_score = (features.direction_changes as f64 / 50.0).clamp(0.0, 1.0);

        (speed_score * 0.25 + pause_score * 0.25 + pause_dur_score * 0.20
            + entropy_score * 0.15 + dir_change_score * 0.15)
            .clamp(0.0, 1.0)
    }

    fn classify_risk(&self, score: f64) -> RiskLevel {
        match score {
            s if s < 0.25 => RiskLevel::Low,
            s if s < 0.50 => RiskLevel::Mild,
            s if s < 0.75 => RiskLevel::Moderate,
            _ => RiskLevel::High,
        }
    }

    fn identify_risk_factors(
        &self,
        q_score: f64,
        f_score: f64,
        m_score: f64,
        phq9: i32,
        gad7: i32,
        facial: Option<&FacialFeatures>,
        mouse: Option<&MouseFeatures>,
    ) -> Vec<String> {
        let mut factors = Vec::new();

        if q_score > 0.3 {
            if phq9 >= 10 {
                factors.push("PHQ-9量表得分偏高，提示抑郁症状".to_string());
            }
            if gad7 >= 10 {
                factors.push("GAD-7量表得分偏高，提示焦虑症状".to_string());
            }
            if phq9 >= 15 || gad7 >= 15 {
                factors.push("量表总分显著升高，建议关注心理健康".to_string());
            }
        }

        if let Some(f) = facial {
            if f.avg_heart_rate > 90.0 {
                factors.push("心率偏快，可能存在生理应激反应".to_string());
            }
            if f.heart_rate_variance > 15.0 {
                factors.push("心率变异性增大，提示自主神经调节不稳".to_string());
            }
            if f.blink_rate > 20.0 || f.blink_rate < 8.0 {
                factors.push("眨眼频率异常，可能与紧张或疲劳相关".to_string());
            }
            if f.gaze_stability < 0.6 {
                factors.push("视线稳定性较差，可能存在注意力分散".to_string());
            }
            if f.facial_tension > 0.6 {
                factors.push("面部肌肉紧张度偏高".to_string());
            }
        }

        if let Some(m) = mouse {
            if m.avg_speed < 100.0 {
                factors.push("鼠标移动速度偏慢，可能存在精神运动性迟滞".to_string());
            }
            if m.pause_frequency > 3.0 {
                factors.push("鼠标停顿频率增加，可能存在认知加工困难".to_string());
            }
            if m.movement_entropy < 0.4 {
                factors.push("鼠标轨迹熵值较低，行为模式趋于刻板".to_string());
            }
        }

        if factors.is_empty() {
            factors.push("目前未检测到显著风险因素".to_string());
        }

        factors
    }

    fn generate_suggestions(&self, risk_level: &RiskLevel, factors: &[String]) -> Vec<String> {
        let mut suggestions = Vec::new();

        match risk_level {
            RiskLevel::Low => {
                suggestions.push("继续保持良好的心理状态和生活习惯".to_string());
                suggestions.push("定期进行自我心理评估".to_string());
            }
            RiskLevel::Mild => {
                suggestions.push("建议增加户外活动和社交互动".to_string());
                suggestions.push("尝试正念冥想或放松训练".to_string());
                suggestions.push("保持规律作息，避免熬夜".to_string());
                if factors.iter().any(|f| f.contains("PHQ-9")) {
                    suggestions.push("如情绪低落持续，建议与亲友倾诉".to_string());
                }
            }
            RiskLevel::Moderate => {
                suggestions.push("建议预约心理咨询师进行专业评估".to_string());
                suggestions.push("考虑寻求学校/单位心理支持资源".to_string());
                suggestions.push("保持适度运动，有助于缓解焦虑情绪".to_string());
                suggestions.push("避免孤立自己，主动寻求社会支持".to_string());
            }
            RiskLevel::High => {
                suggestions.push("建议尽快寻求专业心理援助".to_string());
                suggestions.push("联系心理危机干预热线或专业机构".to_string());
                suggestions.push("告知信任的家人或朋友当前状态".to_string());
                suggestions.push("避免独处，确保身边有人陪伴".to_string());
            }
        }

        suggestions
    }

    fn calculate_confidence(has_facial: bool, has_mouse: bool, score: f64) -> f64 {
        let base = if has_facial && has_mouse {
            0.90
        } else if has_facial || has_mouse {
            0.75
        } else {
            0.65
        };

        let score_confidence = 1.0 - (score - 0.5).abs() * 0.3;
        (base * score_confidence).clamp(0.5, 0.95)
    }
}
