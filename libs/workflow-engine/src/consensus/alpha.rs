//! Krippendorff's Alpha for inter-annotator agreement
//!
//! Handles multiple annotators and missing data.
//! Formula: α = 1 - (Do / De)
//! where Do = observed disagreement, De = expected disagreement

use std::collections::HashMap;

use super::ConsensusError;

/// Calculate Krippendorff's Alpha for nominal (categorical) data
///
/// # Arguments
/// * `annotations` - Matrix where `annotations[i][j]` is annotator i's label for item j
///                   Use `None` for missing values
///
/// # Returns
/// Alpha score in range [-1, 1]:
/// - 1.0 = perfect agreement
/// - 0.0 = agreement no better than chance
/// - negative = systematic disagreement
///
/// # Example
/// ```ignore
/// let annotations = vec![
///     vec![Some(1), Some(2), Some(1), None],    // Annotator 1
///     vec![Some(1), Some(2), Some(2), Some(3)], // Annotator 2
///     vec![Some(1), None,    Some(1), Some(3)], // Annotator 3
/// ];
/// let alpha = krippendorffs_alpha_nominal(&annotations)?;
/// ```
pub fn krippendorffs_alpha_nominal(
    annotations: &[Vec<Option<u32>>],
) -> Result<f64, ConsensusError> {
    if annotations.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    let num_items = annotations[0].len();
    if num_items == 0 {
        return Err(ConsensusError::EmptyInput);
    }

    // Validate all annotators have same number of items
    for annotator in annotations {
        if annotator.len() != num_items {
            return Err(ConsensusError::LengthMismatch {
                expected: num_items,
                got: annotator.len(),
            });
        }
    }

    // Build coincidence matrix
    // coincidence[c][k] = number of times categories c and k were paired
    let coincidence = build_coincidence_matrix(annotations);

    if coincidence.is_empty() {
        return Err(ConsensusError::ComputationError(
            "No valid data pairs found".to_string(),
        ));
    }

    // Calculate marginal frequencies
    let marginals = calculate_marginals(&coincidence);
    let total_pairs: f64 = marginals.values().sum();

    if total_pairs < 2.0 {
        return Err(ConsensusError::ComputationError(
            "Not enough data pairs for alpha calculation".to_string(),
        ));
    }

    // Observed disagreement: proportion of off-diagonal coincidences
    let diagonal_sum: f64 = marginals
        .keys()
        .map(|&c| coincidence_value(&coincidence, c, c))
        .sum();
    let do_observed = 1.0 - (diagonal_sum / total_pairs);

    // Expected disagreement: based on marginal frequencies
    // De = 1 - Σ(nc * (nc - 1)) / (n * (n - 1))
    // where nc = marginal frequency for category c, n = total pairs
    let expected_same: f64 = marginals.values().map(|&nc| nc * (nc - 1.0)).sum::<f64>()
        / (total_pairs * (total_pairs - 1.0));
    let de_expected = 1.0 - expected_same;

    // Alpha = 1 - (Do / De)
    if de_expected.abs() < f64::EPSILON {
        // No expected disagreement - all values are the same category
        return Ok(1.0);
    }

    Ok(1.0 - (do_observed / de_expected))
}

/// Build coincidence matrix from annotations
///
/// For each item, count all pairs of values assigned by different annotators.
fn build_coincidence_matrix(annotations: &[Vec<Option<u32>>]) -> HashMap<(u32, u32), f64> {
    let mut coincidence: HashMap<(u32, u32), f64> = HashMap::new();
    let num_items = annotations[0].len();

    for item_idx in 0..num_items {
        // Collect all non-missing values for this item
        let values: Vec<u32> = annotations
            .iter()
            .filter_map(|annotator| annotator[item_idx])
            .collect();

        let num_values = values.len();
        if num_values < 2 {
            continue; // Need at least 2 values to form pairs
        }

        // Weight for each pair: 1 / (m - 1) where m = number of values
        // This normalizes by the number of annotators per item
        let weight = 1.0 / (num_values - 1) as f64;

        // Count all pairs
        for (i, &v1) in values.iter().enumerate() {
            for &v2 in values.iter().skip(i + 1) {
                // Add both (v1, v2) and (v2, v1) for symmetry
                *coincidence.entry((v1, v2)).or_insert(0.0) += weight;
                *coincidence.entry((v2, v1)).or_insert(0.0) += weight;
            }
            // Also count self-pairs for diagonal
            *coincidence.entry((v1, v1)).or_insert(0.0) += weight;
        }
    }

    coincidence
}

