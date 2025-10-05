import { useEffect } from "react";

export function useClickOutside(
  containerRef: React.RefObject<HTMLElement | null>,
  callback: () => void,
  excludeRef?: React.RefObject<HTMLElement | null>,
  p0?: { dragTolerance: number; enabled: boolean }
) {
  useEffect(() => {
    const dragTolerance = 12;

    let startX = 0;
    let startY = 0;
    let moved = false;
    let startedOutside = false;

    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const c = containerRef.current;
      const ex = excludeRef?.current;
      const inContainer = !!(c && (c === target || c.contains(target)));
      const inExclude = !!(ex && (ex === target || ex.contains(target)));
      return inContainer || inExclude;
    };

    const onPointerDown = (e: PointerEvent) => {
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      startedOutside = !isInside(e.target);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!startedOutside) return;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx > dragTolerance || dy > dragTolerance) {
        moved = true;
      }
    };

    const onPointerUp = () => {
      if (!startedOutside) return;
      if (moved) return;
      callback();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        callback();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [containerRef, callback, excludeRef]);
}
