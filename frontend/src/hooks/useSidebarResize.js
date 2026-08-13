import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const SIDEBAR_WIDTH_KEY = "cm_sidebar_width";
const SIDEBAR_LEGACY_COLLAPSED_KEY = "cm_sidebar_collapsed";
const SIDEBAR_MIN = 68;
const SIDEBAR_MAX = 520;
const SIDEBAR_DEFAULT = 400;
const SIDEBAR_COMPACT_ENTER = 112;
const SIDEBAR_COMPACT_EXIT = 128;

function clampSidebarWidth(n) {
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(Number(n))));
}

function readInitialSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n)) return clampSidebarWidth(n);
    }
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT;
}

export default function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    typeof window !== "undefined" ? readInitialSidebarWidth() : SIDEBAR_DEFAULT
  );
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    const desktop = window.matchMedia("(min-width: 861px)").matches;
    return desktop && readInitialSidebarWidth() <= SIDEBAR_COMPACT_ENTER;
  });
  const [sidebarDragging, setSidebarDragging] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);
  const sidebarDesktopRef = useRef(true);
  const dragSidebarRef = useRef({
    active: false,
    startX: 0,
    startW: SIDEBAR_DEFAULT,
    pointerId: null,
  });
  const pendingSidebarWidthRef = useRef(null);
  const rafSidebarRef = useRef(null);

  const [sidebarDesktop, setSidebarDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 861px)").matches : true
  );

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    sidebarDesktopRef.current = sidebarDesktop;
  }, [sidebarDesktop]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 861px)");
    const onMq = () => setSidebarDesktop(mq.matches);
    mq.addEventListener("change", onMq);
    onMq();
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useLayoutEffect(() => {
    if (!sidebarDesktop) {
      setSidebarCompact(prev => (prev ? false : prev));
      return;
    }
    setSidebarCompact(prev => {
      if (prev) {
        return sidebarWidth > SIDEBAR_COMPACT_EXIT ? false : true;
      }
      return sidebarWidth <= SIDEBAR_COMPACT_ENTER ? true : false;
    });
  }, [sidebarWidth, sidebarDesktop]);

  const applyPendingSidebarWidth = useCallback(() => {
    const v = pendingSidebarWidthRef.current;
    if (v == null) return;
    pendingSidebarWidthRef.current = null;
    setSidebarWidth(v);
    sidebarWidthRef.current = v;
  }, []);

  const onSidebarResizePointerDown = useCallback((e) => {
    if (!sidebarDesktopRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    dragSidebarRef.current = {
      active: true,
      startX: e.clientX,
      startW: sidebarWidthRef.current,
      pointerId: e.pointerId,
    };
    setSidebarDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onSidebarResizePointerMove = useCallback((e) => {
    if (!dragSidebarRef.current.active) return;
    e.preventDefault();
    const { startX, startW } = dragSidebarRef.current;
    const next = clampSidebarWidth(startW + (e.clientX - startX));
    pendingSidebarWidthRef.current = next;
    if (rafSidebarRef.current != null) return;
    rafSidebarRef.current = requestAnimationFrame(() => {
      rafSidebarRef.current = null;
      applyPendingSidebarWidth();
    });
  }, [applyPendingSidebarWidth]);

  const flushSidebarResizePending = useCallback(() => {
    if (rafSidebarRef.current != null) {
      cancelAnimationFrame(rafSidebarRef.current);
      rafSidebarRef.current = null;
    }
    if (pendingSidebarWidthRef.current != null) {
      const v = pendingSidebarWidthRef.current;
      pendingSidebarWidthRef.current = null;
      setSidebarWidth(v);
      sidebarWidthRef.current = v;
    }
  }, []);

  const endSidebarResizeDrag = useCallback((releaseTarget, pointerId) => {
    if (!dragSidebarRef.current.active) return;
    dragSidebarRef.current.active = false;
    dragSidebarRef.current.pointerId = null;
    setSidebarDragging(false);
    flushSidebarResizePending();
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
      localStorage.removeItem(SIDEBAR_LEGACY_COLLAPSED_KEY);
    } catch {
      /* ignore */
    }
    if (releaseTarget?.releasePointerCapture && pointerId != null) {
      try {
        releaseTarget.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
  }, [flushSidebarResizePending]);

  const onSidebarResizePointerUp = useCallback((e) => {
    const pid = dragSidebarRef.current.pointerId;
    endSidebarResizeDrag(e.currentTarget, pid);
  }, [endSidebarResizeDrag]);

  const onSidebarResizeLostCapture = useCallback((e) => {
    if (!dragSidebarRef.current.active) return;
    if (e.pointerId !== dragSidebarRef.current.pointerId) return;
    endSidebarResizeDrag(null, null);
  }, [endSidebarResizeDrag]);

  return {
    sidebarWidth,
    sidebarCompact,
    sidebarDragging,
    sidebarDesktop,
    onSidebarResizePointerDown,
    onSidebarResizePointerMove,
    onSidebarResizePointerUp,
    onSidebarResizeLostCapture,
  };
}
