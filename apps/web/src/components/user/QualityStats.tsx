import type { QualityProfileResponse } from "../../hooks/useUser";

interface QualityStatsProps {
  profile: QualityProfileResponse;
}

export function QualityStats({ profile }: QualityStatsProps) {
  const approvalRate =
    profile.total_annotations > 0
      ? Math.round(
          (profile.approved_annotations / profile.total_annotations) * 100,
        )
      : null;

  const stats = [
    {
      label: "Total Annotations",
      value: profile.total_annotations.toLocaleString(),
      className: "stat-primary",
    },
    {
      label: "Approved",
      value: profile.approved_annotations.toLocaleString(),
      className: "stat-success",
    },
    {
      label: "Rejected",
      value: profile.rejected_annotations.toLocaleString(),
      className: "stat-error",
    },
    {
      label: "Approval Rate",
      value: approvalRate !== null ? `${approvalRate}%` : "N/A",
      className: "stat-info",
    },
  ];

  return (
    <div className="quality-stats">
      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className={`stat-card ${stat.className}`}>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Overall Score Bar */}
      {profile.overall_score !== null && (
        <div className="score-bar-container">
          <div className="score-bar-header">
            <span className="score-label">Quality Score</span>
            <span className="score-value">
              {(profile.overall_score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${profile.overall_score * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Additional scores if available */}
      {(profile.accuracy_score !== null ||
        profile.consistency_score !== null) && (
        <div className="additional-scores">
          {profile.accuracy_score !== null && (
            <div className="score-item">
              <p className="score-item-label">Accuracy</p>
              <p className="score-item-value">
                {(profile.accuracy_score * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {profile.consistency_score !== null && (
            <div className="score-item">
              <p className="score-item-label">Consistency</p>
              <p className="score-item-value">
                {(profile.consistency_score * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
