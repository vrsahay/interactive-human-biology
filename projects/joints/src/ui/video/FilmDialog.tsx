import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal panel over the film: focus moves into it, Tab / Shift+Tab stay inside while it is open, Escape or the close button
 * dismiss it, and focus returns to the control that opened it.
 */
export function FilmDialog({ id, title, onClose, children, testid, class: className = "" }: { id: string; title: string; onClose: () => void; children: ComponentChildren; testid: string; class?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Real tab stops only: a radio group is one stop (its checked radio, or the first one when none is checked).
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
        if (el.offsetParent === null && el !== document.activeElement) return false;
        if (el instanceof HTMLInputElement && el.type === "radio" && el.name) {
          const group = [...panel.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${el.name}"]`)];
          const checked = group.find((r) => r.checked);
          return checked ? checked === el : group[0] === el;
        }
        return true;
      });
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    panel.addEventListener("keydown", onKey);
    return () => {
      panel.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);
  return (
    <div class="film-dialog-layer">
      <div class="film-dialog-backdrop" onClick={onClose} aria-hidden="true" />
      <section ref={ref} class={`film-dialog ${className}`} id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} data-testid={testid}>
        <div class="film-dialog__header">
          <h2 class="film-dialog__title" id={`${id}-title`}>
            {title}
          </h2>
          <button type="button" class="film-icon film-dialog__close" aria-label="Close" data-testid={`${testid}-close`} onClick={onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6z" /></svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
