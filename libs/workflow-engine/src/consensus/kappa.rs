//! Cohen's Kappa for inter-annotator agreement
//!
//! Measures agreement between exactly 2 annotators, accounting for chance.
//! Formula: κ = (Po - Pe) / (1 - Pe)
//! where Po = observed agreement, Pe = expected agreement by chance

use std::collections::HashMap;

use super::ConsensusError;

/// Calculate Cohen's Kappa for two annotators
///
/// # Arguments
/// * `a` - Labels from annotator A
/// * `b` - Labels from annotator B
///
/// # Returns
/// Kappa score in range [-1, 1]:
/// - 1.0 = perfect agreement
/// - 0.0 = agreement no better than chance
/// - negative = agreement worse than chance
///
/// # Example
/// ```ignore
/// let a = vec![1, 2, 1, 3, 2];
/// let b = vec![1, 2, 2, 3, 2];
/// let kappa = cohens_kappa(&a, &b)?;
/// ```
pub fn cohens_kappa(a: &[u32], b: &[u32]) -> Result<f64, ConsensusError> {
    if a.is_empty() || b.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    if a.len() != b.len() {
        return Err(ConsensusError::LengthMismatch {
            expected: a.len(),
            got: b.len(),
        });
    }

    let n = a.len() as f64;

    // Count category frequencies for each annotator
    let mut freq_a: HashMap<u32, usize> = HashMap::new();
    let mut freq_b: HashMap<u32, usize> = HashMap::new();
    let mut observed_agreement = 0usize;

    for (&val_a, &val_b) in a.iter().zip(b.iter()) {
        *freq_a.entry(val_a).or_insert(0) += 1;
        *freq_b.entry(val_b).or_insert(0) += 1;

        if val_a == val_b {
            observed_agreement += 1;
        }
    }

    // Observed agreement proportion
    let po = observed_agreement as f64 / n;

    // Expected agreement by chance
    // Pe = Σ (P(A=k) × P(B=k)) for all categories k
    let all_categories: std::collections::HashSet<u32> =
        freq_a.keys().chain(freq_b.keys()).copied().collect();

    let pe: f64 = all_categories
        .iter()
        .map(|&cat| {
            let p_a = *freq_a.get(&cat).unwrap_or(&0) as f64 / n;
            let p_b = *freq_b.get(&cat).unwrap_or(&0) as f64 / n;
            p_a * p_b
        })
        .sum();

    // Kappa = (Po - Pe) / (1 - Pe)
    // Handle edge case where Pe = 1 (all items in same category)
    if (1.0 - pe).abs() < f64::EPSILON {
        return Ok(1.0); // Perfect agreement trivially
    }

    Ok((po - pe) / (1.0 - pe))
}

/// Calculate weighted Cohen's Kappa for ordinal data
///
/// Uses linear weights where disagreement cost = |i - j| / (k - 1)
/// where i, j are category indices and k is number of categories.
///
/// # Arguments
/// * `a` - Labels from annotator A (ordinal: 0, 1, 2, ...)
/// * `b` - Labels from annotator B
/// * `num_categories` - Total number of ordinal categories
pub fn cohens_kappa_weighted(
    a: &[u32],
    b: &[u32],
    num_categories: u32,
) -> Result<f64, ConsensusError> {
    if a.is_empty() || b.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    if a.len() != b.len() {
        return Err(ConsensusError::LengthMismatch {
            expected: a.len(),
            got: b.len(),
        });
    }

    if num_categories < 2 {
        return Err(ConsensusError::ComputationError(
            "Need at least 2 categories for weighted kappa".to_string(),
        ));
    }

    let n = a.len() as f64;
    let k = num_categories as f64;

    // Count frequencies
    let mut freq_a: HashMap<u32, usize> = HashMap::new();
    let mut freq_b: HashMap<u32, usize> = HashMap::new();

    for (&val_a, &val_b) in a.iter().zip(b.iter()) {
        *freq_a.entry(val_a).or_insert(0) += 1;
        *freq_b.entry(val_b).or_insert(0) += 1;
    }

    // Calculate weighted observed disagreement
    let weight = |i: u32, j: u32| -> f64 {
        let diff = (i as f64 - j as f64).abs();
        diff / (k - 1.0) // Linear weights
    };

    let observed_disagreement: f64 = a
        .iter()
        .zip(b.iter())
        .map(|(&va, &vb)| weight(va, vb))
        .sum::<f64>()
        / n;

    // Calculate expected disagreement
    let expected_disagreement: f64 = (0..num_categories)
        .flat_map(|i| (0..num_categories).map(move |j| (i, j)))
        .map(|(i, j)| {
            let p_a = *freq_a.get(&i).unwrap_or(&0) as f64 / n;
            let p_b = *freq_b.get(&j).unwrap_or(&0) as f64 / n;
            p_a * p_b * weight(i, j)
        })
        .sum();

    // Weighted Kappa = 1 - (Do / De)
    if expected_disagreement.abs() < f64::EPSILON {
        return Ok(1.0); // No expected disagreement
    }

    Ok(1.0 - (observed_disagreement / expected_disagreement))
}

