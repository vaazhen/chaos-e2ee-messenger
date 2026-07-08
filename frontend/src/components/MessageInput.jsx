import { useMemo, useRef, useState, useEffect } from "react";
import VoiceMessage from "./VoiceMessage";
import EmojiPicker, { EMOJI_CATEGORIES, loadRecentEmojis, saveRecentEmojis, MAX_RECENT_EMOJIS } from "./EmojiPicker";
import AttachmentMenu from "./AttachmentMenu";
import { MicIcon, SendIcon, PauseIcon, PlayIcon, EmojiIcon, AttachIcon, TimerIcon, CloseIcon, ReplyIcon, FileIcon } from "./Icons";

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

  const currentCategory = emojiCategories.find(c => c.key === emojiCat) || emojiCategories[1] || emojiCategories[0];
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
      stopRecording(true);
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
          <span className="reply-prev-icon"><ReplyIcon /></span>
          <div className="reply-prev-inner">
            <div className="reply-prev-name">{replyPreviewTitle}</div>
            <div className="reply-prev-txt">{replyPreview(replyTo)}</div>
          </div>
          <button className="icon-btn modal-close" onClick={onОтменаОтветить}><CloseIcon /></button>
        </div>
      )}

      {!pendingFirstMessageOnly && imgFile && (
        <div className="attachment-preview-wrap">
          <div className="attachment-preview-img">
            <img src={imgFile.src} alt="" />
            <button className="attachment-remove-btn" onClick={() => setImgFile(null)}><CloseIcon /></button>
          </div>
        </div>
      )}

      {!pendingFirstMessageOnly && generalFile && (
        <div className="attachment-preview-file">
          <div className="msg-file">
            <span className="msg-file-icon"><FileIcon /></span>
            <div className="msg-file-info">
              <div className="msg-file-name">{generalFile.name}</div>
              <div className="msg-file-size">{formatFileSize(generalFile.size)}</div>
            </div>
          </div>
          <button className="attachment-remove-btn" onClick={() => setGeneralFile(null)}><CloseIcon /></button>
        </div>
      )}

      {voiceError && (
        <div className="voice-error">{voiceError}</div>
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
          <EmojiPicker
            emojiClosing={emojiClosing}
            emojiCategories={emojiCategories}
            emojiCat={emojiCat}
            setEmojiCat={setEmojiCat}
            currentEmojis={currentEmojis}
            recentEmojis={recentEmojis}
            setRecentEmojis={setRecentEmojis}
            onPick={pickEmoji}
            onClose={closeEmoji}
            saveRecentEmojis={saveRecentEmojis}
          />
        )}

        <div
          className={`inp-area${recording ? " recording-inline" : ""}${groupMuteLocksInput ? " inp-area--group-muted" : ""}`}
          onClick={recording ? e => e.stopPropagation() : focusInput}
        >
          {recording && (
            <>
              <button type="button" className="icon-btn recording-inline-cancel" onClick={cancelRecording}><CloseIcon /></button>
              {recordingLocked ? (
                <svg className="recording-lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <div className="recording-pulse" />
              )}
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
            <div className="inp-btn-wrap" ref={attachMenuRef}>
              <button
                type="button"
                className="inp-icon-btn"
                onClick={(e) => { e.stopPropagation(); setShowAttachMenu(v => !v); }}
                title="Attach"
              >
                <AttachIcon />
              </button>
              <AttachmentMenu
                showAttachMenu={showAttachMenu}
                onClose={() => setShowAttachMenu(false)}
                onPhotoClick={() => fileRef.current?.click()}
                onDocClick={() => generalFileRef.current?.click()}
                l={(ru, en) => messagePlaceholder === "Сообщение..." ? ru : en}
              />
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden-inp" onChange={onFileChange} />
              <input ref={generalFileRef} type="file" className="hidden-inp" onChange={onGeneralFileChange} />
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
            <div className="inp-btn-wrap" ref={ttlRef}>
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
            title={recording ? "Send voice" : canQuickRecord ? "Hold to record" : "Send"}
          >
            {recording ? <SendIcon /> : canQuickRecord ? <MicIcon /> : <SendIcon />}
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

function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
