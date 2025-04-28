import { useEffect } from "react";

export function useClickOutside(
  containerRef: React.RefObject<HTMLElement | null>,
  callback: () => void,
  excludeRef?: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const handleClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(excludeRef?.current && excludeRef.current.contains(target))
      ) {
        callback();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        callback();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [containerRef, callback, excludeRef]);
}
