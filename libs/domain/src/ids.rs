//! Type-safe prefixed ID types for all domain entities.
//!
//! Each ID type wraps a UUID v7 (time-ordered) and serializes with a human-readable prefix.
//! Example: `user_01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90`

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::{self, Display};
use std::str::FromStr;
use thiserror::Error;
use uuid::Uuid;

/// Errors that can occur when parsing entity IDs
#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum IdParseError {
    #[error("missing prefix separator '_'")]
    MissingPrefix,
    #[error("wrong prefix: expected '{expected}', got '{got}'")]
    WrongPrefix { expected: &'static str, got: String },
    #[error("invalid UUID: {0}")]
    InvalidUuid(String),
}

impl From<uuid::Error> for IdParseError {
    fn from(e: uuid::Error) -> Self {
        IdParseError::InvalidUuid(e.to_string())
    }
}

/// Macro to define a prefixed ID type with all necessary implementations
macro_rules! define_prefixed_id {
    ($name:ident, $prefix:literal) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub struct $name(Uuid);

        impl $name {
            /// The string prefix for this ID type
            pub const PREFIX: &'static str = $prefix;

            /// Create a new ID with UUID v7 (time-ordered)
            #[must_use]
            pub fn new() -> Self {
                Self(Uuid::now_v7())
            }

            /// Create an ID from an existing UUID
            #[must_use]
            pub const fn from_uuid(uuid: Uuid) -> Self {
                Self(uuid)
            }

            /// Get the underlying UUID
            #[must_use]
            pub const fn as_uuid(&self) -> &Uuid {
                &self.0
            }

            /// Get the inner UUID value
            #[must_use]
            pub const fn into_uuid(self) -> Uuid {
                self.0
            }
        }

        impl Default for $name {
            fn default() -> Self {
                Self::new()
            }
        }

        impl Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}_{}", Self::PREFIX, self.0)
            }
        }

        impl FromStr for $name {
            type Err = IdParseError;

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                let (prefix, uuid_str) = s.split_once('_').ok_or(IdParseError::MissingPrefix)?;

                if prefix != Self::PREFIX {
                    return Err(IdParseError::WrongPrefix {
                        expected: Self::PREFIX,
                        got: prefix.to_string(),
                    });
                }

                let uuid = Uuid::parse_str(uuid_str)?;
                Ok(Self(uuid))
            }
        }

        impl Serialize for $name {
            fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
            where
                S: Serializer,
            {
                serializer.serialize_str(&self.to_string())
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
            where
                D: Deserializer<'de>,
            {
                let s = String::deserialize(deserializer)?;
                s.parse().map_err(serde::de::Error::custom)
            }
        }

        impl AsRef<Uuid> for $name {
            fn as_ref(&self) -> &Uuid {
                &self.0
            }
        }
    };
}

// Define all entity ID types
define_prefixed_id!(UserId, "user");
define_prefixed_id!(TeamId, "team");
define_prefixed_id!(ProjectId, "proj");
define_prefixed_id!(ProjectTypeId, "ptype");
define_prefixed_id!(TaskId, "task");
define_prefixed_id!(AnnotationId, "annot");
define_prefixed_id!(WorkflowId, "wf");
define_prefixed_id!(AssignmentId, "asgn");
define_prefixed_id!(QualityScoreId, "score");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_id_new_and_display() {
        let id = UserId::new();
        let s = id.to_string();
        assert!(s.starts_with("user_"), "Expected user_ prefix, got: {s}");
        assert!(s.len() > 5, "ID should be longer than just prefix");
    }

    #[test]
    fn test_user_id_parse_roundtrip() {
        let id = UserId::new();
        let s = id.to_string();
        let parsed: UserId = s.parse().expect("Should parse valid ID");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_user_id_parse_valid() {
        let s = "user_01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90";
        let id: UserId = s.parse().expect("Should parse valid user ID");
        assert_eq!(id.to_string(), s);
    }

    #[test]
    fn test_user_id_parse_missing_prefix() {
        let result = "01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90".parse::<UserId>();
        assert!(matches!(result, Err(IdParseError::MissingPrefix)));
    }

    #[test]
    fn test_user_id_parse_wrong_prefix() {
        let result = "task_01961a8e-7d3a-7f1c-9b2e-4a5c6d7e8f90".parse::<UserId>();
        match result {
            Err(IdParseError::WrongPrefix { expected, got }) => {
                assert_eq!(expected, "user");
                assert_eq!(got, "task");
            }
            _ => panic!("Expected WrongPrefix error"),
        }
    }

    #[test]
    fn test_user_id_parse_invalid_uuid() {
        let result = "user_not-a-valid-uuid".parse::<UserId>();
        assert!(matches!(result, Err(IdParseError::InvalidUuid(_))));
    }

    #[test]
    fn test_user_id_serde_roundtrip() {
        let id = UserId::new();
        let json = serde_json::to_string(&id).expect("Should serialize");
        let parsed: UserId = serde_json::from_str(&json).expect("Should deserialize");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_project_id() {
        let id = ProjectId::new();
        let s = id.to_string();
        assert!(s.starts_with("proj_"));
        let parsed: ProjectId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_task_id() {
        let id = TaskId::new();
        let s = id.to_string();
        assert!(s.starts_with("task_"));
        let parsed: TaskId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_annotation_id() {
        let id = AnnotationId::new();
        let s = id.to_string();
        assert!(s.starts_with("annot_"));
        let parsed: AnnotationId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_workflow_id() {
        let id = WorkflowId::new();
        let s = id.to_string();
        assert!(s.starts_with("wf_"));
        let parsed: WorkflowId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_team_id() {
        let id = TeamId::new();
        let s = id.to_string();
        assert!(s.starts_with("team_"));
        let parsed: TeamId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_assignment_id() {
        let id = AssignmentId::new();
        let s = id.to_string();
        assert!(s.starts_with("asgn_"));
        let parsed: AssignmentId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_quality_score_id() {
        let id = QualityScoreId::new();
        let s = id.to_string();
        assert!(s.starts_with("score_"));
        let parsed: QualityScoreId = s.parse().expect("Should parse");
        assert_eq!(id, parsed);
    }

    #[test]
    fn test_ids_are_unique() {
        let id1 = UserId::new();
        let id2 = UserId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_id_from_uuid() {
        let uuid = Uuid::now_v7();
        let id = UserId::from_uuid(uuid);
        assert_eq!(id.as_uuid(), &uuid);
    }

    #[test]
    fn test_cross_type_prefix_rejection() {
        // Ensure a TaskId string cannot be parsed as a UserId
        let task_id = TaskId::new();
        let task_str = task_id.to_string();
        let result = task_str.parse::<UserId>();
        assert!(matches!(
            result,
            Err(IdParseError::WrongPrefix {
                expected: "user",
                ..
            })
        ));
    }
}
