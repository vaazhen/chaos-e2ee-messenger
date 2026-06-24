import { useMemo, useRef, useState, useEffect } from "react";
import VoiceMessage from "./VoiceMessage";

const EMOJI_STORAGE_KEY = "cm_recent_emojis";
const MAX_RECENT_EMOJIS = 16;
const MAX_VOICE_MS = 30_000;
const MAX_VOICE_BYTES = 110 * 1024;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const TTL_OPTIONS = [
  { label: "Off", value: null },
  { label: "5s", value: 5 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "1h", value: 3600 },
  { label: "24h", value: 86400 },
];

const EMOJI_CATEGORIES = [
  {
    key: "recent",
    icon: "🕘",
    label: "Recent",
    emojis: [],
  },
  {
    key: "smileys",
    icon: "😊",
    label: "Smileys",
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","😉","😍","🥰","😘","😋","😎","🤩","🥳","😌","🤔","😴","😭","😡"],
  },
  {
    key: "gestures",
    icon: "👍",
    label: "Gestures",
    emojis: ["👍","👎","👏","🙌","🤝","👋","🤙","✌️","🤞","💪","🦾","☝️","👆","👇","👈","👉","👌","🙏"],
  },
  {
    key: "hearts",
    icon: "❤️",
    label: "Hearts",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝"],
  },
  {
    key: "party",
    icon: "🎉",
    label: "Celebration",
    emojis: ["🎉","🎊","🎈","🎁","🏆","🥇","🎯","⭐","💫","✨","💥","🔥","🌟","🚀"],
  },
];

