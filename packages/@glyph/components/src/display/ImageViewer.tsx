import React, { useState } from 'react';

export interface ImageViewerProps {
  src: string;
  alt?: string;
  zoomable?: boolean;
  maxWidth?: string;
}

export function ImageViewer({
  src,
  alt = 'Image',
  zoomable = true,
  maxWidth = '100%',
}: ImageViewerProps): React.ReactElement {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="image-viewer">
      {zoomable && (
        <div className="image-viewer__controls">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
          <button onClick={() => setZoom(1)}>Reset</button>
        </div>
      )}
      <div className="image-viewer__container" style={{ maxWidth, overflow: 'auto' }}>
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
