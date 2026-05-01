import {
  clearAuthSession,
  readAuthTokenFromStorage,
  readRefreshTokenFromStorage,
  saveAuthSession,
} from "../utils/authSession";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

let refreshRequest = null;

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function readResponsePayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function toErrorMessage(payload, fallback) {
  if (payload && typeof payload === "object") {
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (typeof payload.raw === "string" && payload.raw.trim()) return payload.raw;
  }
  return fallback;
}

async function refreshAuthSession() {
  const refreshToken = readRefreshTokenFromStorage();
  if (!refreshToken) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetchJson("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
        skipAutoRefresh: true,
      });
      const user = response?.user || null;
      const accessToken = response?.accessToken || "";
      const nextRefreshToken = response?.refreshToken || "";
      if (!user || !accessToken || !nextRefreshToken) {
        throw new Error("Invalid session refresh response.");
      }
      saveAuthSession({
        user,
        accessToken,
        refreshToken: nextRefreshToken,
      });
      return response;
    })()
      .catch((error) => {
        clearAuthSession();
        throw error;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

async function fetchJson(path, options = {}) {
  const {
    skipAuth = false,
    skipAutoRefresh = false,
    retryOnAuthFailure = true,
    timeoutMs = 15000,
    ...fetchOptions
  } = options;
  const token = skipAuth ? "" : readAuthTokenFromStorage();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions.headers || {}),
      },
      signal: controller.signal,
    });

    if (response.status === 401 && !skipAuth && !skipAutoRefresh && retryOnAuthFailure) {
      await refreshAuthSession();
      return fetchJson(path, {
        ...options,
        retryOnAuthFailure: false,
      });
    }

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      throw new Error(toErrorMessage(payload, `Request failed with ${response.status}`));
    }

    return payload;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function authRegister(payload) {
  return fetchJson("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
    skipAutoRefresh: true,
  });
}

export async function authLogin(payload) {
  return fetchJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
    skipAutoRefresh: true,
  });
}

export async function authSocial(payload) {
  return fetchJson("/api/auth/social", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
    skipAutoRefresh: true,
  });
}

export async function authGoogle(payload) {
  return fetchJson("/api/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
    skipAutoRefresh: true,
  });
}

export async function authRefresh() {
  return refreshAuthSession();
}

export async function authMe() {
  return fetchJson("/api/auth/me", {
    method: "GET",
  });
}

export async function authLogout() {
  const refreshToken = readRefreshTokenFromStorage();
  return fetchJson("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    skipAuth: true,
    skipAutoRefresh: true,
  });
}

export async function authLogoutAll() {
  return fetchJson("/api/auth/logout-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function fetchAuthSessions() {
  return fetchJson("/api/auth/sessions", {
    method: "GET",
  });
}

export async function queryLegalAssistant(payload) {
  return fetchJson("/api/assistant/query", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 35000,
  });
}

function parseNdjsonLine(rawLine) {
  const line = String(rawLine || "").trim();
  if (!line) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

async function openAssistantStreamRequest(payload, token, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(buildApiUrl("/api/assistant/query/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      response,
      cleanup: () => clearTimeout(timeoutId),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function queryLegalAssistantStream(payload, { onEvent } = {}) {
  const timeoutMs = 45_000;
  let token = readAuthTokenFromStorage();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { response, cleanup } = await openAssistantStreamRequest(payload, token, timeoutMs);
    try {
      if (response.status === 401 && attempt === 0) {
        await refreshAuthSession();
        token = readAuthTokenFromStorage();
        continue;
      }

      if (!response.ok) {
        const payloadError = await readResponsePayload(response);
        throw new Error(toErrorMessage(payloadError, `Request failed with ${response.status}`));
      }

      if (!response.body) {
        throw new Error("Assistant stream is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");

          const event = parseNdjsonLine(line);
          if (!event) continue;
          onEvent?.(event);

          if (event.type === "error") {
            throw new Error(String(event.message || "Assistant stream failed."));
          }
          if (event.type === "result") {
            finalResult = {
              mode: event.mode || "local",
              answer: event.answer || {},
              sources: Array.isArray(event.sources) ? event.sources : [],
              attachmentInsights: Array.isArray(event.attachmentInsights)
                ? event.attachmentInsights
                : [],
              error: event.error || "",
            };
          }
        }
      }

      const trailing = parseNdjsonLine(buffer);
      if (trailing) {
        onEvent?.(trailing);
        if (trailing.type === "result") {
          finalResult = {
            mode: trailing.mode || "local",
            answer: trailing.answer || {},
            sources: Array.isArray(trailing.sources) ? trailing.sources : [],
            attachmentInsights: Array.isArray(trailing.attachmentInsights)
              ? trailing.attachmentInsights
              : [],
            error: trailing.error || "",
          };
        }
      }

      return (
        finalResult || {
          mode: "local",
          answer: {},
          sources: [],
          attachmentInsights: [],
        }
      );
    } finally {
      cleanup();
    }
  }

  throw new Error("Session expired. Please log in again.");
}

export async function searchOnlineLawyers({
  query = "",
  state = "",
  district = "",
  field = "",
} = {}) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("query", query.trim());
  if (state.trim()) params.set("state", state.trim());
  if (district.trim()) params.set("district", district.trim());
  if (field.trim()) params.set("field", field.trim());

  return fetchJson(`/api/lawyers/search?${params.toString()}`);
}

export async function searchRightsOnline(query) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("query", query.trim());

  return fetchJson(`/api/rights/search?${params.toString()}`);
}

