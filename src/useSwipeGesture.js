import { useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD = 72; // px dragged to commit an action
const DIRECTION_LOCK_THRESHOLD = 10; // px before we decide horizontal vs. vertical intent

// Horizontal swipe detection with a direction lock, so a horizontal drag
// doesn't fight the page's vertical scroll (and vice versa). React 17+
// attaches its delegated touchmove listener as passive by default, which
// silently no-ops e.preventDefault() from a JSX onTouchMove handler — so
// this attaches a real non-passive native listener via a ref instead.
export function useSwipeGesture({ onSwipeLeft, onSwipeRight, maxDrag = 96, disabled = false } = {}) {
  const [dx, setDx] = useState(0);
  const ref = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(null); // null | "horizontal" | "vertical"
  const dxRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;

    function handleStart(e) {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
      locked.current = null;
    }
    function handleMove(e) {
      const t = e.touches[0];
      const rawDx = t.clientX - startX.current;
      const rawDy = t.clientY - startY.current;
      if (locked.current === null) {
        if (Math.abs(rawDx) > DIRECTION_LOCK_THRESHOLD || Math.abs(rawDy) > DIRECTION_LOCK_THRESHOLD) {
          locked.current = Math.abs(rawDx) > Math.abs(rawDy) ? "horizontal" : "vertical";
        }
      }
      if (locked.current === "horizontal") {
        e.preventDefault();
        const clamped = Math.max(-maxDrag, Math.min(maxDrag, rawDx));
        dxRef.current = clamped;
        setDx(clamped);
      }
    }
    function handleEnd() {
      if (locked.current === "horizontal") {
        if (dxRef.current > SWIPE_THRESHOLD) onSwipeRight?.();
        else if (dxRef.current < -SWIPE_THRESHOLD) onSwipeLeft?.();
      }
      dxRef.current = 0;
      setDx(0);
      locked.current = null;
    }

    el.addEventListener("touchstart", handleStart, { passive: true });
    el.addEventListener("touchmove", handleMove, { passive: false });
    el.addEventListener("touchend", handleEnd, { passive: true });
    el.addEventListener("touchcancel", handleEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleStart);
      el.removeEventListener("touchmove", handleMove);
      el.removeEventListener("touchend", handleEnd);
      el.removeEventListener("touchcancel", handleEnd);
    };
  }, [onSwipeLeft, onSwipeRight, maxDrag, disabled]);

  return { ref, dx };
}
