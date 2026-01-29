/**
 * Skill requirements section for project form.
 * Defines skills needed for annotators to work on this project.
 */

import { useFormContext } from 'react-hook-form';
import { useState } from 'react';

interface SkillRequirement {
  skill_id: string;
  skill_name?: string;
  min_proficiency: string;
  is_required: boolean;
  weight: number;
}

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

// Placeholder skills - would come from API
const AVAILABLE_SKILLS = [
  { id: 'ner', name: 'Named Entity Recognition' },
  { id: 'sentiment', name: 'Sentiment Analysis' },
  { id: 'classification', name: 'Text Classification' },
  { id: 'summarization', name: 'Summarization' },
  { id: 'medical', name: 'Medical Terminology' },
  { id: 'legal', name: 'Legal Document Analysis' },
  { id: 'translation', name: 'Translation' },
];

export function SkillRequirementsSection() {
  const { watch, setValue } = useFormContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkill, setNewSkill] = useState<Partial<SkillRequirement>>({
    skill_id: '',
    min_proficiency: 'intermediate',
    is_required: true,
    weight: 1.0,
  });

  const skillRequirements: SkillRequirement[] = watch('skill_requirements') || [];

  const addSkillRequirement = () => {
    if (!newSkill.skill_id) return;

    const skill = AVAILABLE_SKILLS.find(s => s.id === newSkill.skill_id);
    const requirement: SkillRequirement = {
      skill_id: newSkill.skill_id,
      skill_name: skill?.name,
      min_proficiency: newSkill.min_proficiency || 'intermediate',
      is_required: newSkill.is_required ?? true,
      weight: newSkill.weight ?? 1.0,
    };

    setValue('skill_requirements', [...skillRequirements, requirement], { shouldDirty: true });
    setNewSkill({
      skill_id: '',
      min_proficiency: 'intermediate',
      is_required: true,
      weight: 1.0,
    });
    setShowAddForm(false);
  };

  const removeSkillRequirement = (skillId: string) => {
    setValue(
      'skill_requirements',
      skillRequirements.filter(s => s.skill_id !== skillId),
      { shouldDirty: true }
    );
  };

  const updateSkillRequirement = (skillId: string, updates: Partial<SkillRequirement>) => {
    setValue(
      'skill_requirements',
      skillRequirements.map(s => s.skill_id === skillId ? { ...s, ...updates } : s),
      { shouldDirty: true }
    );
  };

  // Get skills not already added
  const availableToAdd = AVAILABLE_SKILLS.filter(
    s => !skillRequirements.some(r => r.skill_id === s.id)
  );

  return (
    <div className="space-y-4">
      {/* Existing Requirements */}
      {skillRequirements.length > 0 ? (
        <div className="skill-requirements-list">
          {skillRequirements.map((req) => (
            <div key={req.skill_id} className="skill-requirement-card">
              <div className="skill-requirement-header">
                <div className="skill-info">
                  <h4 className="skill-name">{req.skill_name || req.skill_id}</h4>
                  {req.is_required && (
                    <span className="skill-required-badge">Required</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-red-600"
                  onClick={() => removeSkillRequirement(req.skill_id)}
                >
                  Remove
                </button>
              </div>

              <div className="skill-requirement-details">
                <div className="form-field">
                  <label className="form-label text-sm">Minimum Proficiency</label>
                  <select
                    value={req.min_proficiency}
                    onChange={(e) => updateSkillRequirement(req.skill_id, { min_proficiency: e.target.value })}
                    className="form-select form-select-sm"
                  >
                    {PROFICIENCY_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label text-sm">Weight</label>
                  <input
                    type="number"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={req.weight}
                    onChange={(e) => updateSkillRequirement(req.skill_id, { weight: parseFloat(e.target.value) })}
                    className="form-input form-input-sm"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={req.is_required}
                      onChange={(e) => updateSkillRequirement(req.skill_id, { is_required: e.target.checked })}
                      className="checkbox"
                    />
                    Required for assignment
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No skill requirements defined.</p>
          <p className="text-sm text-gray-500">
            Add skill requirements to ensure only qualified annotators are assigned.
          </p>
        </div>
      )}

      {/* Add Skill Form */}
      {showAddForm ? (
        <div className="add-skill-form">
          <h4 className="form-section-title">Add Skill Requirement</h4>

          <div className="form-field">
            <label className="form-label">Skill</label>
            <select
              value={newSkill.skill_id}
              onChange={(e) => setNewSkill({ ...newSkill, skill_id: e.target.value })}
              className="form-select"
            >
              <option value="">Select a skill...</option>
              {availableToAdd.map(skill => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-field flex-1">
              <label className="form-label">Minimum Proficiency</label>
              <select
                value={newSkill.min_proficiency}
                onChange={(e) => setNewSkill({ ...newSkill, min_proficiency: e.target.value })}
                className="form-select"
              >
                {PROFICIENCY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field flex-1">
              <label className="form-label">Weight</label>
              <input
                type="number"
                min="0.1"
                max="2"
                step="0.1"
                value={newSkill.weight}
                onChange={(e) => setNewSkill({ ...newSkill, weight: parseFloat(e.target.value) })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSkill.is_required}
                onChange={(e) => setNewSkill({ ...newSkill, is_required: e.target.checked })}
                className="checkbox"
              />
              Required for assignment
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={addSkillRequirement}
              disabled={!newSkill.skill_id}
            >
              Add Requirement
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-outline w-full"
          onClick={() => setShowAddForm(true)}
          disabled={availableToAdd.length === 0}
        >
          + Add Skill Requirement
        </button>
      )}
    </div>
  );
}