/// Calculate marginal frequencies from coincidence matrix
fn calculate_marginals(coincidence: &HashMap<(u32, u32), f64>) -> HashMap<u32, f64> {
    let mut marginals: HashMap<u32, f64> = HashMap::new();

    for (&(c, k), &count) in coincidence {
        if c == k {
            // Diagonal: add count once
            *marginals.entry(c).or_insert(0.0) += count;
        } else {
            // Off-diagonal: count contributes to both categories
            // But we've already doubled them in build_coincidence_matrix
            *marginals.entry(c).or_insert(0.0) += count / 2.0;
        }
    }

    marginals
}

/// Get value from coincidence matrix (returns 0 if not present)
fn coincidence_value(coincidence: &HashMap<(u32, u32), f64>, c: u32, k: u32) -> f64 {
    *coincidence.get(&(c, k)).unwrap_or(&0.0)
}

/// Calculate Krippendorff's Alpha for ordinal data
///
/// Uses ordinal metric where disagreement = (rank difference)²
pub fn krippendorffs_alpha_ordinal(
    annotations: &[Vec<Option<u32>>],
) -> Result<f64, ConsensusError> {
    if annotations.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    // Find all unique categories and create rank ordering
    let mut all_categories: Vec<u32> = annotations.iter().flatten().filter_map(|&v| v).collect();
    all_categories.sort_unstable();
    all_categories.dedup();

    let rank_map: HashMap<u32, usize> = all_categories
        .iter()
        .enumerate()
        .map(|(i, &v)| (v, i))
        .collect();

    // Calculate with ordinal distance metric
    krippendorffs_alpha_with_metric(annotations, |c, k| {
        let rc = *rank_map.get(&c).unwrap_or(&0) as f64;
        let rk = *rank_map.get(&k).unwrap_or(&0) as f64;
        (rc - rk).powi(2)
    })
}

/// Calculate Krippendorff's Alpha for interval/ratio data
///
/// Uses interval metric where disagreement = (value difference)²
pub fn krippendorffs_alpha_interval(
    annotations: &[Vec<Option<f64>>],
) -> Result<f64, ConsensusError> {
    if annotations.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    let num_items = annotations[0].len();
    if num_items == 0 {
        return Err(ConsensusError::EmptyInput);
    }

    // Calculate directly with interval distance
    let mut total_obs_disagreement = 0.0;
    let mut total_exp_disagreement = 0.0;
    let mut all_values: Vec<f64> = Vec::new();
    let mut pair_count = 0.0;

    for item_idx in 0..num_items {
        let values: Vec<f64> = annotations
            .iter()
            .filter_map(|annotator| annotator.get(item_idx).copied().flatten())
            .collect();

        if values.len() < 2 {
            continue;
        }

        let weight = 1.0 / (values.len() - 1) as f64;

        for (i, &v1) in values.iter().enumerate() {
            for &v2 in values.iter().skip(i + 1) {
                total_obs_disagreement += weight * (v1 - v2).powi(2);
                pair_count += weight;
            }
        }

        all_values.extend(values);
    }

    if pair_count < 1.0 || all_values.len() < 2 {
        return Err(ConsensusError::ComputationError(
            "Not enough data pairs".to_string(),
        ));
    }

    // Expected disagreement from all possible pairs
    let n = all_values.len();
    for (i, &v1) in all_values.iter().enumerate() {
        for &v2 in all_values.iter().skip(i + 1) {
            total_exp_disagreement += (v1 - v2).powi(2);
        }
    }
    total_exp_disagreement /= (n * (n - 1) / 2) as f64;

    // Normalize observed disagreement
    let do_normalized = total_obs_disagreement / pair_count;

    if total_exp_disagreement.abs() < f64::EPSILON {
        return Ok(1.0);
    }

    Ok(1.0 - (do_normalized / total_exp_disagreement))
}

