import React from 'react';

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
}

export function TextArea({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  disabled = false,
  maxLength,
}: TextAreaProps): React.ReactElement {
  return (
    <div className="textarea">
      {label && <label className="textarea__label">{label}</label>}
      <textarea
        className="textarea__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
      />
      {maxLength && (
        <span className="textarea__count">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
