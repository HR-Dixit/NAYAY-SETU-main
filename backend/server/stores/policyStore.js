import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "policy-store.json");

const DEFAULT_POLICY_CONTENT = {
  terms: [
    "NAYAY-SETU provides legal information and workflow assistance, not formal legal advice.",
    "Users must verify filings, orders, and final actions on official judiciary portals before proceeding.",
    "You must not upload unlawful, malicious, or forged content to this platform.",
    "Platform features may assist but do not guarantee legal outcomes.",
  ],
  privacy: [
    "We collect only minimum account and workflow data required to provide services.",
    "Sensitive legal data should be shared only when required for your case workflow.",
    "Access to user data is role-restricted and authenticated via secure session tokens.",
    "Users can request account-data correction or deletion via support workflow.",
  ],
  retention: [
    "Case tracker and reminder data is retained only for active account operation and support continuity.",
    "Users may request deletion of personal desk records; removal requests are processed in planned maintenance windows.",
    "Security and audit logs may be retained for limited compliance and incident-response periods.",
    "Data retention policies will be updated as statutory requirements evolve.",
  ],
};

function nowIso() {
  return new Date().toISOString();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${randomBytes(3).toString("hex")}`;
}

function sanitizeText(value = "", max = 2000) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, Math.max(1, Number(max) || 2000));
}

function normalizeParagraphs(value, fallback = [], maxCount = 16, maxLen = 500) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\n+/)
        .map((item) => item.replace(/^[-*\u2022\d.\s]+/, "").trim())
        .filter(Boolean);

  const normalized = source
    .map((item) => sanitizeText(item, maxLen))
    .filter(Boolean)
    .slice(0, maxCount);

  if (normalized.length > 0) return normalized;
  return Array.isArray(fallback) ? fallback.slice(0, maxCount) : [];
}

function toPublicVersion(version, includeContent) {
  if (!version) return null;
  const base = {
    id: version.id,
    versionLabel: version.versionLabel,
    status: version.status,
    effectiveFrom: version.effectiveFrom,
    note: version.note,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
  };
  if (!includeContent) return base;
  return {
    ...base,
    terms: Array.isArray(version.terms) ? version.terms : [],
    privacy: Array.isArray(version.privacy) ? version.privacy : [],
    retention: Array.isArray(version.retention) ? version.retention : [],
  };
}

function toPublicAudit(entry) {
  return {
    id: entry.id,
    at: entry.at,
    action: entry.action,
    actor: entry.actor,
    target: entry.target,
    details: entry.details,
  };
}

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const createdAt = nowIso();
    const versionId = "policy-v1";
    const seed = {
      activeVersionId: versionId,
      versions: [
        {
          id: versionId,
          versionLabel: "v1.0.0",
          status: "active",
          effectiveFrom: todayIso(),
          note: "Initial production baseline.",
          createdAt,
          createdBy: "System",
          terms: DEFAULT_POLICY_CONTENT.terms,
          privacy: DEFAULT_POLICY_CONTENT.privacy,
          retention: DEFAULT_POLICY_CONTENT.retention,
        },
      ],
      audit: [
        {
          id: makeId("policy-audit"),
          at: createdAt,
          action: "Seeded policy baseline",
          actor: "System",
          target: "v1.0.0",
          details: "Initial legal policy content created.",
        },
      ],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      activeVersionId: String(parsed?.activeVersionId || "").trim(),
      versions: Array.isArray(parsed?.versions) ? parsed.versions : [],
      audit: Array.isArray(parsed?.audit) ? parsed.audit : [],
    };
  } catch {
    const fallback = {
      activeVersionId: "",
      versions: [],
      audit: [],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(fallback, null, 2), "utf8");
    return fallback;
  }
}

async function writeDb(nextDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const compactAudit = (Array.isArray(nextDb?.audit) ? nextDb.audit : []).slice(0, 1000);
  const versions = Array.isArray(nextDb?.versions) ? nextDb.versions : [];
  await fs.writeFile(
    DB_FILE,
    JSON.stringify(
      {
        activeVersionId: String(nextDb?.activeVersionId || "").trim(),
        versions,
        audit: compactAudit,
      },
      null,
      2
    ),
    "utf8"
  );
}

function appendAudit(db, { action, actor, target, details }) {
  db.audit = [
    {
      id: makeId("policy-audit"),
      at: nowIso(),
      action: sanitizeText(action, 120),
      actor: sanitizeText(actor || "Unknown", 120),
      target: sanitizeText(target || "Policy", 140),
      details: sanitizeText(details || "", 500),
    },
    ...(Array.isArray(db.audit) ? db.audit : []),
  ].slice(0, 1000);
}

export async function getActivePolicyVersion() {
  const db = await readDb();
  const active =
    db.versions.find((item) => item.id === db.activeVersionId) ||
    db.versions.find((item) => item.status === "active") ||
    db.versions[0] ||
    null;

  return {
    activeVersion: toPublicVersion(active, true),
    activeVersionId: active?.id || "",
  };
}

export async function listPolicyVersions({ includeContent = false } = {}) {
  const db = await readDb();
  const versions = db.versions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((item) => toPublicVersion(item, includeContent));

  return {
    activeVersionId: db.activeVersionId,
    versions,
  };
}

export async function listPolicyAudit(limit = 120) {
  const db = await readDb();
  const max = Math.max(1, Math.min(500, Number(limit) || 120));
  return db.audit.slice(0, max).map((item) => toPublicAudit(item));
}

export async function publishPolicyVersion({
  versionLabel,
  effectiveFrom,
  note,
  terms,
  privacy,
  retention,
  actor,
}) {
  const db = await readDb();
  const current =
    db.versions.find((item) => item.id === db.activeVersionId) ||
    db.versions.find((item) => item.status === "active") ||
    null;

  const nextVersion = {
    id: makeId("policy-version"),
    versionLabel:
      sanitizeText(versionLabel, 40) || `v${db.versions.length + 1}.0.${new Date().getFullYear()}`,
    status: "active",
    effectiveFrom: sanitizeText(effectiveFrom, 20) || todayIso(),
    note: sanitizeText(note, 240),
    createdAt: nowIso(),
    createdBy: sanitizeText(actor || "Admin", 120),
    terms: normalizeParagraphs(terms, current?.terms || DEFAULT_POLICY_CONTENT.terms),
    privacy: normalizeParagraphs(privacy, current?.privacy || DEFAULT_POLICY_CONTENT.privacy),
    retention: normalizeParagraphs(retention, current?.retention || DEFAULT_POLICY_CONTENT.retention),
  };

  db.versions = db.versions.map((item) => ({
    ...item,
    status: item.id === nextVersion.id ? "active" : item.id === db.activeVersionId ? "archived" : item.status,
  }));
  db.versions.unshift(nextVersion);
  db.activeVersionId = nextVersion.id;

  appendAudit(db, {
    action: "Published policy version",
    actor: nextVersion.createdBy,
    target: nextVersion.versionLabel,
    details: nextVersion.note || "New policy version published and activated.",
  });

  await writeDb(db);

  return {
    activeVersionId: db.activeVersionId,
    version: toPublicVersion(nextVersion, true),
  };
}

export async function activatePolicyVersion({ versionId, note, actor }) {
  const targetId = String(versionId || "").trim();
  if (!targetId) {
    throw new Error("Version id is required.");
  }

  const db = await readDb();
  const target = db.versions.find((item) => item.id === targetId);
  if (!target) {
    throw new Error("Policy version not found.");
  }

  db.versions = db.versions.map((item) => ({
    ...item,
    status: item.id === targetId ? "active" : item.id === db.activeVersionId ? "archived" : item.status,
  }));
  db.activeVersionId = targetId;

  appendAudit(db, {
    action: "Activated policy version",
    actor: sanitizeText(actor || "Admin", 120),
    target: sanitizeText(target.versionLabel || target.id, 120),
    details: sanitizeText(note || "Activated from admin dashboard.", 280),
  });

  await writeDb(db);

  return {
    activeVersionId: db.activeVersionId,
    version: toPublicVersion(
      db.versions.find((item) => item.id === targetId),
      true
    ),
  };
}
