import { useCallback, useEffect, useRef } from "react";
import useSwipeDown from "../../hooks/useSwipeDown";
import { CloseIcon } from "../Icons";

export default function Modal({
  open = true,
  onClose,
  title,
  size = "md",
  className = "",
  overlayClassName = "",
  children,
  swipe = true,
  closeOnOverlay = true,
  hideHeader = false,
}) {
  const panelRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useSwipeDown(panelRef, handleClose, { enabled: swipe && open });

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className={`modal-bg${overlayClassName ? ` ${overlayClassName}` : ""}`}
      onClick={closeOnOverlay ? handleClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`modal${size === "sm" ? " small-modal" : ""}${className ? ` ${className}` : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        {!hideHeader && title != null && (
          <div className="modal-title">
            <span className="modal-title-text">{title}</span>
            <button type="button" className="modal-close" onClick={handleClose} aria-label="Close" title="Закрыть">
              <CloseIcon />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
