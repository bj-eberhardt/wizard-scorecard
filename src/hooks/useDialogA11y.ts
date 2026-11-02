import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  return el.getClientRects().length > 0;
}

interface DialogA11yOptions {
  open: boolean;
  /** Dialog wrapper — the boundary the Tab cycle stays inside. */
  containerRef: RefObject<HTMLElement | null>;
  /** Escape handler: the cancel path, never the destructive confirm. */
  onClose: () => void;
}

/**
 * Moves focus into the dialog when it opens (onto the `data-autofocus` control, else onto the
 * first focusable one), keeps Tab/Shift-Tab cycling inside it, closes it on Escape and hands
 * focus back to the trigger when it closes. The markup itself (`role="dialog"`, `aria-modal`,
 * `aria-labelledby`) stays in the component that owns the title.
 */
export function useDialogA11y({ open, containerRef, onClose }: DialogA11yOptions) {
  const openerRef = useRef<Element | null>(null);
  // A ref, not an effect dependency: callers pass inline arrow functions, and re-running the
  // effect below on every render would pull focus back into the dialog while the user types.
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!open || !container) return;

    openerRef.current = document.activeElement;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible);

    (container.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const targets = focusables();
      if (targets.length === 0) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;

      if (!active || !container.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const opener = openerRef.current;
      openerRef.current = null;
      // The trigger can be unmounted by the time the dialog closes (confirming a reset swaps
      // the whole screen), so focus only goes back to a still-connected element.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open, containerRef]);
}
