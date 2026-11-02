import { useCallback, useRef, useState } from 'react';

interface DragState {
  index: number;
  offsetY: number;
}

/**
 * Pointer-event based vertical drag & drop reordering for a flat list of rows
 * of (approximately) equal height.
 *
 * Works with mouse, touch and pen — unlike HTML5 drag & drop, which Firefox on
 * Android does not support. The grip element must set `touch-action: none` so
 * the browser does not steal the gesture for scrolling.
 *
 * While dragging, the grabbed row is visually offset with `dragOffsetY(index)`
 * and marked with `data-dragging`; `isDragging` lets the caller suppress other
 * interactions. Crossing the half-row threshold reorders live, so the drop
 * target is readable from the list itself — no separate insertion marker.
 *
 * IMPORTANT: the caller must key its rows by a STABLE id (not the array index).
 * During a drag the same DOM node has to keep representing the grabbed row,
 * otherwise the visual offset jumps to another row after each live swap.
 *
 * @param itemCount current number of rows
 * @param onReorder called with (from, to) whenever the drag should swap rows
 */
export function useDragReorder(itemCount: number, onReorder: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const startYRef = useRef(0);
  const pitchRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;
  const countRef = useRef(itemCount);
  countRef.current = itemCount;

  const setDragState = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const onGripPointerDown = useCallback((e: React.PointerEvent<HTMLElement>, index: number) => {
    // only the primary button / first finger starts a drag
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Row pitch = visual distance between two adjacent row slots. Measured here,
    // while no row carries a ghost offset yet. Only the row elements count — the
    // shared parent may hold headings or buttons with much smaller spacing, and
    // margins make the plain box height a lie.
    const rowEl = e.currentTarget.closest('[data-row-index]');
    if (!rowEl || !rowEl.parentElement) return;
    const tops = [...rowEl.parentElement.querySelectorAll('[data-row-index]')]
      .map((el) => el.getBoundingClientRect().top)
      .sort((a, b) => a - b);
    let pitch = 0;
    for (let k = 1; k < tops.length; k++) {
      const d = tops[k] - tops[k - 1];
      if (d > 0 && (pitch === 0 || d < pitch)) pitch = d;
    }
    if (pitch <= 0) return;
    e.preventDefault();
    pitchRef.current = pitch;
    startYRef.current = e.clientY;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ index, offsetY: 0 });
  }, []);

  const onGripPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state || e.pointerId !== pointerIdRef.current) return;
    const pitch = pitchRef.current;
    const offsetY = e.clientY - startYRef.current;
    let target = state.index + Math.round(offsetY / pitch);
    target = Math.max(0, Math.min(countRef.current - 1, target));
    if (target !== state.index) {
      reorderRef.current(state.index, target);
      // the row moved by (target - index) slots; reduce the visual offset by
      // the same distance so the ghost keeps sitting under the pointer
      const adjusted = offsetY - (target - state.index) * pitch;
      startYRef.current = e.clientY - adjusted;
      setDragState({ index: target, offsetY: adjusted });
    } else {
      setDragState({ ...state, offsetY });
    }
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current === null || e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setDragState(null);
  }, []);

  return {
    isDragging: drag !== null,
    /** translateY for the row currently grabbed (0 for all others). */
    dragOffsetY: (index: number) => (drag && drag.index === index ? drag.offsetY : 0),
    gripProps: (index: number) => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => onGripPointerDown(e, index),
      onPointerMove: onGripPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }),
  };
}