export async function fetchCommunityData(search = "") {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  const query = params.toString();
  return fetchJson(`/api/community${query ? `?${query}` : ""}`);
}

export async function createCommunityDiscussion(payload) {
  return fetchJson("/api/community/discussions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function upvoteCommunityDiscussion(discussionId) {
  return fetchJson(`/api/community/discussions/${encodeURIComponent(discussionId)}/upvote`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function addCommunityComment(discussionId, payload) {
  return fetchJson(`/api/community/discussions/${encodeURIComponent(discussionId)}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reportCommunityDiscussion(discussionId, payload = {}) {
  return fetchJson(`/api/community/discussions/${encodeURIComponent(discussionId)}/report`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reportCommunityComment(discussionId, commentId, payload = {}) {
  return fetchJson(
    `/api/community/discussions/${encodeURIComponent(discussionId)}/comments/${encodeURIComponent(commentId)}/report`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchCompliancePolicy() {
  return fetchJson("/api/compliance/policy");
}

export async function fetchJusticeServices() {
  return fetchJson("/api/justice/services");
}

export async function routeJusticeQuery(payload) {
  return fetchJson("/api/justice/route", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyOfficialLink(url) {
  const params = new URLSearchParams();
  if (String(url || "").trim()) params.set("url", String(url).trim());
  return fetchJson(`/api/justice/link/verify?${params.toString()}`);
}

export async function fetchLegalAidChannels() {
  return fetchJson("/api/justice/legal-aid");
}

export async function fetchNjdgInsights() {
  return fetchJson("/api/justice/njdg-insights");
}

export async function generateJusticeCasePlan(payload) {
  return fetchJson("/api/justice/case-plan", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 30000,
  });
}

export async function fetchJusticeDesk(userId) {
  if (userId) {
    return fetchJson(`/api/justice/desk/${encodeURIComponent(userId)}`);
  }
  return fetchJson("/api/justice/desk/me");
}

export async function createJusticeCase(userId, payload) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/cases`
    : "/api/justice/desk/me/cases";
  return fetchJson(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchJusticeCase(userId, caseId, payload) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/cases/${encodeURIComponent(caseId)}`
    : `/api/justice/desk/me/cases/${encodeURIComponent(caseId)}`;
  return fetchJson(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeJusticeCase(userId, caseId) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/cases/${encodeURIComponent(caseId)}`
    : `/api/justice/desk/me/cases/${encodeURIComponent(caseId)}`;
  return fetchJson(path, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function createJusticeReminder(userId, payload) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/reminders`
    : "/api/justice/desk/me/reminders";
  return fetchJson(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function patchJusticeReminder(userId, reminderId, payload) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/reminders/${encodeURIComponent(reminderId)}`
    : `/api/justice/desk/me/reminders/${encodeURIComponent(reminderId)}`;
  return fetchJson(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeJusticeReminder(userId, reminderId) {
  const path = userId
    ? `/api/justice/desk/${encodeURIComponent(userId)}/reminders/${encodeURIComponent(reminderId)}`
    : `/api/justice/desk/me/reminders/${encodeURIComponent(reminderId)}`;
  return fetchJson(path, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function fetchAdminPolicyManager() {
  return fetchJson("/api/admin/policies", {
    method: "GET",
  });
}

export async function publishAdminPolicyVersion(payload) {
  return fetchJson("/api/admin/policies/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function activateAdminPolicyVersion(versionId, note = "") {
  return fetchJson(`/api/admin/policies/activate/${encodeURIComponent(versionId)}`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function fetchAdminCommunityReviewQueue() {
  return fetchJson("/api/admin/community/review-queue", {
    method: "GET",
  });
}

export async function reviewAdminCommunityItem(payload) {
  return fetchJson("/api/admin/community/review", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
