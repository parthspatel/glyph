import React from 'react';

export interface Box {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundingBoxProps {
  /** Image source URL */
  src: string;
  /** Current bounding boxes */
  value: Box[];
  /** Callback when boxes change */
  onChange: (boxes: Box[]) => void;
  /** Available labels for boxes */
  labels: string[];
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Maximum number of boxes allowed */
  maxBoxes?: number;
}

/**
 * BoundingBox - Image annotation with rectangular regions
 */
export function BoundingBox({
  src,
  value,
  onChange,
  labels,
  readOnly = false,
  maxBoxes,
}: BoundingBoxProps): React.ReactElement {
  const handleRemoveBox = (boxId: string) => {
    if (readOnly) return;
    onChange(value.filter((b) => b.id !== boxId));
  };

  const canAddMore = maxBoxes === undefined || value.length < maxBoxes;

  return (
    <div className="bounding-box">
      <div className="bounding-box__canvas">
        <img src={src} alt="Annotation target" className="bounding-box__image" />
        {value.map((box) => (
          <div
            key={box.id}
            className="bounding-box__box"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          >
            <span className="bounding-box__label">{box.label}</span>
            {!readOnly && (
              <button
                className="bounding-box__remove"
                onClick={() => handleRemoveBox(box.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="bounding-box__controls">
          <p>
            {canAddMore
              ? `Click and drag on the image to create a box. Available labels: ${labels.join(', ')}`
              : `Maximum ${maxBoxes} boxes reached.`}
          </p>
        </div>
      )}

      <div className="bounding-box__list">
        {value.map((box, index) => (
          <div key={box.id} className="bounding-box__item">
            Box {index + 1}: {box.label} ({Math.round(box.width)}×{Math.round(box.height)})
          </div>
        ))}
      </div>
    </div>
  );
}