/// Generic Krippendorff's Alpha with custom distance metric
fn krippendorffs_alpha_with_metric<F>(
    annotations: &[Vec<Option<u32>>],
    distance: F,
) -> Result<f64, ConsensusError>
where
    F: Fn(u32, u32) -> f64,
{
    if annotations.is_empty() {
        return Err(ConsensusError::EmptyInput);
    }

    let num_items = annotations[0].len();
    let mut total_obs_disagreement = 0.0;
    let mut total_exp_disagreement = 0.0;
    let mut all_values: Vec<u32> = Vec::new();
    let mut pair_count = 0.0;

    for item_idx in 0..num_items {
        let values: Vec<u32> = annotations
            .iter()
            .filter_map(|annotator| annotator.get(item_idx).copied().flatten())
            .collect();

        if values.len() < 2 {
            continue;
        }

        let weight = 1.0 / (values.len() - 1) as f64;

        for (i, &v1) in values.iter().enumerate() {
            for &v2 in values.iter().skip(i + 1) {
                total_obs_disagreement += weight * distance(v1, v2);
                pair_count += weight;
            }
        }

        all_values.extend(values);
    }

    if pair_count < 1.0 || all_values.len() < 2 {
        return Err(ConsensusError::ComputationError(
            "Not enough data pairs".to_string(),
        ));
    }

    // Expected disagreement
    let n = all_values.len();
    for (i, &v1) in all_values.iter().enumerate() {
        for &v2 in all_values.iter().skip(i + 1) {
            total_exp_disagreement += distance(v1, v2);
        }
    }
    total_exp_disagreement /= (n * (n - 1) / 2) as f64;

    let do_normalized = total_obs_disagreement / pair_count;

    if total_exp_disagreement.abs() < f64::EPSILON {
        return Ok(1.0);
    }

    Ok(1.0 - (do_normalized / total_exp_disagreement))
}

/// Interpret an Alpha score
#[must_use]
pub fn interpret_alpha(alpha: f64) -> &'static str {
    match alpha {
        a if a < 0.0 => "Systematic disagreement",
        a if a < 0.667 => "Unreliable data",
        a if a < 0.800 => "Tentatively acceptable",
        _ => "Reliable data",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_agreement() {
        let annotations = vec![
            vec![Some(1), Some(2), Some(3)],
            vec![Some(1), Some(2), Some(3)],
            vec![Some(1), Some(2), Some(3)],
        ];

        let alpha = krippendorffs_alpha_nominal(&annotations).unwrap();
        assert!((alpha - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_partial_agreement() {
        let annotations = vec![
            vec![Some(1), Some(2), Some(1)],
            vec![Some(1), Some(2), Some(2)],
            vec![Some(1), Some(3), Some(1)],
        ];

        let alpha = krippendorffs_alpha_nominal(&annotations).unwrap();
        assert!(alpha > 0.0 && alpha < 1.0);
    }

    #[test]
    fn test_with_missing_data() {
        let annotations = vec![
            vec![Some(1), Some(2), None, Some(1)],
            vec![Some(1), None, Some(3), Some(1)],
            vec![None, Some(2), Some(3), Some(1)],
        ];

        let result = krippendorffs_alpha_nominal(&annotations);
        // Should not fail due to missing data
        assert!(result.is_ok());
    }

    #[test]
    fn test_empty_input() {
        let result = krippendorffs_alpha_nominal(&[]);
        assert!(matches!(result, Err(ConsensusError::EmptyInput)));
    }

    #[test]
    fn test_ordinal_alpha() {
        // Ordinal data: disagreements by 1 level should be less severe
        let annotations = vec![
            vec![Some(0), Some(1), Some(2), Some(3)],
            vec![Some(0), Some(1), Some(2), Some(2)], // Off by 1 on last
        ];

        let alpha = krippendorffs_alpha_ordinal(&annotations).unwrap();
        assert!(alpha > 0.5); // Should be fairly high since off by only 1
    }

    #[test]
    fn test_interval_alpha() {
        let annotations = vec![
            vec![Some(1.0), Some(2.0), Some(3.0)],
            vec![Some(1.1), Some(1.9), Some(3.1)],
        ];

        let alpha = krippendorffs_alpha_interval(&annotations).unwrap();
        assert!(alpha > 0.9); // Very close agreement
    }

    #[test]
    fn test_interpret_alpha() {
        assert_eq!(interpret_alpha(-0.1), "Systematic disagreement");
        assert_eq!(interpret_alpha(0.5), "Unreliable data");
        assert_eq!(interpret_alpha(0.75), "Tentatively acceptable");
        assert_eq!(interpret_alpha(0.9), "Reliable data");
    }
}
