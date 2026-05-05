import { useMemo, useRef, useState, useEffect } from "react";

const EMOJI_STORAGE_KEY = "cm_recent_emojis";
const MAX_RECENT_EMOJIS = 16;
const MAX_VOICE_MS = 30_000;
const MAX_VOICE_BYTES = 110 * 1024;

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

export default function MessageInput({ onSend, replyTo, onОтменаОтветить, disabled, onTyping }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiClosing, setEmojiClosing] = useState(false);
  const [emojiCat, setEmojiCat] = useState("recent");
  const [recentEmojis, setRecentEmojis] = useState(() => loadRecentEmojis());
  const [imgFile, setImgFile] = useState(null);
  const [voiceFile, setVoiceFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const inpRef = useRef(null);
  const fileRef = useRef(null);
  const inputBarRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingTimerRef = useRef(null);
  
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

  const handleSend = () => {
    if (!text.trim() && !imgFile && !voiceFile) return;
    onSend({ text: text.trim(), imgFile, voiceFile, replyTo });
    setText("");
    setImgFile(null);
    setVoiceFile(null);
    setVoiceError("");
    setShowEmoji(false);
    setEmojiClosing(false);
    inpRef.current?.focus();
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const onFileChange = e => {
    const file = e.target.files[0]; if (!file) return;
    cancelVoice();
    const reader = new FileReader();
    reader.onload = ev => setImgFile({ src: ev.target.result, file });
    reader.readAsDataURL(file);
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

  const stopRecording = () => {
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
      setRecording(true);
      setRecordingMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        cleanupRecordingStream();
        setRecording(false);

        const durationMs = Math.min(MAX_VOICE_MS, Date.now() - recordingStartedAtRef.current);
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        voiceChunksRef.current = [];

        if (durationMs < 500 || !blob.size) {
          setVoiceError("Voice message is too short");
          return;
        }
        if (blob.size > MAX_VOICE_BYTES) {
          setVoiceError("Voice message is too large. Keep it shorter.");
          return;
        }

        setVoiceFile(prev => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
          return {
            blob,
            mime: blob.type || "audio/webm",
            size: blob.size,
            durationMs,
            previewUrl: URL.createObjectURL(blob),
            name: "voice-message.webm",
          };
        });
      };

      recorder.start();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartedAtRef.current;
        setRecordingMs(Math.min(MAX_VOICE_MS, elapsed));
        if (elapsed >= MAX_VOICE_MS) stopRecording();
      }, 200);
    } catch (e) {
      cleanupRecordingStream();
      setRecording(false);
      setVoiceError(e?.message || "Could not access microphone");
    }
  };

  const cancelVoice = () => {
    if (voiceFile?.previewUrl) URL.revokeObjectURL(voiceFile.previewUrl);
    setVoiceFile(null);
    setVoiceError("");
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
    if (voiceFile?.previewUrl) URL.revokeObjectURL(voiceFile.previewUrl);
  }, [voiceFile?.previewUrl]);
return (
    <>
      {replyTo && (
        <div className="reply-prev" onClick={e => e.stopPropagation()}>
          <div style={{ color: "var(--acc)", fontSize: 18 }}>↩</div>
          <div className="reply-prev-inner">
            <div className="reply-prev-name">Ответить</div>
            <div className="reply-prev-txt">{replyPreview(replyTo)}</div>
          </div>
          <button className="modal-close" onClick={onОтменаОтветить}>×</button>
        </div>
      )}

      {imgFile && (
        <div style={{ padding: "8px 14px 0", background: "var(--bg1)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ position: "relative" }}>
            <img style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--bdr2)" }} src={imgFile.src} alt="" />
            <button style={{ position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: "50%", background: "var(--red)", border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setImgFile(null)}>×</button>
          </div>
        </div>
      )}

      {voiceError && (
        <div className="voice-error">{voiceError}</div>
      )}

      {voiceFile && (
        <div className="voice-preview" onClick={e => e.stopPropagation()}>
          <audio src={voiceFile.previewUrl} controls />
          <span>{formatDuration(voiceFile.durationMs)}</span>
          <button type="button" onClick={cancelVoice}>Г—</button>
        </div>
      )}

      <div ref={emojiRootRef} className="input-bar" onClick={e => e.stopPropagation()}>
        {showEmoji && (
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

        <div className="inp-area">
          <button type="button" className="emoji-trigger" onClick={toggleEmoji}>😊</button>
          <textarea
            ref={inpRef}
            className="msg-inp"
            rows={1}
            placeholder="Сообщение..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKey}
            disabled={disabled}
          />
          <button className="emoji-trigger" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>📎</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileChange} />
          <button
            type="button"
            className={`emoji-trigger${recording ? " recording" : ""}`}
            onClick={e => {
              e.stopPropagation();
              recording ? stopRecording() : startRecording();
            }}
            title={recording ? formatDuration(recordingMs) : "Voice message"}
            disabled={disabled}
          >
            {recording ? "■" : "●"}
          </button>
        </div>

        <button className="send-btn" onClick={handleSend} disabled={(!text.trim() && !imgFile && !voiceFile) || disabled || recording}>➤</button>
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
