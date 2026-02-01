import type { QualityProfileResponse } from "../../hooks/useUser";
import { cn } from "@/lib/utils";

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
      className: "border-l-4 border-l-primary",
    },
    {
      label: "Approved",
      value: profile.approved_annotations.toLocaleString(),
      className: "border-l-4 border-l-success",
    },
    {
      label: "Rejected",
      value: profile.rejected_annotations.toLocaleString(),
      className: "border-l-4 border-l-destructive",
    },
    {
      label: "Approval Rate",
      value: approvalRate !== null ? `${approvalRate}%` : "N/A",
      className: "border-l-4 border-l-info",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn("bg-card rounded-lg border p-4", stat.className)}
          >
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Overall Score Bar */}
      {profile.overall_score !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Quality Score</span>
            <span className="font-medium text-foreground">
              {(profile.overall_score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${profile.overall_score * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Additional scores if available */}
      {(profile.accuracy_score !== null ||
        profile.consistency_score !== null) && (
        <div className="grid grid-cols-2 gap-4">
          {profile.accuracy_score !== null && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-lg font-semibold text-foreground">
                {(profile.accuracy_score * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {profile.consistency_score !== null && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Consistency</p>
              <p className="text-lg font-semibold text-foreground">
                {(profile.consistency_score * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
