import { useRef, useCallback, useEffect } from "react";

const THRESHOLD = 120;
const VELOCITY_THRESHOLD = 0.5;

export default function useSwipeDown(ref, onClose, { enabled = true } = {}) {
  const state = useRef({ startY: 0, moving: false, dy: 0, startTime: 0 });

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform .35s cubic-bezier(.22,.68,0,1), opacity .25s ease";
    el.style.transform = "";
    el.style.opacity = "";
    state.current = { startY: 0, moving: false, dy: 0, startTime: 0 };
  }, [ref]);

  const handleTouchStart = useCallback((e) => {
    if (!enabled || e.touches.length > 1) return;
    state.current.startY = e.touches[0].clientY;
    state.current.startTime = Date.now();
    state.current.moving = false;
    state.current.dy = 0;
    const el = ref.current;
    if (el) {
      el.style.transition = "none";
    }
  }, [enabled, ref]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || state.current.startY === 0) return;
    const dy = e.touches[0].clientY - state.current.startY;
    if (dy < 0) return;
    state.current.dy = dy;
    state.current.moving = true;
    const el = ref.current;
    if (!el) return;
    const progress = Math.min(dy / THRESHOLD, 1);
    const scale = 1 - progress * 0.03;
    el.style.transform = `translateY(${dy}px) scale(${scale})`;
    el.style.opacity = 1 - progress * 0.4;
  }, [enabled, ref]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !state.current.moving) return;
    const el = ref.current;
    if (!el) return;

    const { dy, startTime } = state.current;
    const dt = Date.now() - startTime;
    const velocity = dt > 0 ? dy / dt : 0;

    if (dy > THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      el.style.transition = "transform .3s cubic-bezier(.22,.68,0,1), opacity .2s ease";
      el.style.transform = `translateY(${Math.max(dy + 80, window.innerHeight * 0.25)}px) scale(0.94)`;
      el.style.opacity = "0";
      setTimeout(() => { onClose?.(); reset(); }, 280);
    } else {
      reset();
    }

    state.current = { startY: 0, moving: false, dy: 0, startTime: 0 };
  }, [enabled, ref, onClose, reset]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, ref, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
