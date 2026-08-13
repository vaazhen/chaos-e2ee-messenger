import { useCallback, useEffect, useRef } from "react";
import useSwipeDown from "../../hooks/useSwipeDown";
import { CloseIcon } from "../Icons";

export default function Sheet({
  open = true,
  onClose,
  title,
  className = "",
  overlayClassName = "",
  children,
  swipe = true,
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
      className={`ps-submodal-bg${overlayClassName ? ` ${overlayClassName}` : ""}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`ps-submodal${className ? ` ${className}` : ""}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title != null && (
          <div className="ps-submodal-header">
            <span className="modal-title-text">{title}</span>
            <button type="button" className="modal-close" onClick={handleClose} aria-label="Close" title="Закрыть">
              <CloseIcon />
            </button>
          </div>
        )}
        <div className="ps-submodal-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
