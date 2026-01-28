//! Team domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::ids::{TeamId, UserId};

/// Status of a team
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TeamStatus {
    Active,
    Inactive,
    Deleted,
}

/// Role of a member within a team
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TeamRole {
    Leader,
    Manager,
    Member,
}

/// A team of users working together
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
    pub team_id: TeamId,
    pub name: String,
    pub description: Option<String>,
    pub leader_id: UserId,
    pub status: TeamStatus,
    pub capacity: Option<i32>,
    pub specializations: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A membership record linking a user to a team
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMembership {
    pub team_id: TeamId,
    pub user_id: UserId,
    pub role: TeamRole,
    pub allocation_percentage: Option<i32>,
    pub joined_at: DateTime<Utc>,
}
