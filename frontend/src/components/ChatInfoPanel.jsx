import { useRef, useState } from "react";
import useSwipeDown from "../hooks/useSwipeDown";
import { ChevronRightIcon, CloseIcon } from "./Icons";

export default function ChatInfoPanel({ chat, chatBg, onChangeBg, onClose, noWrapper }) {
  const modalRef = useRef(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 200);
  };

  useSwipeDown(modalRef, handleClose);

  const effectiveLang = String(navigator.language || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
  const l = (ru, en) => (effectiveLang === "ru" ? ru : en);

  const backgrounds = [
    { key: "clean",    label: l("Чистый", "Clean") },
    { key: "grid",     label: l("Сетка", "Grid") },
    { key: "noise",    label: l("Шум", "Noise") },
    { key: "gradient", label: l("Градиент", "Gradient") },
    { key: "dots",     label: l("Точки", "Dots") },
    { key: "waves",    label: l("Волны", "Waves") },
  ];

  const content = (
    <>
      <div className="tool-card">
        <div className="tool-title">{l("Фон переписки", "Chat background")}</div>

        <div className="bg-picker">
          {backgrounds.map(item => (
            <button
              key={item.key}
              type="button"
              className={`bg-option bg-${item.key}${chatBg === item.key ? " active" : ""}`}
              onClick={() => onChangeBg(item.key)}
            >
              <span />
              <b>{item.label}</b>
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="tool-row disabled" disabled>
        <span className="tool-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2 2" />
            <path d="M10 2h4" />
          </svg>
        </span>
        <b>{l("Автоудаление", "Auto-delete")}</b>
        <em>{l("скоро", "soon")}</em>
      </button>

      <button type="button" className="tool-row disabled" disabled>
        <span className="tool-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <path d="M12 15v3" />
          </svg>
        </span>
        <b>{l("Запретить копирование", "Disable copying")}</b>
        <em>{l("скоро", "soon")}</em>
      </button>

      <button type="button" className="tool-row danger" onClick={() => {}}>
        <span className="tool-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </span>
        <b>{l("Удалить переписку", "Delete chat")}</b>
        <span className="tool-arrow"><ChevronRightIcon /></span>
      </button>
    </>
  );

  if (noWrapper) return <div className="ps-submodal-tools">{content}</div>;

  return (
    <div className={`modal-bg${closing ? " closing" : ""}`} onClick={handleClose}>
      <div ref={modalRef} className={`modal${closing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <b>{l("Настройки чата", "Chat settings")}</b>
          <button className="icon-btn modal-close" onClick={handleClose}><CloseIcon /></button>
        </div>
        {content}
      </div>
    </div>
  );
}
