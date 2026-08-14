import { useEffect, useRef, useState } from "react";

function formatRemain(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  return `${total}"`;
}

export default function VideoNote({ src, durationMs = 0, onOpen }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [knownDurationMs, setKnownDurationMs] = useState(durationMs || 0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    const onEnded = () => {
      setPlaying(false);
      setCurrentMs(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentMs(Math.round((el.currentTime || 0) * 1000));
    const onMeta = () => {
      const seconds = Number(el.duration);
      if (Number.isFinite(seconds) && seconds > 0) {
        setKnownDurationMs(Math.round(seconds * 1000));
      }
    };
    el.addEventListener("ended", onEnded);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = (event) => {
    event.stopPropagation();
    const el = videoRef.current;
    if (!el) {
      onOpen?.();
      return;
    }
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => onOpen?.());
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const totalMs = knownDurationMs || durationMs || 0;
  const remainMs = totalMs > 0 ? Math.max(0, totalMs - currentMs) : 0;
  const remainRatio = totalMs > 0 ? remainMs / totalMs : 1;

  return (
    <button
      type="button"
      className={`video-note${playing ? " is-playing" : " is-paused"}`}
      onClick={toggle}
      aria-label={playing ? "Пауза" : "Смотреть"}
    >
      <video ref={videoRef} src={src} playsInline muted={false} loop={false} />
      <svg className="video-note-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle className="video-note-ring-track" cx="18" cy="18" r="16" pathLength="100" />
        <circle
          className="video-note-ring-progress"
          cx="18"
          cy="18"
          r="16"
          pathLength="100"
          strokeDasharray={`${Math.max(0, remainRatio * 100)} 100`}
        />
      </svg>
      <span className={`video-note-play${playing ? " is-playing" : ""}`} aria-hidden="true">
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="6" width="3.4" height="12" rx="1" /><rect x="13.6" y="6" width="3.4" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 6.8v10.4L18 12 9 6.8z" /></svg>
        )}
      </span>
      <span className="video-note-time">{formatRemain(playing || currentMs > 0 ? remainMs : totalMs)}</span>
    </button>
  );
}
