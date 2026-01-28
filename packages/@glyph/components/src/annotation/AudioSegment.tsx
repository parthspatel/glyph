import React from 'react';

export interface Segment {
  id: string;
  label: string;
  startTime: number;
  endTime: number;
}

export interface AudioSegmentProps {
  /** Audio source URL */
  src: string;
  /** Current segments */
  value: Segment[];
  /** Callback when segments change */
  onChange: (segments: Segment[]) => void;
  /** Available labels for segments */
  labels: string[];
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Audio duration in seconds */
  duration?: number;
}

/**
 * AudioSegment - Audio annotation with time segments
 */
export function AudioSegment({
  src,
  value,
  onChange,
  labels,
  readOnly = false,
  duration = 0,
}: AudioSegmentProps): React.ReactElement {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRemoveSegment = (segmentId: string) => {
    if (readOnly) return;
    onChange(value.filter((s) => s.id !== segmentId));
  };

  return (
    <div className="audio-segment">
      <div className="audio-segment__player">
        <audio src={src} controls className="audio-segment__audio" />
      </div>

      <div className="audio-segment__timeline">
        {value.map((segment) => {
          const left = duration > 0 ? (segment.startTime / duration) * 100 : 0;
          const width = duration > 0 ? ((segment.endTime - segment.startTime) / duration) * 100 : 0;

          return (
            <div
              key={segment.id}
              className="audio-segment__segment"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${segment.label}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`}
            >
              <span className="audio-segment__segment-label">{segment.label}</span>
            </div>
          );
        })}
      </div>

      <div className="audio-segment__list">
        {value.map((segment) => (
          <div key={segment.id} className="audio-segment__item">
            <span className="audio-segment__item-label">{segment.label}</span>
            <span className="audio-segment__item-time">
              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
            </span>
            {!readOnly && (
              <button
                className="audio-segment__remove"
                onClick={() => handleRemoveSegment(segment.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="audio-segment__controls">
          <p>Available labels: {labels.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
