import { CloseIcon, PauseIcon, PlayIcon } from "./Icons";

function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function VoiceRecorder({
  recording,
  recordingLocked,
  recordingPaused,
  recordingMs,
  voiceLevels,
  mode = "voice",
  slidingCancel = false,
  onCancel,
  onTogglePause,
}) {
  if (!recording) return null;

  return (
    <>
      <button type="button" className="icon-btn recording-inline-cancel" onClick={onCancel} aria-label="Cancel">
        <CloseIcon />
      </button>
      {recordingLocked ? (
        <svg className="recording-lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <div className={`recording-pulse${slidingCancel ? " is-cancel" : ""}`} />
      )}
      <span className="recording-time">{formatDuration(recordingMs)}</span>
      {mode === "video_note" ? (
        <span className="recording-video-label">Видеосообщение</span>
      ) : (
        <div className={`voice-live-wave${recordingPaused ? " paused" : ""}`}>
          {voiceLevels.map((level, index) => (
            <i key={index} style={{ height: `${Math.max(5, Math.round(level * 28))}px` }} />
          ))}
        </div>
      )}
      {!recordingLocked && (
        <span className={`recording-hint${slidingCancel ? " is-cancel" : ""}`}>
          {slidingCancel ? "Отпустите, чтобы удалить" : "↑ замок  ·  ← отмена"}
        </span>
      )}
      <button type="button" className="recording-pause" onClick={onTogglePause} title={recordingPaused ? "Resume" : "Pause"}>
        {recordingPaused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </>
  );
}
