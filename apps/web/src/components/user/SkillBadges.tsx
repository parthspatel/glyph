import { useState } from "react";
import type { UserSkillResponse } from "../../hooks/useUser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SkillBadgesProps {
  skills: UserSkillResponse[];
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  soft_expired: "bg-warning/10 text-warning border-warning/20",
  hard_expired: "bg-destructive/10 text-destructive border-destructive/20",
  never_expires: "bg-info/10 text-info border-info/20",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  soft_expired: "Expiring Soon",
  hard_expired: "Expired",
  never_expires: "Permanent",
};

export function SkillBadges({ skills }: SkillBadgesProps) {
  const [selectedSkill, setSelectedSkill] = useState<UserSkillResponse | null>(
    null,
  );

  if (!skills.length) {
    return <p className="text-muted-foreground">No skills certified yet.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <button
            key={skill.certification_id}
            onClick={() => setSelectedSkill(skill)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer transition-colors hover:opacity-80",
              statusColors[skill.status] || statusColors.active,
            )}
            title={`${skill.skill_name} - ${statusLabels[skill.status] || skill.status}`}
          >
            <span>{skill.skill_name}</span>
            {skill.proficiency_level && (
              <span className="opacity-70">({skill.proficiency_level})</span>
            )}
          </button>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedSkill(null)}
        >
          <div
            className="bg-card rounded-lg border shadow-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-foreground">
              {selectedSkill.skill_name}
            </h3>

            <dl className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Status</dt>
                <dd
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    statusColors[selectedSkill.status] || statusColors.active,
                  )}
                >
                  {statusLabels[selectedSkill.status] || selectedSkill.status}
                </dd>
              </div>

              {selectedSkill.proficiency_level && (
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Proficiency</dt>
                  <dd className="text-foreground">
                    {selectedSkill.proficiency_level}
                  </dd>
                </div>
              )}

              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Certified</dt>
                <dd className="text-foreground">
                  {new Date(selectedSkill.certified_at).toLocaleDateString()}
                </dd>
              </div>

              {selectedSkill.expires_at && (
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="text-foreground">
                    {new Date(selectedSkill.expires_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={() => setSelectedSkill(null)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
