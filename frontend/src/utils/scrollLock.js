const LOCK_CLASS = "modal-scroll-lock";

function getLockCount() {
  return Number(window.__nyayaScrollLockCount || 0);
}

export function lockBodyScroll() {
  const nextCount = getLockCount() + 1;
  window.__nyayaScrollLockCount = nextCount;
  if (nextCount === 1) {
    document.body.classList.add(LOCK_CLASS);
  }
}

export function unlockBodyScroll() {
  const nextCount = Math.max(getLockCount() - 1, 0);
  window.__nyayaScrollLockCount = nextCount;
  if (nextCount === 0) {
    document.body.classList.remove(LOCK_CLASS);
  }
}
