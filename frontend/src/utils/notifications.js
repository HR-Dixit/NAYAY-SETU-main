const CURRENT_USER_KEY = "nayay-setu-current-user";
const NOTIFICATION_KEY_PREFIX = "nayay-setu-notifications";
const NOTIFICATION_EVENT = "nayay-notifications-updated";
const MAX_NOTIFICATIONS = 80;

function readCurrentUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getUserToken(user) {
  const selectedUser = user || readCurrentUser();
  if (!selectedUser || typeof selectedUser !== "object") return "guest";
  const token = String(selectedUser.email || selectedUser.username || "")
    .trim()
    .toLowerCase();
  return token || "guest";
}

export function getNotificationStorageKey(user) {
  return `${NOTIFICATION_KEY_PREFIX}:${getUserToken(user)}`;
}

function emitNotificationChange(storageKey) {
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, {
      detail: { storageKey },
    })
  );
}

export function readNotifications(user) {
  const storageKey = getNotificationStorageKey(user);
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: item.id,
        text: String(item.text || ""),
        read: Boolean(item.read),
        createdAt: Number(item.createdAt || Date.now()),
        type: String(item.type || "info"),
      }))
      .filter((item) => item.text);
  } catch {
    return [];
  }
}

function writeNotifications(list, user) {
  const storageKey = getNotificationStorageKey(user);
  localStorage.setItem(storageKey, JSON.stringify(list));
  emitNotificationChange(storageKey);
}

export function addNotification(text, options = {}) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return null;

  const user = options.user || null;
  const current = readNotifications(user);
  const next = [
    {
      id: options.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: cleanText,
      read: false,
      createdAt: Date.now(),
      type: options.type || "info",
    },
    ...current,
  ].slice(0, MAX_NOTIFICATIONS);

  writeNotifications(next, user);
  return next[0];
}

export function markAllNotificationsRead(user) {
  const current = readNotifications(user);
  if (!current.length) return;
  writeNotifications(
    current.map((item) => ({ ...item, read: true })),
    user
  );
}

export function markNotificationRead(notificationId, user) {
  const targetId = String(notificationId || "").trim();
  if (!targetId) return;
  const current = readNotifications(user);
  if (!current.length) return;
  const next = current.map((item) =>
    String(item.id) === targetId ? { ...item, read: true } : item
  );
  writeNotifications(next, user);
}

export function subscribeToNotifications(onChange) {
  if (typeof onChange !== "function") return () => {};

  const handleCustomEvent = () => {
    onChange();
  };
  const handleStorageEvent = (event) => {
    if (!event.key || !event.key.startsWith(NOTIFICATION_KEY_PREFIX)) return;
    onChange();
  };

  window.addEventListener(NOTIFICATION_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
