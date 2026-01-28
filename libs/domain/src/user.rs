//! User domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::{ProficiencyLevel, UserStatus};
use crate::ids::UserId;

/// A user in the system
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub user_id: UserId,
    pub email: String,
    pub display_name: String,
    pub status: UserStatus,
    pub skills: Vec<UserSkill>,
    pub roles: Vec<String>,
    pub quality_profile: QualityProfile,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A skill that a user possesses
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSkill {
    pub skill_id: String,
    pub proficiency: ProficiencyLevel,
    pub verified: bool,
    pub verified_at: Option<DateTime<Utc>>,
}

/// Quality profile tracking user performance
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QualityProfile {
    pub overall_score: Option<f64>,
    pub accuracy_score: Option<f64>,
    pub consistency_score: Option<f64>,
    pub speed_percentile: Option<f64>,
    pub total_annotations: i64,
    pub approved_annotations: i64,
    pub rejected_annotations: i64,
}
