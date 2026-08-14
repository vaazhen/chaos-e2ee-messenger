import { useEffect, useRef, useState } from "react";
import Ava from "./Ava";
import {
  LockIcon,
  MicIcon,
  MicOffIcon,
  PhoneIcon,
  PhoneOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "./Icons";

function formatElapsed(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function mediaErrorText(mediaError, l) {
  if (mediaError === "camera") return l("Нет доступа к камере", "Camera permission denied");
  if (mediaError === "mic") return l("Нет доступа к микрофону", "Microphone permission denied");
  if (mediaError === "offline") return l("Нет соединения", "Not connected");
  if (mediaError) return l("Не удалось начать звонок", "Could not start the call");
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function defaultPipPosition() {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  return {
    x: Math.max(16, window.innerWidth - 148),
    y: Math.max(16, window.innerHeight - 292),
  };
}

export default function CallOverlay({
  phase,
  title,
  avatarUrl,
  colorIdx,
  micOn,
  cameraOn,
  remoteVideoOn,
  mediaError,
  mediaProtection = "dtls",
  localVideoRef,
  remoteVideoRef,
  onAccept,
  onDecline,
  onHangup,
  onToggleMic,
  onToggleCamera,
  l,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [pip, setPip] = useState(defaultPipPosition);
  const dragRef = useRef(null);
  const incoming = phase === "incoming";
  const outgoing = phase === "outgoing";
  const connecting = phase === "connecting";
  const active = phase === "active";
  const inCall = outgoing || connecting || active;

  useEffect(() => {
    if (incoming) setAccepting(false);
  }, [incoming]);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const width = drag.width;
      const height = drag.height;
      const x = clamp(event.clientX - drag.offsetX, 12, window.innerWidth - width - 12);
      const y = clamp(event.clientY - drag.offsetY, 12, window.innerHeight - height - 96);
      setPip({ x, y });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  if (phase === "idle") return null;

  const failed = phase === "error";
  const subtitle = incoming
    ? l("Входящий звонок", "Incoming call")
    : outgoing
      ? l("Звоним…", "Calling…")
      : connecting
        ? l("Соединяем…", "Connecting…")
        : failed
          ? l("Звонок не удался", "Call failed")
          : formatElapsed(elapsed);

  const errorText = mediaErrorText(mediaError, l);
  const protectionLabel = mediaProtection === "e2ee"
    ? l("Медиа: E2EE", "Media: E2EE")
    : l("Медиа: DTLS-SRTP", "Media: DTLS-SRTP");

  return (
    <div className="call-stage" role="dialog" aria-modal="true" aria-label={l("Звонок", "Call")}>
      <video
        ref={remoteVideoRef}
        className={`call-video call-video-remote${remoteVideoOn ? " is-on" : ""}`}
        autoPlay
        playsInline
      />
      {!remoteVideoOn && (
        <div className="call-stage-fallback">
          <Ava name={title} avatarUrl={avatarUrl} colorIdx={colorIdx} size="lg" />
        </div>
      )}

      <div className="call-stage-top">
        <div className="call-stage-identity">
          <b>{title}</b>
          <small>{subtitle}</small>
          {inCall && (
            <span className={`call-e2ee${mediaProtection === "e2ee" ? " is-e2ee" : ""}`}>
              <LockIcon />
              {protectionLabel}
            </span>
          )}
        </div>
      </div>

      {errorText && <div className="call-stage-error">{errorText}</div>}

      <div
        className={`call-pip${cameraOn && inCall ? " is-on" : ""}`}
        style={{ left: pip.x, top: pip.y }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const box = event.currentTarget.getBoundingClientRect();
          dragRef.current = {
            offsetX: event.clientX - box.left,
            offsetY: event.clientY - box.top,
            width: box.width,
            height: box.height,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
      >
        <video
          ref={localVideoRef}
          className="call-video call-video-local"
          autoPlay
          playsInline
          muted
        />
      </div>

      <div className="call-dock">
        {incoming ? (
          <>
            <button
              type="button"
              className="call-ctrl accept"
              onClick={() => {
                if (accepting) return;
                setAccepting(true);
                onAccept?.();
              }}
              disabled={accepting}
              aria-label={l("Ответить", "Answer")}
              title={l("Ответить", "Answer")}
            >
              <PhoneIcon />
            </button>
            <button
              type="button"
              className="call-ctrl hangup"
              onClick={onDecline}
              aria-label={l("Отклонить", "Decline")}
              title={l("Отклонить", "Decline")}
            >
              <PhoneOffIcon />
            </button>
          </>
        ) : failed ? (
          <button
            type="button"
            className="call-ctrl hangup"
            onClick={onHangup}
            aria-label={l("Закрыть", "Close")}
            title={l("Закрыть", "Close")}
          >
            <PhoneOffIcon />
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`call-ctrl${micOn ? "" : " is-off"}`}
              onClick={onToggleMic}
              aria-label={micOn ? l("Выключить микрофон", "Mute microphone") : l("Включить микрофон", "Unmute microphone")}
              title={micOn ? l("Микрофон", "Microphone") : l("Микрофон выключен", "Microphone off")}
            >
              {micOn ? <MicIcon /> : <MicOffIcon />}
            </button>
            <button
              type="button"
              className={`call-ctrl${cameraOn ? "" : " is-off"}`}
              onClick={onToggleCamera}
              aria-label={cameraOn ? l("Выключить камеру", "Turn camera off") : l("Включить камеру", "Turn camera on")}
              title={cameraOn ? l("Камера", "Camera") : l("Камера выключена", "Camera off")}
            >
              {cameraOn ? <VideoIcon /> : <VideoOffIcon />}
            </button>
            <button
              type="button"
              className="call-ctrl hangup"
              onClick={onHangup}
              aria-label={l("Завершить", "Hang up")}
              title={l("Завершить", "Hang up")}
            >
              <PhoneOffIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
