import { useEffect, useId, useMemo, useRef, useState } from "react";

const WAVE_BARS = 32;
const PLAY_EVENT = "cm:voice:play";
const SPEEDS = [1, 1.5, 2];

function hashString(value) {
  const str = String(value || "");
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildWaveform(seed) {
  const heights = new Array(WAVE_BARS);
  let state = seed || 1;
  for (let i = 0; i < WAVE_BARS; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const noise = (state >>> 8) / 0x00FFFFFF;
    const center = 1 - Math.abs((i - WAVE_BARS / 2) / (WAVE_BARS / 2));
    const value = 0.32 + noise * 0.55 + center * 0.18;
    heights[i] = Math.max(0.18, Math.min(1, value));
  }
  return heights;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.round((ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export default function VoiceMessage({ src, durationMs = 0, variant = "in", onCancel }) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const ownIdRef = useRef(null);
  const reactId = useId();
  if (!ownIdRef.current) ownIdRef.current = reactId;

  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [knownDurationMs, setKnownDurationMs] = useState(durationMs || 0);
  const [rateIndex, setRateIndex] = useState(0);

  const heights = useMemo(() => buildWaveform(hashString(src) || 1), [src]);

  const effectiveDurationMs = knownDurationMs || durationMs || 0;
  const progress = effectiveDurationMs > 0
    ? Math.max(0, Math.min(1, currentMs / effectiveDurationMs))
    : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentMs(0);
    };
    const onTime = () => setCurrentMs(Math.round((audio.currentTime || 0) * 1000));
    const onMeta = () => {
      const seconds = Number(audio.duration);
      if (Number.isFinite(seconds) && seconds > 0) {
        setKnownDurationMs(Math.round(seconds * 1000));
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onOtherPlay = (event) => {
      if (event?.detail === ownIdRef.current) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        audio.pause();
      }
    };

    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, []);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      try { audio.pause(); } catch (_) {}
    }
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.playbackRate = SPEEDS[rateIndex];
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {});
      }
      try {
        window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: ownIdRef.current }));
      } catch (_) {}
    } else {
      audio.pause();
    }
  };

  const cycleRate = () => {
    const next = (rateIndex + 1) % SPEEDS.length;
    setRateIndex(next);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = SPEEDS[next];
  };

  const seekFromEvent = (event) => {
    const wave = waveRef.current;
    const audio = audioRef.current;
    if (!wave || !audio || !effectiveDurationMs) return;
    const rect = wave.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = (event.clientX ?? rect.left) - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    audio.currentTime = (ratio * effectiveDurationMs) / 1000;
    setCurrentMs(Math.round(ratio * effectiveDurationMs));
  };

  const activeBars = Math.round(progress * WAVE_BARS);
  const showElapsed = playing || currentMs > 0;
  const displayMs = showElapsed ? currentMs : effectiveDurationMs;
  const isPreview = variant === "preview";

  return (
    <div className={`voice-msg voice-msg-${variant}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="voice-msg-btn"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="voice-msg-body">
        <div
          ref={waveRef}
          className="voice-msg-wave"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={effectiveDurationMs}
          aria-valuenow={currentMs}
          onClick={seekFromEvent}
        >
          {heights.map((h, i) => (
            <i
              key={i}
              className={i < activeBars ? "active" : ""}
              style={{ height: `${Math.max(4, Math.round(h * 26))}px` }}
            />
          ))}
        </div>

        <div className="voice-msg-meta">
          <span className="voice-msg-time">{formatTime(displayMs)}</span>
          {!isPreview && (
            <button
              type="button"
              className="voice-msg-rate"
              onClick={cycleRate}
              title="Playback speed"
            >
              {SPEEDS[rateIndex] === 1 ? "1×" : `${SPEEDS[rateIndex]}×`}
            </button>
          )}
        </div>
      </div>

      {isPreview && onCancel && (
        <button
          type="button"
          className="voice-msg-cancel"
          onClick={onCancel}
          aria-label="Cancel voice message"
        >
          ×
        </button>
      )}

      <audio ref={audioRef} src={src} preload="metadata" style={{ display: "none" }} />
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6.5v11l8-5.5-8-5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7v10" />
      <path d="M15 7v10" />
    </svg>
  );
}
