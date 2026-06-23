import { memo } from 'react';

function CallOverlay({
  callState,
  remoteUsername,
  isVideo,
  isMuted,
  isScreenSharing,
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

  return (
    <div className="call-overlay">
      <style>{CALL_CSS}</style>

      <div className="call-backdrop" />

      <div className="call-container">
        {callState === 'ringing' && (
          <div className="call-incoming">
            <div className="call-avatar">
              {remoteUsername ? remoteUsername[0].toUpperCase() : '?'}
            </div>
            <div className="call-name">{remoteUsername || l('Неизвестный', 'Unknown')}</div>
            <div className="call-status">{l('Входящий звонок...', 'Incoming call...')}</div>

            <div className="call-actions">
              <button type="button" className="call-btn call-btn-decline" onClick={onDecline}>
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path d="M1 5l3-3 20 20-3 3L1 5z" />
                </svg>
                <span>{l('Отклонить', 'Decline')}</span>
              </button>

              <button type="button" className="call-btn call-btn-accept" onClick={onAnswer}>
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22l-4-9-9-4z" />
                </svg>
                <span>{l('Ответить', 'Answer')}</span>
              </button>
            </div>
          </div>
        )}

        {callState === 'connecting' && (
          <div className="call-active">
            <div className="call-connecting-spinner" />
            <div className="call-name">{remoteUsername || l('Соединение...', 'Connecting...')}</div>
            <div className="call-status">{l('Устанавливаем защищённое соединение...', 'Establishing secure connection...')}</div>
          </div>
        )}

        {(callState === 'connected' || callState === 'connecting') && (
          <div className="call-videos">
            {isVideo && (
              <video
                ref={remoteVideoRef}
                className="call-video-remote"
                autoPlay
                playsInline
              />
            )}
            <div className={`call-video-local-wrapper${isVideo ? ' pip' : ''}`}>
              <video
                ref={localVideoRef}
                className="call-video-local"
                autoPlay
                playsInline
                muted
              />
            </div>
          </div>
        )}

        {callState === 'connected' && (
          <>
            <div className="call-name">{remoteUsername || l('В звонке', 'In call')}</div>
            <div className="call-status">{l('Защищено E2EE', 'E2EE Protected')}</div>

            <div className="call-actions">
              <button
                type="button"
                className={`call-btn call-btn-control${isMuted ? ' active' : ''}`}
                onClick={onToggleMute}
              >
                <svg viewBox="0 0 24 24" width="28" height="28">
                  {isMuted ? (
                    <><path d="M12 2a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><path d="M12 19v3" /><path d="M8 22h8" /></>
                  ) : (
                    <><path d="M12 1a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /></>
                  )}
                </svg>
                <span>{isMuted ? l('Вкл. микрофон', 'Unmute') : l('Выкл. микрофон', 'Mute')}</span>
              </button>

              {isVideo && (
                <button
                  type="button"
                  className={`call-btn call-btn-control${isScreenSharing ? ' active' : ''}`}
                  onClick={onToggleScreenShare}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <path d="M8 22h8" />
                    <path d="M12 18v4" />
                  </svg>
                  <span>{isScreenSharing ? l('Экран', 'Stop share') : l('Экран', 'Share screen')}</span>
                </button>
              )}

              <button
                type="button"
                className={`call-btn call-btn-control${!isVideo ? '' : ' active'}`}
                onClick={onToggleVideo}
              >
                <svg viewBox="0 0 24 24" width="28" height="28">
                  {!isVideo ? (
                    <><path d="M23 7l-6 5v-4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4l6 5V7z" /><path d="M1 5l3-3 20 20-3 3z" /></>
                  ) : (
                    <><path d="M23 7l-6 5v-4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4l6 5V7z" /></>
                  )}
                </svg>
                <span>{isVideo ? l('Выкл. видео', 'Turn off') : l('Вкл. видео', 'Turn on')}</span>
              </button>

              <button type="button" className="call-btn call-btn-end" onClick={onEnd}>
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <path d="M1 5l3-3 20 20-3 3z" />
                </svg>
                <span>{l('Завершить', 'End')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CALL_CSS = `
.call-overlay{
  position:fixed;
  inset:0;
  z-index:400;
  display:flex;
  align-items:center;
  justify-content:center;
}
.call-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.5);
  backdrop-filter:blur(4px);
}
.call-container{
  position:relative;
  width:min(94%,480px);
  background:var(--bg0);
  border-radius:32px;
  padding:32px 24px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:16px;
  box-shadow:0 24px 80px rgba(0,0,0,.3);
  animation:sheetIn .18s ease;
}
.call-incoming{text-align:center}
.call-avatar{
  width:80px;height:80px;
  border-radius:50%;
  background:linear-gradient(135deg,#4fa3e0,#2d6fa8);
  color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:36px;font-weight:900;
  margin:0 auto 12px;
}
.call-name{font-size:22px;font-weight:900;letter-spacing:-.035em;text-align:center}
.call-status{font-size:14px;color:var(--t2);text-align:center}
.call-connecting-spinner{width:48px;height:48px;border:4px solid var(--bg3);border-top-color:var(--acc);border-radius:50%;animation:spin .8s linear infinite}
.call-videos{width:100%;position:relative}
.call-video-remote{width:100%;border-radius:20px;background:#000;display:block;max-height:360px;object-fit:cover}
.call-video-local-wrapper.pip{position:absolute;bottom:12px;right:12px;width:120px;height:90px;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.3)}
.call-video-local{width:100%;height:100%;object-fit:cover;background:#222;border-radius:inherit;transform:scaleX(-1)}
.call-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.call-btn{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  border:none;border-radius:24px;padding:12px 20px;
  cursor:pointer;font-size:12px;font-weight:850;color:var(--t1);background:var(--bg2);
  min-width:80px;transition:all .15s;
}
.call-btn svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.call-btn:hover{background:var(--bg3);transform:translateY(-2px)}
.call-btn-decline,.call-btn-end{background:rgba(229,72,77,.15);color:var(--red)}
.call-btn-decline:hover,.call-btn-end:hover{background:rgba(229,72,77,.25)}
.call-btn-accept{background:rgba(34,197,94,.15);color:var(--green)}
.call-btn-accept:hover{background:rgba(34,197,94,.25)}
.call-btn-control.active{background:rgba(var(--acc-rgb),.12);color:var(--acc)}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes sheetIn{from{transform:translateY(8px) scale(.99);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
`;

export default memo(CallOverlay);
