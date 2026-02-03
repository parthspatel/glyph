//! Intersection over Union (IoU) for spans and bounding boxes
//!
//! Used for measuring agreement on spatial annotations like
//! text spans, image regions, and bounding boxes.

use serde::{Deserialize, Serialize};

// =============================================================================
// Span (1D)
// =============================================================================

/// A 1D span with start and end positions
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Span {
    /// Start position (inclusive)
    pub start: usize,
    /// End position (exclusive)
    pub end: usize,
}

impl Span {
    /// Create a new span
    #[must_use]
    pub fn new(start: usize, end: usize) -> Self {
        Self {
            start: start.min(end),
            end: start.max(end),
        }
    }

    /// Get the length of the span
    #[must_use]
    pub fn len(&self) -> usize {
        self.end.saturating_sub(self.start)
    }

    /// Check if span is empty
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Check if this span overlaps with another
    #[must_use]
    pub fn overlaps(&self, other: &Span) -> bool {
        self.start < other.end && other.start < self.end
    }

    /// Get the intersection with another span
    #[must_use]
    pub fn intersection(&self, other: &Span) -> Option<Span> {
        if !self.overlaps(other) {
            return None;
        }

        Some(Span {
            start: self.start.max(other.start),
            end: self.end.min(other.end),
        })
    }
}

/// Calculate IoU between two spans
///
/// # Arguments
/// * `a` - First span
/// * `b` - Second span
///
/// # Returns
/// IoU score in range [0.0, 1.0]
#[must_use]
pub fn iou_span(a: &Span, b: &Span) -> f64 {
    let intersection_start = a.start.max(b.start);
    let intersection_end = a.end.min(b.end);

    let intersection = if intersection_end > intersection_start {
        intersection_end - intersection_start
    } else {
        0
    };

    let union = a.len() + b.len() - intersection;

    if union == 0 {
        return 0.0; // Both spans are empty
    }

    intersection as f64 / union as f64
}

/// Calculate average IoU for matched span pairs
///
/// Uses greedy matching: pairs spans by highest IoU until no more matches.
///
/// # Arguments
/// * `spans_a` - Spans from annotator A
/// * `spans_b` - Spans from annotator B
///
/// # Returns
/// Average IoU of matched pairs, or 0.0 if no matches
#[must_use]
pub fn average_iou_spans(spans_a: &[Span], spans_b: &[Span]) -> f64 {
    if spans_a.is_empty() || spans_b.is_empty() {
        return 0.0;
    }

    // Calculate all pairwise IoUs
    let mut iou_matrix: Vec<(usize, usize, f64)> = Vec::new();
    for (i, a) in spans_a.iter().enumerate() {
        for (j, b) in spans_b.iter().enumerate() {
            let iou = iou_span(a, b);
            if iou > 0.0 {
                iou_matrix.push((i, j, iou));
            }
        }
    }

    // Sort by IoU descending for greedy matching
    iou_matrix.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());

    // Greedy matching
    let mut matched_a = vec![false; spans_a.len()];
    let mut matched_b = vec![false; spans_b.len()];
    let mut total_iou = 0.0;
    for (i, j, iou) in iou_matrix {
        if !matched_a[i] && !matched_b[j] {
            matched_a[i] = true;
            matched_b[j] = true;
            total_iou += iou;
        }
    }

    // Average over total spans (unmatched count as 0)
    let total_spans = spans_a.len().max(spans_b.len());
    total_iou / total_spans as f64
}

// =============================================================================
// Bounding Box (2D)
// =============================================================================

/// A 2D bounding box
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BoundingBox {
    /// X coordinate of top-left corner
    pub x: f64,
    /// Y coordinate of top-left corner
    pub y: f64,
    /// Width
    pub width: f64,
    /// Height
    pub height: f64,
}

impl BoundingBox {
    /// Create a new bounding box
    #[must_use]
    pub fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self {
            x,
            y,
            width: width.abs(),
            height: height.abs(),
        }
    }

    /// Get the area of the bounding box
    #[must_use]
    pub fn area(&self) -> f64 {
        self.width * self.height
    }

    /// Get the right edge x coordinate
    #[must_use]
    pub fn right(&self) -> f64 {
        self.x + self.width
    }

    /// Get the bottom edge y coordinate
    #[must_use]
    pub fn bottom(&self) -> f64 {
        self.y + self.height
    }

    /// Check if this box overlaps with another
    #[must_use]
    pub fn overlaps(&self, other: &BoundingBox) -> bool {
        self.x < other.right()
            && self.right() > other.x
            && self.y < other.bottom()
            && self.bottom() > other.y
    }
}

