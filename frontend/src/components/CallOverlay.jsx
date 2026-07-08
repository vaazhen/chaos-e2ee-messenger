import { memo } from 'react';

function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function CallOverlay({
  callState,
  remoteUsername,
  isVideo,
  isMuted,
  isScreenSharing,
  callDuration,
  localVideoRef,
  remoteVideoRef,
  onAnswer,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  lang,
}) {
  const effectiveLang = String(lang || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru';
  const l = (ru, en) => (effectiveLang === 'ru' ? ru : en);

  if (callState === 'idle') return null;

  const initial = remoteUsername ? remoteUsername[0].toUpperCase() : '?';

  return (
    <div className="call-overlay-new">
      <style>{CALL_CSS}</style>
      <div className="call-backdrop-new" />

      <div className={`call-container-new ${callState === 'ringing' ? 'is-ringing' : ''} ${callState === 'connected' ? 'is-connected' : ''}`}>

        {/* Incoming call */}
        {callState === 'ringing' && (
          <div className="call-incoming-new">
            <div className="call-avatar-ring">
              <div className="call-avatar-new">{initial}</div>
            </div>
            <div className="call-name-new">{remoteUsername || l('Неизвестный', 'Unknown')}</div>
            <div className="call-status-new">{l('Входящий звонок...', 'Incoming call...')}</div>

            <div className="call-actions-new">
              <button type="button" className="call-btn-new call-btn-decline-new" onClick={onDecline}>
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path d="M19 10a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>{l('Отклонить', 'Decline')}</span>
              </button>

              <button type="button" className="call-btn-new call-btn-accept-new" onClick={onAnswer}>
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M22 2L15 22l-4-9-9-4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{l('Ответить', 'Answer')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Connecting */}
        {callState === 'connecting' && (
          <div className="call-active-new">
            <div className="call-avatar-new call-avatar-large">{initial}</div>
            <div className="call-name-new">{remoteUsername || l('Соединение...', 'Connecting...')}</div>
            <div className="call-status-new">{l('Устанавливаем защищённое соединение...', 'Establishing secure connection...')}</div>

            <div className="call-audio-waves">
              <span /><span /><span /><span />
            </div>

            <div className="call-actions-new">
              <button type="button" className="call-btn-new call-btn-end-new" onClick={onEnd}>
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path d="M19 10a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>{l('Отмена', 'Cancel')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Connected */}
        {callState === 'connected' && (
          <div className="call-active-new">
            {isVideo ? (
              <div className="call-videos-new">
                <video
                  ref={remoteVideoRef}
                  className="call-video-remote-new"
                  autoPlay
                  playsInline
                />
                <div className="call-video-local-wrapper-new pip">
                  <video
                    ref={localVideoRef}
                    className="call-video-local-new"
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
                <div className="call-timer over-video">
                  <span className="call-timer-dot" />
                  {fmtDur(callDuration)}
                  <span className="call-timer-e2ee">{l('E2EE', 'E2EE')}</span>
                </div>
              </div>
            ) : (
              <>
                {/* audio-only: invisible video element for audio playback */}
                <video
                  ref={remoteVideoRef}
                  className="call-video-remote-audio"
                  autoPlay
                  playsInline
                />
                <div className="call-audio-avatar-wrap">
                  <div className="call-avatar-new call-avatar-large">{initial}</div>
                  <div className="call-audio-waves">
                    <span /><span /><span /><span />
                  </div>
                </div>
                <div className="call-name-new">{remoteUsername}</div>
                <div className="call-timer">
                  <span className="call-timer-dot" />
                  {fmtDur(callDuration)}
                  <span className="call-timer-e2ee">{l('E2EE', 'E2EE')}</span>
                </div>
                <div className="call-video-local-wrapper-new audio-mini">
                  <video
                    ref={localVideoRef}
                    className="call-video-local-new"
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              </>
            )}

            {/* Controls */}
            <div className="call-actions-new">
              <button
                type="button"
                className={`call-btn-new call-btn-ctrl-new${isMuted ? ' active' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? l('Вкл. микрофон', 'Unmute') : l('Выкл. микрофон', 'Mute')}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  {isMuted ? (
                    <><path d="M12 2a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M12 19v3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /><path d="M8 22h8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>
                  ) : (
                    <><path d="M12 1a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M12 18v4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" /></>
                  )}
                </svg>
                <span>{isMuted ? l('Muted', 'Muted') : l('Mic', 'Mic')}</span>
              </button>

              <button
                type="button"
                className={`call-btn-new call-btn-ctrl-new${isVideo ? ' active' : ''}`}
                onClick={onToggleVideo}
                title={isVideo ? l('Выкл. видео', 'Turn off') : l('Вкл. видео', 'Turn on')}
              >
                <svg viewBox="0 0 24 24" width="24" height="24">
                  {isVideo ? (
                    <><path d="M23 7l-6 5v-4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4l6 5V7z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" /></>
                  ) : (
                    <><path d="M23 7l-6 5v-4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4l6 5V7z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>
                  )}
                </svg>
                <span>{isVideo ? l('Video', 'Video') : l('Cam', 'Cam')}</span>
              </button>

              {isVideo && (
                <button
                  type="button"
                  className={`call-btn-new call-btn-ctrl-new${isScreenSharing ? ' active' : ''}`}
                  onClick={onToggleScreenShare}
                  title={isScreenSharing ? l('Экран', 'Stop share') : l('Экран', 'Share screen')}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    <path d="M8 22h8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M12 18v4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                  </svg>
                  <span>{isScreenSharing ? l('Share', 'Share') : l('Share', 'Share')}</span>
                </button>
              )}

              <button
                type="button"
                className="call-btn-new call-btn-end-new"
                onClick={onEnd}
                title={l('Завершить', 'End')}
              >
                <svg viewBox="0 0 24 24" width="26" height="26">
                  <path d="M19 10a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>{l('End', 'End')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CALL_CSS = `
.call-overlay-new {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
}
.call-backdrop-new {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.call-container-new {
  position: relative;
  width: min(92%, 420px);
  background: var(--bg0);
  border-radius: 36px;
  padding: 36px 28px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 32px 80px rgba(0,0,0,.35);
  animation: callIn .35s cubic-bezier(.16,1,.3,1);
  overflow: hidden;
  border: 1px solid var(--bdr);
}
.call-container-new.is-ringing::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 38px;
  background: conic-gradient(var(--green) 0deg, transparent 60deg, transparent 300deg, var(--green) 360deg);
  opacity: .15;
  animation: callSpin 2s linear infinite;
  pointer-events: none;
}
.call-container-new.is-connected::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 38px;
  background: conic-gradient(var(--acc) 0deg, transparent 60deg, transparent 300deg, var(--acc) 360deg);
  opacity: .06;
  animation: callSpin 3s linear infinite;
  pointer-events: none;
}
.call-incoming-new, .call-active-new {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  position: relative;
  z-index: 1;
}

/* Avatar */
.call-avatar-ring {
  padding: 4px;
  border-radius: 50%;
  background: conic-gradient(var(--green), #22c55e77, var(--green));
  animation: ringPulse 1.6s ease-in-out infinite;
}
.call-avatar-new {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4fa3e0, #2d6fa8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  font-weight: 900;
  flex-shrink: 0;
  user-select: none;
}
.call-avatar-large {
  width: 96px;
  height: 96px;
  font-size: 40px;
}

/* Name */
.call-name-new {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -.02em;
  text-align: center;
  color: var(--t1);
}

/* Status */
.call-status-new {
  font-size: 14px;
  color: var(--t2);
  text-align: center;
  font-weight: 500;
}

/* Timer */
.call-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--t2);
  letter-spacing: .02em;
  font-variant-numeric: tabular-nums;
}
.call-timer.over-video {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: 999px;
  color: #fff;
  z-index: 2;
}
.call-timer-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--green);
  animation: pulse 2s ease-in-out infinite;
}
.call-timer-e2ee {
  font-size: 10px;
  font-weight: 700;
  background: var(--green);
  color: #fff;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: .03em;
}

/* Video area */
.call-videos-new {
  width: 100%;
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.call-video-remote-new {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* invisible video element for audio-only — keeps playing remote audio */
.call-video-remote-audio {
  position: fixed;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  top: -9999px;
  left: -9999px;
}
.call-video-local-wrapper-new {
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 100px;
  height: 130px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,.35);
  border: 2px solid rgba(255,255,255,.15);
}
.call-video-local-wrapper-new.pip {
  width: 100px;
  height: 130px;
}
.call-video-local-wrapper-new.audio-mini {
  position: static;
  width: 72px;
  height: 96px;
  border-radius: 14px;
  margin-top: 4px;
}
.call-video-local-new {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #222;
  transform: scaleX(-1);
}
/* Audio-only avatar area */
.call-audio-avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.call-audio-waves {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 24px;
}
.call-audio-waves span {
  width: 4px;
  height: 100%;
  background: var(--acc);
  border-radius: 999px;
  opacity: .3;
  animation: waveBounce 1.2s ease-in-out infinite;
}
.call-audio-waves span:nth-child(2) { animation-delay: .15s; }
.call-audio-waves span:nth-child(3) { animation-delay: .3s; }
.call-audio-waves span:nth-child(4) { animation-delay: .45s; }

/* Actions */
.call-actions-new {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 6px;
}
.call-btn-new {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  border: none;
  border-radius: 20px;
  padding: 11px 18px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 750;
  color: var(--t1);
  background: var(--bg2);
  min-width: 72px;
  transition: all .15s ease;
  letter-spacing: .01em;
}
.call-btn-new svg {
  display: block;
}
.call-btn-new:hover {
  background: var(--bg3);
  transform: translateY(-2px);
}
.call-btn-new:active {
  transform: translateY(0);
  transition-duration: .05s;
}
.call-btn-decline-new,
.call-btn-end-new {
  background: var(--red);
  color: #fff;
}
.call-btn-decline-new:hover,
.call-btn-end-new:hover {
  background: #d13b40;
}
.call-btn-accept-new {
  background: var(--green);
  color: #fff;
}
.call-btn-accept-new:hover {
  background: #16a34a;
}
.call-btn-ctrl-new {
  background: var(--bg2);
  color: var(--t1);
  border: 1px solid var(--bdr);
}
.call-btn-ctrl-new:hover {
  background: var(--bg3);
  border-color: var(--bdr2);
}
.call-btn-ctrl-new.active {
  background: var(--green);
  color: #fff;
  border-color: var(--green);
}
.call-btn-ctrl-new.active svg {
  stroke: #fff;
}

/* Animations */
@keyframes callIn {
  from { transform: translateY(24px) scale(.94); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes callSpin {
  to { transform: rotate(360deg); }
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.06); opacity: .85; }
}
@keyframes waveBounce {
  0%, 100% { transform: scaleY(.5); opacity: .2; }
  50% { transform: scaleY(1); opacity: .7; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}
`;

export default memo(CallOverlay);
