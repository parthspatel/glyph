/**
 * Project form checklist sidebar.
 * Shows completion status and activation requirements.
 */

interface SectionStatus {
  basic: boolean;
  projectType: boolean;
  schema: boolean;
  dataSources: boolean;
  skills: boolean;
}

interface ProjectChecklistProps {
  sectionStatus: SectionStatus;
  onSectionClick: (section: string) => void;
  projectId?: string;
}

const SECTION_LABELS: Record<keyof SectionStatus, string> = {
  basic: 'Basic Information',
  projectType: 'Project Type',
  schema: 'Schema',
  dataSources: 'Data Sources',
  skills: 'Skill Requirements',
};

export function ProjectChecklist({
  sectionStatus,
  onSectionClick,
  projectId
}: ProjectChecklistProps) {
  const completedCount = Object.values(sectionStatus).filter(Boolean).length;
  const totalCount = Object.keys(sectionStatus).length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  // Activation requirements (required to start accepting tasks)
  const activationRequirements = [
    { key: 'schema', label: 'Output schema defined', met: sectionStatus.schema },
    { key: 'dataSources', label: 'At least one data source', met: sectionStatus.dataSources },
  ];

  const canActivate = activationRequirements.every(r => r.met) && projectId;

  return (
    <aside className="project-checklist">
      <div className="checklist-sticky">
        {/* Progress Summary */}
        <div className="checklist-section">
          <h3 className="checklist-title">Completion</h3>
          <div className="checklist-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="progress-label">{completedCount}/{totalCount}</span>
          </div>
        </div>

        {/* Section Checklist */}
        <div className="checklist-section">
          <h3 className="checklist-title">Sections</h3>
          <ul className="checklist-items">
            {(Object.entries(sectionStatus) as [keyof SectionStatus, boolean][]).map(([key, complete]) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSectionClick(key)}
                  className={`checklist-item ${complete ? 'complete' : ''}`}
                >
                  <span className={`checklist-icon ${complete ? 'complete' : ''}`}>
                    {complete ? '✓' : '○'}
                  </span>
                  <span className="checklist-label">
                    {SECTION_LABELS[key]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Activation Requirements */}
        <div className="checklist-section">
          <h3 className="checklist-title">Activation Requirements</h3>
          <ul className="checklist-items">
            {activationRequirements.map((req) => (
              <li key={req.key}>
                <div className={`checklist-item static ${req.met ? 'complete' : 'incomplete'}`}>
                  <span className={`checklist-icon ${req.met ? 'complete' : 'incomplete'}`}>
                    {req.met ? '✓' : '✗'}
                  </span>
                  <span className="checklist-label">{req.label}</span>
                  {!req.met && (
                    <button
                      type="button"
                      onClick={() => onSectionClick(req.key)}
                      className="checklist-link"
                    >
                      Go
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {canActivate ? (
            <p className="activation-ready">
              ✓ Ready to activate!
            </p>
          ) : !projectId ? (
            <p className="activation-note">
              Save the project first, then add a data source to activate.
            </p>
          ) : (
            <p className="activation-note">
              Complete required items to activate project.
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="checklist-help">
          <p>
            <strong>Tip:</strong> Use <kbd>Cmd+S</kbd> to save changes.
          </p>
        </div>
      </div>
    </aside>
  );
}