/// Calculate IoU between two bounding boxes
///
/// # Arguments
/// * `a` - First bounding box
/// * `b` - Second bounding box
///
/// # Returns
/// IoU score in range [0.0, 1.0]
#[must_use]
pub fn iou_box(a: &BoundingBox, b: &BoundingBox) -> f64 {
    // Calculate intersection
    let inter_x = a.x.max(b.x);
    let inter_y = a.y.max(b.y);
    let inter_right = a.right().min(b.right());
    let inter_bottom = a.bottom().min(b.bottom());

    let inter_width = (inter_right - inter_x).max(0.0);
    let inter_height = (inter_bottom - inter_y).max(0.0);
    let intersection_area = inter_width * inter_height;

    // Calculate union
    let union_area = a.area() + b.area() - intersection_area;

    if union_area <= 0.0 {
        return 0.0;
    }

    intersection_area / union_area
}

/// Calculate average IoU for matched bounding box pairs
///
/// Uses greedy matching: pairs boxes by highest IoU until no more matches.
#[must_use]
pub fn average_iou_boxes(boxes_a: &[BoundingBox], boxes_b: &[BoundingBox]) -> f64 {
    if boxes_a.is_empty() || boxes_b.is_empty() {
        return 0.0;
    }

    // Calculate all pairwise IoUs
    let mut iou_matrix: Vec<(usize, usize, f64)> = Vec::new();
    for (i, a) in boxes_a.iter().enumerate() {
        for (j, b) in boxes_b.iter().enumerate() {
            let iou = iou_box(a, b);
            if iou > 0.0 {
                iou_matrix.push((i, j, iou));
            }
        }
    }

    // Sort by IoU descending
    iou_matrix.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());

    // Greedy matching
    let mut matched_a = vec![false; boxes_a.len()];
    let mut matched_b = vec![false; boxes_b.len()];
    let mut total_iou = 0.0;
    for (i, j, iou) in iou_matrix {
        if !matched_a[i] && !matched_b[j] {
            matched_a[i] = true;
            matched_b[j] = true;
            total_iou += iou;
        }
    }

    let total_boxes = boxes_a.len().max(boxes_b.len());
    total_iou / total_boxes as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_span_iou_perfect() {
        let a = Span::new(10, 20);
        let b = Span::new(10, 20);

        assert!((iou_span(&a, &b) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_span_iou_partial() {
        let a = Span::new(0, 10);
        let b = Span::new(5, 15);

        // Intersection: 5-10 = 5
        // Union: 0-15 = 15
        // IoU = 5/15 = 0.333...
        assert!((iou_span(&a, &b) - 0.333).abs() < 0.01);
    }

    #[test]
    fn test_span_iou_no_overlap() {
        let a = Span::new(0, 10);
        let b = Span::new(20, 30);

        assert!((iou_span(&a, &b)).abs() < 0.001);
    }

    #[test]
    fn test_span_contained() {
        let a = Span::new(0, 20);
        let b = Span::new(5, 15);

        // Intersection: 10
        // Union: 20
        // IoU = 10/20 = 0.5
        assert!((iou_span(&a, &b) - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_average_iou_spans() {
        let spans_a = vec![Span::new(0, 10), Span::new(20, 30)];
        let spans_b = vec![Span::new(0, 10), Span::new(20, 30)]; // Perfect match

        let avg = average_iou_spans(&spans_a, &spans_b);
        assert!((avg - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_box_iou_perfect() {
        let a = BoundingBox::new(0.0, 0.0, 10.0, 10.0);
        let b = BoundingBox::new(0.0, 0.0, 10.0, 10.0);

        assert!((iou_box(&a, &b) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_box_iou_partial() {
        let a = BoundingBox::new(0.0, 0.0, 10.0, 10.0);
        let b = BoundingBox::new(5.0, 5.0, 10.0, 10.0);

        // Intersection: 5x5 = 25
        // Union: 100 + 100 - 25 = 175
        // IoU = 25/175 ≈ 0.143
        assert!((iou_box(&a, &b) - 0.143).abs() < 0.01);
    }

    #[test]
    fn test_box_iou_no_overlap() {
        let a = BoundingBox::new(0.0, 0.0, 10.0, 10.0);
        let b = BoundingBox::new(20.0, 20.0, 10.0, 10.0);

        assert!((iou_box(&a, &b)).abs() < 0.001);
    }

    #[test]
    fn test_empty_spans() {
        let avg = average_iou_spans(&[], &[Span::new(0, 10)]);
        assert!((avg).abs() < 0.001);
    }
}
