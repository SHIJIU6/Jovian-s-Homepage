/**
 * Layout drag runtime.
 * Reference: W3C Pointer Events Level 4 and CSS Transforms Module Level 2 (`translate`).
 */

const MAX_OFFSET = 4096;
const DRAG_THRESHOLD = 6;
const JUST_DRAGGED_WINDOW = 180;
const handlers = new WeakMap();

let dragEnabled = false;

function clampOffset(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(numeric)));
}

function normalizePosition(position) {
  return {
    x: clampOffset(position?.x),
    y: clampOffset(position?.y),
  };
}

function shouldIgnorePointerDown(target) {
  return Boolean(
    target?.closest?.(
      'input, textarea, select, option, .edit-delete-btn, .image-upload-overlay, [data-layout-ignore-drag="true"]',
    ),
  );
}

function setElementPosition(element, position) {
  const { x, y } = normalizePosition(position);
  element.dataset.layoutX = String(x);
  element.dataset.layoutY = String(y);
  element.style.translate = `${x}px ${y}px`;
}

function getElementPosition(element) {
  return {
    x: clampOffset(element?.dataset?.layoutX),
    y: clampOffset(element?.dataset?.layoutY),
  };
}

function markDragged(element) {
  element.dataset.layoutDraggedAt = String(Date.now());
}

function wasJustDragged(element) {
  const draggedAt = Number(element?.dataset?.layoutDraggedAt || 0);
  return Date.now() - draggedAt < JUST_DRAGGED_WINDOW;
}

function attachDragHandlers(element) {
  if (!element || handlers.has(element)) return;

  const state = { session: null };

  const finishDrag = (event) => {
    const session = state.session;
    if (!session || session.pointerId !== event.pointerId) return;

    if (session.dragging) {
      markDragged(element);
      event.preventDefault();
    }

    if (session.promotedPosition) {
      element.style.position = session.originalPosition;
    }
    element.style.zIndex = session.originalZIndex;
    element.classList.remove("layout-dragging");
    document.body.classList.remove("layout-drag-in-progress");

    if (element.hasPointerCapture?.(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }

    state.session = null;
  };

  const onPointerDown = (event) => {
    if (!dragEnabled) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (shouldIgnorePointerDown(event.target)) return;
    if (event.target?.closest?.("[data-layout-id]") !== element) return;

    const computedStyle = window.getComputedStyle(element);
    const basePosition = getElementPosition(element);

    state.session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: basePosition.x,
      baseY: basePosition.y,
      dragging: false,
      originalPosition: element.style.position,
      originalZIndex: element.style.zIndex,
      promotedPosition: computedStyle.position === "static",
    };

    if (state.session.promotedPosition) {
      element.style.position = "relative";
    }

    element.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const session = state.session;
    if (!session || session.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;

    if (!session.dragging && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
      return;
    }

    if (!session.dragging) {
      session.dragging = true;
      element.style.zIndex = "90";
      element.classList.add("layout-dragging");
      document.body.classList.add("layout-drag-in-progress");
    }

    setElementPosition(element, {
      x: session.baseX + deltaX,
      y: session.baseY + deltaY,
    });

    event.preventDefault();
  };

  const onClickCapture = (event) => {
    if (!wasJustDragged(element)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", finishDrag);
  element.addEventListener("pointercancel", finishDrag);
  element.addEventListener("click", onClickCapture, true);

  handlers.set(element, {
    onPointerDown,
    onPointerMove,
    finishDrag,
    onClickCapture,
  });
}

function getLayoutPositions(layout) {
  if (!layout || typeof layout !== "object" || typeof layout.positions !== "object") {
    return {};
  }
  return layout.positions;
}

function assignRuntimeLayoutIds() {
  document.querySelectorAll('[data-editable="timeline"]').forEach((element, index) => {
    const id = element.dataset.id || `index-${index}`;
    element.dataset.layoutId = `timeline-${id}`;
  });

  document.querySelectorAll('[data-editable="site"]').forEach((element, index) => {
    const id = element.dataset.id || `index-${index}`;
    element.dataset.layoutId = `site-${id}`;
  });

  document.querySelectorAll('[data-editable="social"]').forEach((element, index) => {
    const id = element.dataset.id || `index-${index}`;
    element.dataset.layoutId = `social-${id}`;
  });

  document.querySelectorAll('[data-editable="tag"]').forEach((element, index) => {
    element.dataset.layoutId = `tag-${index}`;
  });
}

export function syncLayout(layout, { enabled = false } = {}) {
  dragEnabled = enabled;
  const positions = getLayoutPositions(layout);
  assignRuntimeLayoutIds();

  document.querySelectorAll("[data-layout-id]").forEach((element) => {
    attachDragHandlers(element);
    setElementPosition(element, positions[element.dataset.layoutId]);
    element.classList.toggle("layout-draggable", enabled);
  });
}

export function collectLayoutData() {
  const positions = {};

  document.querySelectorAll("[data-layout-id]").forEach((element) => {
    const { x, y } = getElementPosition(element);
    if (x === 0 && y === 0) return;
    positions[element.dataset.layoutId] = { x, y };
  });

  return { positions };
}
