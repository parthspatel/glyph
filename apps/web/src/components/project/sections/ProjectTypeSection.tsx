/**
 * Project type selection section.
 * Allows selecting from existing types or creating new.
 */

import { useFormContext } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useProjectTypes } from '../../../hooks/useProjectTypes';

interface ProjectTypeSectionProps {
  disabled?: boolean;
}

export function ProjectTypeSection({ disabled }: ProjectTypeSectionProps) {
  const { register, watch } = useFormContext();
  const { data: projectTypes, isLoading } = useProjectTypes();

  const selectedTypeId = watch('project_type_id');
  const selectedType = projectTypes?.items.find(t => t.project_type_id === selectedTypeId);

  return (
    <div className="space-y-4">
      {/* Project Type Select */}
      <div className="form-field">
        <label htmlFor="project_type_id" className="form-label">
          Project Type
        </label>
        <select
          id="project_type_id"
          {...register('project_type_id')}
          className="form-select"
          disabled={disabled}
        >
          <option value="">Select a project type...</option>
          {isLoading ? (
            <option disabled>Loading...</option>
          ) : (
            projectTypes?.items.map(type => (
              <option key={type.project_type_id} value={type.project_type_id}>
                {type.name}
                {type.is_system && ' (System)'}
              </option>
            ))
          )}
        </select>
        {disabled && (
          <p className="form-hint text-amber-600">
            Project type cannot be changed after project is activated.
          </p>
        )}
      </div>

      {/* Selected Type Preview */}
      {selectedType && (
        <div className="type-preview">
          <h4 className="type-preview-title">{selectedType.name}</h4>
          {selectedType.description && (
            <p className="type-preview-description">{selectedType.description}</p>
          )}

          <div className="type-preview-details">
            {selectedType.estimated_duration_seconds && (
              <div className="type-preview-item">
                <span className="type-preview-label">Est. Duration:</span>
                <span>{Math.round(selectedType.estimated_duration_seconds / 60)} min</span>
              </div>
            )}
            {selectedType.difficulty_level && (
              <div className="type-preview-item">
                <span className="type-preview-label">Difficulty:</span>
                <span className="capitalize">{selectedType.difficulty_level}</span>
              </div>
            )}
          </div>

          {selectedType.skill_requirements && selectedType.skill_requirements.length > 0 && (
            <div className="type-preview-skills">
              <span className="type-preview-label">Required Skills:</span>
              <ul className="skill-list">
                {selectedType.skill_requirements.map((req, i) => (
                  <li key={i} className="skill-item">
                    {req.skill_id} ({req.min_proficiency})
                    {req.is_required && ' *'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Create New Type Link */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Don't see the right type?</span>
        <Link to="/project-types/new" className="text-blue-600 hover:underline">
          Create a new project type
        </Link>
      </div>
    </div>
  );
}