function loadRecentEmojis() {
  try {
    const raw = localStorage.getItem(EMOJI_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(list) {
  try {
    localStorage.setItem(EMOJI_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT_EMOJIS)));
  } catch {
    // ignore storage errors
  }
}

export default function MessageInput({
  onSend,
  replyTo,
  onОтменаОтветить,
  disabled,
  onTyping,
  pendingFirstMessageOnly = false,
  muteInlineNotice = null,
  messagePlaceholder = "Сообщение...",
  replyPreviewTitle = "Ответить",
}) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiClosing, setEmojiClosing] = useState(false);
  const [emojiCat, setEmojiCat] = useState("recent");
  const [recentEmojis, setRecentEmojis] = useState(() => loadRecentEmojis());
  const [imgFile, setImgFile] = useState(null);
  const [generalFile, setGeneralFile] = useState(null);
  const [ttl, setTtl] = useState(null);
  const [showTtl, setShowTtl] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [voiceFile, setVoiceFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [voiceLevels, setVoiceLevels] = useState(() => Array(48).fill(0.18));
  const [voiceError, setVoiceError] = useState("");
  const inpRef = useRef(null);
  const fileRef = useRef(null);
  const generalFileRef = useRef(null);
  const ttlRef = useRef(null);
  const attachMenuRef = useRef(null);
  const inputBarRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  const recordingStartYRef = useRef(0);
  const autoSendVoiceRef = useRef(false);
  const discardVoiceRef = useRef(false);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const analyserFrameRef = useRef(null);
  const recordingPausedRef = useRef(false);
  const pauseStartedAtRef = useRef(0);
  const pausedTotalMsRef = useRef(0);
  
  const emojiRootRef = useRef(null);
const typingTimerRef = useRef(null);

  const emojiCategories = useMemo(() => {
    const recentCategory = {
      ...EMOJI_CATEGORIES[0],
      emojis: recentEmojis,
    };
    return [recentCategory, ...EMOJI_CATEGORIES.slice(1)];
  }, [recentEmojis]);

  const currentCategory = emojiCategories.find((category) => category.key === emojiCat) || emojiCategories[1] || emojiCategories[0];
  const currentEmojis = currentCategory?.emojis?.length ? currentCategory.emojis : (emojiCat === "recent" ? EMOJI_CATEGORIES[1].emojis : []);


  const closeEmoji = () => {
    if (!showEmoji || emojiClosing) return;

    setEmojiClosing(true);

    window.setTimeout(() => {
      setShowEmoji(false);
      setEmojiClosing(false);
    }, 150);
  };

  const toggleEmoji = (e) => {
    e.stopPropagation();

    if (showEmoji) {
      closeEmoji();
      return;
    }

    setEmojiClosing(false);
    setShowEmoji(true);
  };

  const groupMuteLocksInput = Boolean(muteInlineNotice) && !recording;

  useEffect(() => {
    if (!muteInlineNotice) return;
    setShowEmoji(false);
    setEmojiClosing(false);
  }, [muteInlineNotice]);

  useEffect(() => {
    if (!showEmoji) return;

    const onDown = (e) => {
      const root = inputBarRef.current;

      if (root && !root.contains(e.target)) {
        closeEmoji();
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        closeEmoji();
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showEmoji, emojiClosing]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (onTyping) {
      if (typingTimerRef.current) return;
      onTyping();
      typingTimerRef.current = setTimeout(() => { typingTimerRef.current = null; }, 2000);
    }
  };

  const handleSend = (overrideVoiceFile = null) => {
    const nextVoiceFile = overrideVoiceFile || voiceFile;
    if (!text.trim() && !imgFile && !nextVoiceFile && !generalFile) return;
    onSend({ text: text.trim(), imgFile, voiceFile: nextVoiceFile, generalFile, ttl, replyTo });
    setText("");
    setImgFile(null);
    setGeneralFile(null);
    setVoiceFile(null);
    setRecordingLocked(false);
    setVoiceError("");
    setShowEmoji(false);
    setEmojiClosing(false);
    inpRef.current?.focus();
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const focusInput = () => {
    if (!disabled) inpRef.current?.focus();
  };

  const onFileChange = e => {
    const file = e.target.files[0]; if (!file) return;
    cancelVoice();
    const reader = new FileReader();
    reader.onload = ev => setImgFile({ src: ev.target.result, file });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onGeneralFileChange = e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setVoiceError("File is too large (max 20MB)");
      e.target.value = "";
      return;
    }
    cancelVoice();
    setImgFile(null);
    setGeneralFile(file);
    e.target.value = "";
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cleanupRecordingStream = () => {
    mediaStreamRef.current?.getTracks?.().forEach(track => track.stop());
    mediaStreamRef.current = null;
  };

  const stopVoiceAnalyser = () => {
    if (analyserFrameRef.current) {
      cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }
    audioContextRef.current?.close?.().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
  };

  const effectiveRecordingMs = () => {
    const pausedNow = pauseStartedAtRef.current ? Date.now() - pauseStartedAtRef.current : 0;
    return Math.max(0, Date.now() - recordingStartedAtRef.current - pausedTotalMsRef.current - pausedNow);
  };

  const startVoiceAnalyser = (stream) => {
    stopVoiceAnalyser();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const current = analyserRef.current;
        if (!current) return;

        if (!recordingPausedRef.current) {
          current.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) {
            const centered = (data[i] - 128) / 128;
            sum += centered * centered;
          }
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(1, Math.max(0.08, rms * 5));
          setVoiceLevels(prev => [...prev.slice(1), level]);
        }

        analyserFrameRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (_) {
      stopVoiceAnalyser();
    }
  };

  const stopRecording = (autoSend = false) => {
    autoSendVoiceRef.current = autoSend;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = async () => {
    if (disabled || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Voice recording is not supported in this browser");
      return;
    }

    try {
      setVoiceError("");
      setImgFile(null);
      cancelVoice();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickVoiceMimeType();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

      voiceChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      pauseStartedAtRef.current = 0;
      pausedTotalMsRef.current = 0;
      autoSendVoiceRef.current = false;
      setRecording(true);
      setRecordingLocked(false);
      recordingPausedRef.current = false;
      setRecordingPaused(false);
      setRecordingMs(0);
      setVoiceLevels(Array(48).fill(0.18));
      startVoiceAnalyser(stream);

      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        cleanupRecordingStream();
        stopVoiceAnalyser();
        const shouldAutoSend = autoSendVoiceRef.current;
        const shouldDiscard = discardVoiceRef.current;
        autoSendVoiceRef.current = false;
        discardVoiceRef.current = false;
        setRecording(false);
        setRecordingLocked(false);
        recordingPausedRef.current = false;
        setRecordingPaused(false);

        const durationMs = Math.min(MAX_VOICE_MS, effectiveRecordingMs());
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        voiceChunksRef.current = [];

        if (shouldDiscard) {
          return;
        }

        if (durationMs < 500 || !blob.size) {
          setVoiceError("Voice message is too short");
          return;
        }
        if (blob.size > MAX_VOICE_BYTES) {
          setVoiceError("Voice message is too large. Keep it shorter.");
          return;
        }

        const voice = {
          blob,
          mime: blob.type || "audio/webm",
          size: blob.size,
          durationMs,
          previewUrl: URL.createObjectURL(blob),
          name: "voice-message.webm",
        };

        if (shouldAutoSend) {
          handleSend(voice);
          window.setTimeout(() => URL.revokeObjectURL(voice.previewUrl), 1000);
          return;
        }

        setVoiceFile(prev => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
          return voice;
        });
      };

      recorder.start();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = effectiveRecordingMs();
        setRecordingMs(Math.min(MAX_VOICE_MS, elapsed));
        if (elapsed >= MAX_VOICE_MS) stopRecording(true);
      }, 200);
    } catch (e) {
      cleanupRecordingStream();
      stopVoiceAnalyser();
      setRecording(false);
      recordingPausedRef.current = false;
      setRecordingPaused(false);
      setVoiceError(e?.message || "Could not access microphone");
    }
  };

  const cancelVoice = () => {
    if (voiceFile?.previewUrl) URL.revokeObjectURL(voiceFile.previewUrl);
    setVoiceFile(null);
    setVoiceError("");
  };
  useEffect(() => {
    if (!pendingFirstMessageOnly) return;
    if (recording) cancelRecording();
    if (imgFile) setImgFile(null);
    if (voiceFile?.previewUrl) URL.revokeObjectURL(voiceFile.previewUrl);
    if (voiceFile) setVoiceFile(null);
  }, [pendingFirstMessageOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelRecording = () => {
    autoSendVoiceRef.current = false;
    discardVoiceRef.current = true;
    voiceChunksRef.current = [];
    setRecordingLocked(false);
    stopRecordingTimer();
    cleanupRecordingStream();
    stopVoiceAnalyser();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      setRecording(false);
      recordingPausedRef.current = false;
      setRecordingPaused(false);
    }
  };

  const toggleRecordingPause = (e) => {
    e?.stopPropagation?.();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (recordingPausedRef.current) {
      if (typeof recorder.resume === "function" && recorder.state === "paused") {
        recorder.resume();
      }
      if (pauseStartedAtRef.current) {
        pausedTotalMsRef.current += Date.now() - pauseStartedAtRef.current;
      }
      pauseStartedAtRef.current = 0;
      recordingPausedRef.current = false;
      setRecordingPaused(false);
      return;
    }

    if (typeof recorder.pause === "function" && recorder.state === "recording") {
      recorder.pause();
    }
    pauseStartedAtRef.current = Date.now();
    recordingPausedRef.current = true;
    setRecordingPaused(true);
  };

  const canQuickRecord = !pendingFirstMessageOnly && !text.trim() && !imgFile && !voiceFile && !generalFile;

  const onPrimaryPointerDown = (e) => {
    if (pendingFirstMessageOnly || disabled || !canQuickRecord || recording) return;
    e.preventDefault();
    e.stopPropagation();
    recordingStartYRef.current = e.clientY || e.touches?.[0]?.clientY || 0;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRecording();
  };

  const onPrimaryPointerMove = (e) => {
    if (pendingFirstMessageOnly) return;
    if (!recording || recordingLocked) return;
    const startY = recordingStartYRef.current;
    const currentY = e.clientY || e.touches?.[0]?.clientY || startY;
    if (startY - currentY > 58) {
      setRecordingLocked(true);
    }
  };

  const onPrimaryPointerUp = (e) => {
    if (pendingFirstMessageOnly) return;
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!recordingLocked) {
      stopRecording(true);
    }
  };

  const onPrimaryClick = (e) => {
    if (recording) {
      if (recordingLocked) stopRecording(true);
      return;
    }
    if (canQuickRecord) return;
    e.stopPropagation();
    handleSend();
  };

  const addRecentEmoji = (emoji) => {
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((item) => item !== emoji)].slice(0, MAX_RECENT_EMOJIS);
      saveRecentEmojis(next);
      return next;
    });
  };

  const pickEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    addRecentEmoji(emoji);
    if (emojiCat !== "recent" && !recentEmojis.length) {
      setEmojiCat("recent");
    }
    closeEmoji();
    inpRef.current?.focus();
  };

  useEffect(() => {
    if (!showAttachMenu) return;
    const closeAttachOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", closeAttachOutside, true);
    return () => document.removeEventListener("mousedown", closeAttachOutside, true);
  }, [showAttachMenu]);

  useEffect(() => {
    if (!showTtl) return;
    const closeTtlOutside = (event) => {
      if (ttlRef.current && !ttlRef.current.contains(event.target)) {
        setShowTtl(false);
      }
    };
    document.addEventListener("mousedown", closeTtlOutside, true);
    return () => document.removeEventListener("mousedown", closeTtlOutside, true);
  }, [showTtl]);

  // emoji-outside-close-pass
  useEffect(() => {
    if (!showEmoji) return;

    const closeEmojiOutside = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (emojiRootRef.current && !emojiRootRef.current.contains(target)) {
        setShowEmoji(false);
      }
    };

    document.addEventListener("mousedown", closeEmojiOutside, true);
    document.addEventListener("touchstart", closeEmojiOutside, true);

    return () => {
      document.removeEventListener("mousedown", closeEmojiOutside, true);
      document.removeEventListener("touchstart", closeEmojiOutside, true);
    };
  }, [showEmoji]);

  useEffect(() => () => {
    stopRecordingTimer();
    cleanupRecordingStream();
    stopVoiceAnalyser();
    if (voiceFile?.previewUrl) URL.revokeObjectURL(voiceFile.previewUrl);
  }, [voiceFile?.previewUrl]);

  useEffect(() => {
    const onGlobalType = (event) => {
      if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable;

      if (!isTypingTarget) {
        inpRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onGlobalType);
    return () => window.removeEventListener("keydown", onGlobalType);
  }, [disabled]);
return (
    <>
      {replyTo && (
        <div className="reply-prev" onClick={e => e.stopPropagation()}>
          <div style={{ color: "var(--acc)", fontSize: 18 }}>↩</div>
          <div className="reply-prev-inner">
            <div className="reply-prev-name">{replyPreviewTitle}</div>
            <div className="reply-prev-txt">{replyPreview(replyTo)}</div>
          </div>
          <button className="modal-close" onClick={onОтменаОтветить}>×</button>
        </div>
      )}

      {!pendingFirstMessageOnly && imgFile && (
        <div style={{ padding: "8px 14px 0", background: "var(--bg1)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <img style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--bdr2)" }} src={imgFile.src} alt="" />
            <button style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "var(--red)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setImgFile(null)}>×</button>
          </div>
        </div>
      )}

      {!pendingFirstMessageOnly && generalFile && (
        <div style={{ padding: "8px 14px 0", background: "var(--bg1)", display: "flex", alignItems: "center", gap: 8 }}>
          <div className="msg-file" style={{ flex: 1 }}>
            <FileTypeIcon name={generalFile.name} />
            <div className="msg-file-info">
              <div className="msg-file-name">{generalFile.name}</div>
              <div className="msg-file-size">{formatFileSize(generalFile.size)}</div>
            </div>
          </div>
          <button style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--red)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setGeneralFile(null)}>×</button>
        </div>
      )}

      {voiceError && (
        <div className="voice-error">{voiceError}</div>
      )}

      {recording && (
        <div className={`recording-panel${recordingLocked ? " locked" : ""}`} onClick={e => e.stopPropagation()}>
          <div className="recording-pulse" />
          <span>{formatDuration(recordingMs)}</span>
          <b>{recordingLocked ? "" : ""}</b>
          {recordingLocked && (
            <>
              <button type="button" className="recording-cancel" onClick={cancelRecording}>Cancel</button>
              <button type="button" className="recording-send" onClick={() => stopRecording(true)}>вћ¤</button>
            </>
          )}
        </div>
      )}

      {!pendingFirstMessageOnly && voiceFile && (
        <div className="voice-preview-wrap" onClick={e => e.stopPropagation()}>
          <VoiceMessage
            variant="preview"
            src={voiceFile.previewUrl}
            durationMs={voiceFile.durationMs}
            onCancel={cancelVoice}
          />
        </div>
      )}

      <div ref={emojiRootRef} className="input-bar" onClick={e => e.stopPropagation()}>
        {!groupMuteLocksInput && showEmoji && (
          <div className={`emoji-picker${emojiClosing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>
            <div className="emoji-cats">
              {emojiCategories.map((cat) => (
                <button
                  key={cat.key}
                  className={`emoji-cat-btn${emojiCat === cat.key ? " active" : ""}`}
                  onClick={() => setEmojiCat(cat.key)}
                  title={cat.label}
                >
                  <span>{cat.icon}</span>
                </button>
              ))}
            </div>
            <div className="emoji-section-head">
              <span>{currentCategory?.label || "Smileys"}</span>
              {emojiCat === "recent" && recentEmojis.length > 0 && (
                <button
                  type="button"
                  className="emoji-clear-btn"
                  onClick={() => {
                    setRecentEmojis([]);
                    saveRecentEmojis([]);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="emoji-grid">
              {currentEmojis.map((em) => (
                <button key={`${emojiCat}-${em}`} className="emoji-btn" onClick={() => pickEmoji(em)}>{em}</button>
              ))}
              {emojiCat === "recent" && recentEmojis.length === 0 && (
                <div className="emoji-empty">
                  Recently used emoji will appear here.
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={`inp-area${recording ? " recording-inline" : ""}${groupMuteLocksInput ? " inp-area--group-muted" : ""}`}
          onClick={recording ? e => e.stopPropagation() : focusInput}
        >
          {recording && (
            <>
              <button type="button" className="recording-inline-cancel" onClick={cancelRecording}>×</button>
              <div className="recording-pulse" />
              <span className="recording-time">{formatDuration(recordingMs)}</span>
              <div className={`voice-live-wave${recordingPaused ? " paused" : ""}`}>
                {voiceLevels.map((level, index) => (
                  <i key={index} style={{ height: `${Math.max(5, Math.round(level * 28))}px` }} />
                ))}
              </div>
              <button type="button" className="recording-pause" onClick={toggleRecordingPause} title={recordingPaused ? "Resume" : "Pause"}>
                {recordingPaused ? <PlayIcon /> : <PauseIcon />}
              </button>
            </>
          )}

          {/* Attach button (inside input pill, left side) */}
          {!pendingFirstMessageOnly && !groupMuteLocksInput && !recording && (
            <div style={{ position: "relative" }} ref={attachMenuRef}>
              <button
                type="button"
                className="inp-icon-btn"
                onClick={(e) => { e.stopPropagation(); setShowAttachMenu(v => !v); }}
                title="Attach"
              >
                <AttachIcon />
              </button>
              {showAttachMenu && (
                <div className="attach-menu" onClick={e => e.stopPropagation()}>
                  <div className="attach-menu-item" onClick={() => { setShowAttachMenu(false); fileRef.current?.click(); }}>
                    <PhotoIcon />
                    <span>{messagePlaceholder === "Сообщение..." ? "Фото или видео" : "Photo or video"}</span>
                  </div>
                  <div className="attach-menu-item" onClick={() => { setShowAttachMenu(false); generalFileRef.current?.click(); }}>
                    <DocIcon />
                    <span>{messagePlaceholder === "Сообщение..." ? "Документ" : "Document"}</span>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFileChange} />
              <input ref={generalFileRef} type="file" style={{ display: "none" }} onChange={onGeneralFileChange} />
            </div>
          )}

          <div className={`msg-inp-wrap${muteInlineNotice && !recording ? " msg-inp-wrap--mute" : ""}`}>
            {muteInlineNotice && !recording && (
              <div className="group-mute-in-inp" role="status" aria-live="polite">
                <span className="group-mute-in-inp__text">{muteInlineNotice}</span>
              </div>
            )}
            <textarea
              ref={inpRef}
              className="msg-inp"
              rows={1}
              placeholder={muteInlineNotice && !recording ? "" : messagePlaceholder}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKey}
              disabled={disabled}
            />
          </div>

          {/* Emoji button (inside input pill, right side) */}
          {!groupMuteLocksInput && !recording && (
            <button type="button" className="inp-icon-btn" aria-label="Emoji" title="Emoji" onClick={toggleEmoji}>
              <EmojiIcon />
            </button>
          )}

          {/* Timer button (inside input pill, right side) */}
          {!groupMuteLocksInput && !pendingFirstMessageOnly && !recording && (
            <div style={{ position: "relative" }} ref={ttlRef}>
              <button
                type="button"
                className={`inp-icon-btn${ttl ? " active" : ""}`}
                onClick={(e) => { e.stopPropagation(); setShowTtl(v => !v); }}
                title="Self-destruct timer"
              >
                <TimerIcon />
              </button>
              {showTtl && (
                <div className="ttl-popup" onClick={e => e.stopPropagation()}>
                  {TTL_OPTIONS.map(opt => (
                    <div
                      key={opt.label}
                      className={`ttl-option${ttl === opt.value ? " selected" : ""}`}
                      onClick={() => { setTtl(opt.value); setShowTtl(false); }}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!groupMuteLocksInput && (
          <button
            type="button"
            className={`send-btn${canQuickRecord ? " voice-ready" : ""}${recording ? " recording" : ""}${recordingLocked ? " locked" : ""}`}
            onClick={onPrimaryClick}
            onPointerDown={onPrimaryPointerDown}
            onPointerMove={onPrimaryPointerMove}
            onPointerUp={onPrimaryPointerUp}
            onPointerCancel={pendingFirstMessageOnly ? undefined : cancelRecording}
            disabled={disabled}
            title={recordingLocked ? "Send voice" : canQuickRecord ? "Hold to record" : "Send"}
          >
            {recordingLocked ? <SendIcon /> : canQuickRecord ? <MicIcon /> : <SendIcon />}
          </button>
        )}
      </div>
    </>
  );
}

function pickVoiceMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) || "";
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function replyPreview(msg) {
  if (msg?._img) return "Photo";
  if (msg?._voice) return "Voice message";
  return msg?._text || "";
}

function MicIcon() {
  return (
    <svg className="btn-icon mic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0" />
      <path d="M12 17.7V21" />
      <path d="M8.7 21h6.6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="btn-icon send-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12h14" />
      <path d="M13 6.5 18.5 12 13 17.5" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="btn-icon pause-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7v10" />
      <path d="M15 7v10" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="btn-icon play-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6.5v11l8-5.5-8-5.5Z" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M10 2h4" />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c.8 1.2 2 2 3.5 2s2.7-.8 3.5-2" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg className="attach-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="attach-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function FileTypeIcon({ name }) {
  const ext = String(name || "").split(".").pop().toLowerCase();
  const iconMap = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", zip: "🗜️", rar: "🗜️", mp3: "🎵", mp4: "🎬", txt: "📃" };
  const icon = iconMap[ext] || "📁";
  return <div className="msg-file-icon">{icon}</div>;
}

function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
