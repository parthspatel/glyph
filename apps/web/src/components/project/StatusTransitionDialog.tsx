/**
 * Dialog for confirming project status transitions.
 * Shows different content based on transition type.
 */

import { useState } from 'react';
import type { Project, ProjectStatus } from '../../api/projects';
import { useUpdateProjectStatus, useActivateProject } from '../../hooks/useProjects';

interface StatusTransitionDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStatus: ProjectStatus;
}

interface ActivationChecklistProps {
  project: Project;
}

function ActivationChecklist({ project }: ActivationChecklistProps) {
  // These would be computed from actual project data
  const requirements = [
    {
      label: 'Output schema defined',
      met: Boolean(project.project_type_id), // Simplified check
    },
    {
      label: 'At least one data source',
      met: false, // Would check data_sources.length
    },
  ];

  const allMet = requirements.every((r) => r.met);

  return (
    <div className="activation-checklist">
      <ul className="checklist-items">
        {requirements.map((req, i) => (
          <li key={i} className={`checklist-item ${req.met ? 'met' : 'unmet'}`}>
            <span className="checklist-icon">{req.met ? '✓' : '✗'}</span>
            <span className="checklist-label">{req.label}</span>
          </li>
        ))}
      </ul>
      {!allMet && (
        <p className="checklist-warning">
          Cannot activate until all requirements are met.
        </p>
      )}
    </div>
  );
}

export function StatusTransitionDialog({
  project,
  open,
  onOpenChange,
  targetStatus,
}: StatusTransitionDialogProps) {
  const updateStatus = useUpdateProjectStatus();
  const activateProject = useActivateProject();
  const [error, setError] = useState<string | null>(null);

  const isDestructive = ['archived', 'completed'].includes(targetStatus);
  const isActivation = targetStatus === 'active' && project.status === 'draft';

  const handleConfirm = async () => {
    setError(null);
    try {
      if (isActivation) {
        await activateProject.mutateAsync(project.project_id);
      } else {
        await updateStatus.mutateAsync({ id: project.project_id, status: targetStatus });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  if (!open) return null;

  const isLoading = updateStatus.isPending || activateProject.isPending;

  const getTitle = () => {
    if (isActivation) return 'Activate Project';
    switch (targetStatus) {
      case 'paused': return 'Pause Project';
      case 'completed': return 'Complete Project';
      case 'archived': return 'Archive Project';
      case 'active': return 'Resume Project';
      default: return `Change Status to ${targetStatus}`;
    }
  };

  const getDescription = () => {
    if (isActivation) {
      return 'Before activating, please confirm all requirements are met:';
    }
    switch (targetStatus) {
      case 'paused':
        return 'Pausing will stop task assignments. Active tasks can still be completed.';
      case 'completed':
        return 'Marking as completed will lock the project. Admins can still make corrections.';
      case 'archived':
        return 'Archiving will hide this project from active views. You can restore it later.';
      case 'active':
        return 'Resuming will allow new task assignments.';
      default:
        return `Are you sure you want to change the status to ${targetStatus}?`;
    }
  };

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">{getTitle()}</h2>
        </div>

        <div className="dialog-body">
          <p className="dialog-description">{getDescription()}</p>

          {isActivation && <ActivationChecklist project={project} />}

          {error && (
            <div className="dialog-error">
              {error}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isActivation ? 'Activate' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
