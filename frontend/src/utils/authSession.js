export const CURRENT_USER_KEY = "nayay-setu-current-user";
export const AUTH_TOKEN_KEY = "nayay-setu-auth-token";
export const REFRESH_TOKEN_KEY = "nayay-setu-refresh-token";

export function readCurrentUserFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...parsed,
      role: parsed.role || "user",
    };
  } catch {
    return null;
  }
}

export function readAuthTokenFromStorage() {
  return String(localStorage.getItem(AUTH_TOKEN_KEY) || "").trim();
}

export function readRefreshTokenFromStorage() {
  return String(localStorage.getItem(REFRESH_TOKEN_KEY) || "").trim();
}

export function saveAuthSession({ user, accessToken, refreshToken }) {
  if (user && typeof user === "object") {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
  if (String(accessToken || "").trim()) {
    localStorage.setItem(AUTH_TOKEN_KEY, String(accessToken).trim());
  }
  if (String(refreshToken || "").trim()) {
    localStorage.setItem(REFRESH_TOKEN_KEY, String(refreshToken).trim());
  }
  window.dispatchEvent(new Event("auth-updated"));
}

export function clearAuthSession() {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("auth-updated"));
}
