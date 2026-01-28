//! Pagination types for list operations

use serde::{Deserialize, Serialize};
use typeshare::typeshare;

/// Sort order for pagination
#[typeshare]
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    #[default]
    Asc,
    Desc,
}

/// Pagination parameters for list queries
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    /// Maximum number of items to return (default: 20, max: 100)
    #[serde(default = "default_limit")]
    pub limit: i64,
    /// Number of items to skip (default: 0)
    #[serde(default)]
    pub offset: i64,
    /// Field to sort by
    pub sort_by: Option<String>,
    /// Sort order (default: ascending)
    #[serde(default)]
    pub sort_order: SortOrder,
}

fn default_limit() -> i64 {
    20
}

impl Default for Pagination {
    fn default() -> Self {
        Self {
            limit: 20,
            offset: 0,
            sort_by: None,
            sort_order: SortOrder::Asc,
        }
    }
}

impl Pagination {
    /// Create pagination with custom limit
    pub fn with_limit(limit: i64) -> Self {
        Self {
            limit: limit.min(100),
            ..Default::default()
        }
    }

    /// Get clamped limit (max 100)
    pub fn clamped_limit(&self) -> i64 {
        self.limit.min(100).max(1)
    }
}

/// A page of results from a list query
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page<T> {
    /// The items in this page
    pub items: Vec<T>,
    /// Total number of items matching the query
    pub total: i64,
    /// Limit used for this query
    pub limit: i64,
    /// Offset used for this query
    pub offset: i64,
}

impl<T> Page<T> {
    /// Create a new page from items and pagination info
    pub fn new(items: Vec<T>, total: i64, pagination: &Pagination) -> Self {
        Self {
            items,
            total,
            limit: pagination.limit,
            offset: pagination.offset,
        }
    }

    /// Create an empty page
    pub fn empty(pagination: &Pagination) -> Self {
        Self {
            items: Vec::new(),
            total: 0,
            limit: pagination.limit,
            offset: pagination.offset,
        }
    }

    /// Check if there are more items after this page
    pub fn has_more(&self) -> bool {
        self.offset + (self.items.len() as i64) < self.total
    }

    /// Get the next page offset
    pub fn next_offset(&self) -> Option<i64> {
        if self.has_more() {
            Some(self.offset + self.items.len() as i64)
        } else {
            None
        }
    }

    /// Map items to a different type
    pub fn map<U, F>(self, f: F) -> Page<U>
    where
        F: FnMut(T) -> U,
    {
        Page {
            items: self.items.into_iter().map(f).collect(),
            total: self.total,
            limit: self.limit,
            offset: self.offset,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_default() {
        let p = Pagination::default();
        assert_eq!(p.limit, 20);
        assert_eq!(p.offset, 0);
        assert_eq!(p.sort_order, SortOrder::Asc);
    }

    #[test]
    fn test_pagination_clamped_limit() {
        let p = Pagination {
            limit: 500,
            ..Default::default()
        };
        assert_eq!(p.clamped_limit(), 100);
    }

    #[test]
    fn test_page_has_more() {
        let pagination = Pagination::default();
        let page: Page<i32> = Page::new(vec![1, 2, 3], 50, &pagination);
        assert!(page.has_more());

        let page: Page<i32> = Page::new(vec![1, 2, 3], 3, &pagination);
        assert!(!page.has_more());
    }

    #[test]
    fn test_page_next_offset() {
        let pagination = Pagination::default();
        let page: Page<i32> = Page::new(vec![1, 2, 3], 50, &pagination);
        assert_eq!(page.next_offset(), Some(3));

        let page: Page<i32> = Page::new(vec![1, 2, 3], 3, &pagination);
        assert_eq!(page.next_offset(), None);
    }
}