/// Interpret a Kappa score
#[must_use]
pub fn interpret_kappa(kappa: f64) -> &'static str {
    match kappa {
        k if k < 0.0 => "Poor (less than chance)",
        k if k < 0.20 => "Slight agreement",
        k if k < 0.40 => "Fair agreement",
        k if k < 0.60 => "Moderate agreement",
        k if k < 0.80 => "Substantial agreement",
        _ => "Almost perfect agreement",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_agreement() {
        let a = vec![1, 2, 3, 1, 2, 3];
        let b = vec![1, 2, 3, 1, 2, 3];

        let kappa = cohens_kappa(&a, &b).unwrap();
        assert!((kappa - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_no_agreement() {
        // Systematically different - worse than chance
        let a = vec![1, 1, 1, 2, 2, 2];
        let b = vec![2, 2, 2, 1, 1, 1];

        let kappa = cohens_kappa(&a, &b).unwrap();
        assert!(kappa < 0.0);
    }

    #[test]
    fn test_partial_agreement() {
        let a = vec![1, 2, 1, 3, 2, 1];
        let b = vec![1, 2, 2, 3, 2, 3];

        let kappa = cohens_kappa(&a, &b).unwrap();
        // Should be positive but less than 1
        assert!(kappa > 0.0 && kappa < 1.0);
    }

    #[test]
    fn test_length_mismatch() {
        let a = vec![1, 2, 3];
        let b = vec![1, 2];

        let result = cohens_kappa(&a, &b);
        assert!(matches!(result, Err(ConsensusError::LengthMismatch { .. })));
    }

    #[test]
    fn test_empty_input() {
        let result = cohens_kappa(&[], &[]);
        assert!(matches!(result, Err(ConsensusError::EmptyInput)));
    }

    #[test]
    fn test_weighted_kappa() {
        // Ordinal data: 0, 1, 2, 3 (4 categories)
        let a = vec![0, 1, 2, 3, 2, 1];
        let b = vec![0, 1, 2, 3, 3, 2]; // Off by 1 in last two

        let kappa = cohens_kappa_weighted(&a, &b, 4).unwrap();
        // Should be high since disagreements are only 1 level apart
        assert!(kappa > 0.5);
    }

    #[test]
    fn test_interpret_kappa() {
        assert_eq!(interpret_kappa(-0.1), "Poor (less than chance)");
        assert_eq!(interpret_kappa(0.1), "Slight agreement");
        assert_eq!(interpret_kappa(0.3), "Fair agreement");
        assert_eq!(interpret_kappa(0.5), "Moderate agreement");
        assert_eq!(interpret_kappa(0.7), "Substantial agreement");
        assert_eq!(interpret_kappa(0.9), "Almost perfect agreement");
    }
}
