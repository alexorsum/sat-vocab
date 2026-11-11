import { useEffect, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Page-level keyboard shortcuts. Keys are matched in lower case ("a", "1",
 * "enter", " " for space, "arrowleft"). Shortcuts are ignored while typing in
 * a text field, and when Ctrl, Alt, or Cmd is held.
 */
export function useHotkeys(map: Record<string, KeyHandler>, enabled = true): void {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      // Let Enter and Space activate a focused button or link as usual.
      if ((key === 'enter' || key === ' ') && e.target instanceof HTMLElement && /^(BUTTON|A|SUMMARY)$/.test(e.target.tagName)) return;
      const handler = ref.current[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

export function useTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · SAT Vocab`;
  }, [title]);
}
