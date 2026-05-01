import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "auth-sessions.json");

function nowIso() {
  return new Date().toISOString();
}

function addMs(iso, ms) {
  const base = new Date(iso).getTime();
  return new Date(base + Math.max(60_000, Number(ms) || 0)).toISOString();
}

function hashRefreshToken(value = "") {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function toPublicSession(session) {
  return {
    id: session.id,
    userId: session.userId,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt || "",
    revokedReason: session.revokedReason || "",
    replacedBySessionId: session.replacedBySessionId || "",
    userAgent: session.userAgent || "",
    ip: session.ip || "",
  };
}

function isExpired(session, atMs = Date.now()) {
  const expiry = new Date(session?.expiresAt || "").getTime();
  return !Number.isFinite(expiry) || expiry <= atMs;
}

function isActive(session, atMs = Date.now()) {
  return Boolean(session) && !session.revokedAt && !isExpired(session, atMs);
}

function compactSessions(sessions = []) {
  const cutoffMs = Date.now() - 45 * 24 * 60 * 60 * 1000;
  return sessions
    .filter((item) => {
      const expiresMs = new Date(item?.expiresAt || "").getTime();
      const revokedMs = new Date(item?.revokedAt || "").getTime();
      if (Number.isFinite(expiresMs) && expiresMs > cutoffMs) return true;
      if (Number.isFinite(revokedMs) && revokedMs > cutoffMs) return true;
      return false;
    })
    .slice(-5000);
}

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify({ sessions: [] }, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const sessions = Array.isArray(parsed?.sessions) ? parsed.sessions : [];
    return { sessions };
  } catch {
    const fallback = { sessions: [] };
    await fs.writeFile(DB_FILE, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeDb(nextDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const sessions = compactSessions(Array.isArray(nextDb?.sessions) ? nextDb.sessions : []);
  await fs.writeFile(DB_FILE, JSON.stringify({ sessions }, null, 2), "utf8");
}

function buildSession({ userId, tokenHash, ttlMs, userAgent = "", ip = "" }) {
  const issuedAt = nowIso();
  return {
    id: `session-${Date.now()}-${randomBytes(4).toString("hex")}`,
    userId: String(userId || "").trim(),
    tokenHash,
    issuedAt,
    expiresAt: addMs(issuedAt, ttlMs),
    revokedAt: "",
    revokedReason: "",
    replacedBySessionId: "",
    userAgent: String(userAgent || "").trim().slice(0, 220),
    ip: String(ip || "").trim().slice(0, 80),
  };
}

function createRefreshToken() {
  return randomBytes(48).toString("hex");
}

function makeStoreError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function issueRefreshSession({ userId, ttlMs, userAgent = "", ip = "" }) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw makeStoreError("User id is required for refresh session.", "INVALID_USER");
  }

  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const db = await readDb();
  const session = buildSession({
    userId: normalizedUserId,
    tokenHash,
    ttlMs,
    userAgent,
    ip,
  });

  db.sessions.push(session);
  await writeDb(db);

  return {
    refreshToken,
    session: toPublicSession(session),
  };
}

export async function rotateRefreshSession({ refreshToken, ttlMs, userAgent = "", ip = "" }) {
  const tokenHash = hashRefreshToken(refreshToken);
  const db = await readDb();
  const index = db.sessions.findIndex((item) => item.tokenHash === tokenHash);
  if (index === -1) {
    throw makeStoreError("Refresh session was not found.", "REFRESH_NOT_FOUND");
  }

  const existing = db.sessions[index];
  if (existing.revokedAt) {
    throw makeStoreError("Refresh session is already revoked.", "REFRESH_REVOKED");
  }
  if (isExpired(existing)) {
    db.sessions[index] = {
      ...existing,
      revokedAt: existing.revokedAt || nowIso(),
      revokedReason: existing.revokedReason || "expired",
    };
    await writeDb(db);
    throw makeStoreError("Refresh session expired.", "REFRESH_EXPIRED");
  }

  const nextToken = createRefreshToken();
  const nextSession = buildSession({
    userId: existing.userId,
    tokenHash: hashRefreshToken(nextToken),
    ttlMs,
    userAgent,
    ip,
  });

  db.sessions[index] = {
    ...existing,
    revokedAt: nowIso(),
    revokedReason: "rotated",
    replacedBySessionId: nextSession.id,
  };
  db.sessions.push(nextSession);
  await writeDb(db);

  return {
    userId: existing.userId,
    refreshToken: nextToken,
    session: toPublicSession(nextSession),
  };
}

export async function revokeRefreshSession(refreshToken, reason = "logout") {
  const token = String(refreshToken || "").trim();
  if (!token) {
    return { revoked: false, reason: "missing_token" };
  }

  const tokenHash = hashRefreshToken(token);
  const db = await readDb();
  const index = db.sessions.findIndex((item) => item.tokenHash === tokenHash);
  if (index === -1) {
    return { revoked: false, reason: "not_found" };
  }

  const session = db.sessions[index];
  if (!isActive(session)) {
    return {
      revoked: false,
      reason: session.revokedAt ? "already_revoked" : "expired",
      userId: session.userId,
      sessionId: session.id,
    };
  }

  db.sessions[index] = {
    ...session,
    revokedAt: nowIso(),
    revokedReason: String(reason || "logout").slice(0, 80),
  };
  await writeDb(db);

  return {
    revoked: true,
    userId: session.userId,
    sessionId: session.id,
  };
}

export async function revokeAllRefreshSessionsForUser(userId, reason = "logout_all") {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    return { revokedCount: 0 };
  }

  const db = await readDb();
  let revokedCount = 0;
  db.sessions = db.sessions.map((session) => {
    if (String(session?.userId || "") !== normalizedUserId) return session;
    if (!isActive(session)) return session;
    revokedCount += 1;
    return {
      ...session,
      revokedAt: nowIso(),
      revokedReason: String(reason || "logout_all").slice(0, 80),
    };
  });

  if (revokedCount > 0) {
    await writeDb(db);
  }

  return { revokedCount };
}

export async function listRefreshSessionsForUser(userId, limit = 20) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return [];

  const db = await readDb();
  return db.sessions
    .filter((session) => String(session?.userId || "") === normalizedUserId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
    .slice(0, Math.max(1, Number(limit) || 20))
    .map((session) => toPublicSession(session));
}
