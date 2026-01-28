import React from 'react';

export interface ClassificationOption {
  id: string;
  label: string;
  description?: string;
}

export interface ClassificationProps {
  /** Available classification options */
  options: ClassificationOption[];
  /** Currently selected value(s) */
  value: string | string[];
  /** Callback when selection changes */
  onChange: (value: string | string[]) => void;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Label for the classification */
  label?: string;
}

/**
 * Classification - Single or multi-label classification component
 */
export function Classification({
  options,
  value,
  onChange,
  multiple = false,
  readOnly = false,
  label,
}: ClassificationProps): React.ReactElement {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (optionId: string) => {
    if (readOnly) return;

    if (multiple) {
      const newValue = selectedValues.includes(optionId)
        ? selectedValues.filter((v) => v !== optionId)
        : [...selectedValues, optionId];
      onChange(newValue);
    } else {
      onChange(optionId);
    }
  };

  return (
    <div className="classification">
      {label && <label className="classification__label">{label}</label>}
      <div className="classification__options">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.id);
          return (
            <button
              key={option.id}
              className={`classification__option ${isSelected ? 'classification__option--selected' : ''}`}
              onClick={() => handleSelect(option.id)}
              disabled={readOnly}
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
            >
              <span className="classification__option-label">{option.label}</span>
              {option.description && (
                <span className="classification__option-description">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
