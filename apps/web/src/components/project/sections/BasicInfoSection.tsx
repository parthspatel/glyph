/**
 * Basic information section for project form.
 * Contains name, description, tags, and documentation.
 */

import { useFormContext } from 'react-hook-form';
import { useState } from 'react';

export function BasicInfoSection() {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const [tagInput, setTagInput] = useState('');
  const tags = watch('tags') || [];

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue('tags', [...tags, trimmed], { shouldDirty: true });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter((t: string) => t !== tag), { shouldDirty: true });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="form-field">
        <label htmlFor="name" className="form-label">
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className={`form-input ${errors.name ? 'form-input-error' : ''}`}
          placeholder="Enter project name"
        />
        {errors.name && (
          <p className="form-error">{errors.name.message as string}</p>
        )}
      </div>

      {/* Description */}
      <div className="form-field">
        <label htmlFor="description" className="form-label">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          className="form-textarea"
          placeholder="Brief description of the project"
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="form-field">
        <label className="form-label">Tags</label>
        <div className="tags-input-container">
          <div className="tags-list">
            {tags.map((tag: string) => (
              <span key={tag} className="tag">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            className="tags-input"
            placeholder="Add tag and press Enter"
          />
        </div>
      </div>

      {/* Documentation */}
      <div className="form-field">
        <label htmlFor="documentation" className="form-label">
          Documentation
        </label>
        <textarea
          id="documentation"
          {...register('documentation')}
          className="form-textarea"
          placeholder="Detailed documentation, guidelines, or instructions for annotators"
          rows={6}
        />
        <p className="form-hint">
          Supports Markdown formatting
        </p>
      </div>

      {/* Deadline */}
      <div className="form-row">
        <div className="form-field flex-1">
          <label htmlFor="deadline" className="form-label">
            Deadline
          </label>
          <input
            id="deadline"
            type="date"
            {...register('deadline')}
            className="form-input"
          />
        </div>
        <div className="form-field flex-1">
          <label htmlFor="deadline_action" className="form-label">
            Deadline Action
          </label>
          <select
            id="deadline_action"
            {...register('deadline_action')}
            className="form-select"
          >
            <option value="">None</option>
            <option value="notify">Notify</option>
            <option value="pause">Pause Project</option>
            <option value="escalate">Escalate</option>
          </select>
        </div>
      </div>
    </div>
  );
}
