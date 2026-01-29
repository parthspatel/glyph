//! User domain models

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;

use crate::enums::{ProficiencyLevel, SkillStatus, UserStatus};
use crate::ids::UserId;

/// Global role for platform-wide permissions
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum GlobalRole {
    Admin,
    #[default]
    User,
}

/// Contact information for a user
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ContactInfo {
    pub phone: Option<String>,
    pub slack_handle: Option<String>,
    pub office_location: Option<String>,
}

/// A user in the system
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub user_id: UserId,
    pub auth0_id: Option<String>,
    pub email: String,
    pub display_name: String,
    pub status: UserStatus,
    pub timezone: Option<String>,
    pub department: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: Option<String>,
    pub contact_info: ContactInfo,
    pub global_role: GlobalRole,
    pub skills: Vec<UserSkill>,
    pub roles: Vec<String>,
    pub quality_profile: QualityProfile,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A skill that a user possesses (legacy format)
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

/// User skill certification (normalized table format)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSkillCertification {
    pub certification_id: Uuid,
    pub skill_id: String,
    pub proficiency_level: Option<String>,
    pub certified_by: Option<UserId>,
    pub certified_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

impl UserSkillCertification {
    /// Compute the status of this certification based on expiration and grace period
    pub fn status(&self, grace_period_days: i32) -> SkillStatus {
        let Some(expires_at) = self.expires_at else {
            return SkillStatus::NeverExpires;
        };
        let now = Utc::now();
        if now < expires_at {
            return SkillStatus::Active;
        }
        let grace_end = expires_at + Duration::days(grace_period_days as i64);
        if now < grace_end {
            SkillStatus::SoftExpired
        } else {
            SkillStatus::HardExpired
        }
    }
}

/// Configurable skill type template
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillType {
    pub skill_id: String,
    pub name: String,
    pub description: Option<String>,
    pub expiration_months: Option<i32>,
    pub grace_period_days: i32,
    pub requires_proficiency: bool,
    pub proficiency_levels: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
