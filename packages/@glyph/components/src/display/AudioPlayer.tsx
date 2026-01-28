import React from 'react';

export interface AudioPlayerProps {
  src: string;
  showWaveform?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({
  src,
  showWaveform = false,
  onTimeUpdate,
}: AudioPlayerProps): React.ReactElement {
  return (
    <div className="audio-player">
      {showWaveform && (
        <div className="audio-player__waveform">
          {/* Waveform visualization placeholder */}
        </div>
      )}
      <audio
        src={src}
        controls
        className="audio-player__audio"
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      />
    </div>
  );
}
