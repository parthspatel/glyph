import { useState } from "react";
import type { UserSkillResponse } from "../../hooks/useUser";

interface SkillBadgesProps {
  skills: UserSkillResponse[];
}

const statusColors: Record<string, string> = {
  active: "skill-badge-active",
  soft_expired: "skill-badge-expiring",
  hard_expired: "skill-badge-expired",
  never_expires: "skill-badge-permanent",
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
    return <p className="text-muted">No skills certified yet.</p>;
  }

  return (
    <>
      <div className="skill-badges">
        {skills.map((skill) => (
          <button
            key={skill.certification_id}
            onClick={() => setSelectedSkill(skill)}
            className={`skill-badge ${statusColors[skill.status] || statusColors.active}`}
            title={`${skill.skill_name} - ${statusLabels[skill.status] || skill.status}`}
          >
            <span>{skill.skill_name}</span>
            {skill.proficiency_level && (
              <span className="skill-proficiency">
                ({skill.proficiency_level})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedSkill.skill_name}</h3>

            <dl className="skill-details">
              <div className="detail-row">
                <dt>Status</dt>
                <dd
                  className={`status-badge ${statusColors[selectedSkill.status]}`}
                >
                  {statusLabels[selectedSkill.status] || selectedSkill.status}
                </dd>
              </div>

              {selectedSkill.proficiency_level && (
                <div className="detail-row">
                  <dt>Proficiency</dt>
                  <dd>{selectedSkill.proficiency_level}</dd>
                </div>
              )}

              <div className="detail-row">
                <dt>Certified</dt>
                <dd>
                  {new Date(selectedSkill.certified_at).toLocaleDateString()}
                </dd>
              </div>

              {selectedSkill.expires_at && (
                <div className="detail-row">
                  <dt>Expires</dt>
                  <dd>
                    {new Date(selectedSkill.expires_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>

            <button
              onClick={() => setSelectedSkill(null)}
              className="btn btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
