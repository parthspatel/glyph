import React from 'react';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  disabled = false,
}: RadioGroupProps): React.ReactElement {
  return (
    <fieldset className="radio-group">
      {label && <legend className="radio-group__label">{label}</legend>}
      {options.map((opt) => (
        <label key={opt.value} className="radio-group__option">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || opt.disabled}
          />
          <span className="radio-group__option-label">{opt.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
