import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "auth-users.json");

const DEFAULT_USERS = [
  {
    id: "user-demo-user",
    username: "demo_user",
    displayName: "Demo User",
    email: "user@nayaysetu.in",
    role: "user",
    password: "User@123",
  },
  {
    id: "user-demo-lawyer",
    username: "demo_lawyer",
    displayName: "Demo Lawyer",
    email: "lawyer@nayaysetu.in",
    role: "lawyer",
    password: "Lawyer@123",
  },
  {
    id: "user-demo-admin",
    username: "demo_admin",
    displayName: "Abhishek Yadav",
    email: "admin@nayaysetu.in",
    role: "admin",
    password: "Admin@123",
  },
];

function normalizeIdentifier(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

export function sanitizeUsername(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

export function sanitizeEmail(value = "") {
  return normalizeIdentifier(value);
}

function sanitizeDisplayName(value = "") {
  return String(value || "").trim().slice(0, 80);
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role || "user",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(String(password || ""), salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, passwordHash = "") {
  const [salt, hashHex] = String(passwordHash || "").split(":");
  if (!salt || !hashHex) return false;
  const stored = Buffer.from(hashHex, "hex");
  const candidate = Buffer.from(await scrypt(String(password || ""), salt, 64));
  if (stored.length !== candidate.length) return false;
  return timingSafeEqual(stored, candidate);
}

async function ensureDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const seeded = await Promise.all(
      DEFAULT_USERS.map(async (item) => ({
        id: item.id,
        username: sanitizeUsername(item.username),
        displayName: item.displayName,
        email: sanitizeEmail(item.email),
        role: item.role,
        passwordHash: await hashPassword(item.password),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }))
    );
    await fs.writeFile(
      DB_FILE,
      JSON.stringify({ users: seeded }, null, 2),
      "utf8"
    );
  }
}

async function readDb() {
  await ensureDb();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const users = Array.isArray(parsed?.users) ? parsed.users : [];
    return { users };
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
    return { users: [] };
  }
}

async function writeDb(nextDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(nextDb, null, 2), "utf8");
}

export async function findAuthUserByIdentifier(identifier = "") {
  const target = normalizeIdentifier(identifier);
  if (!target) return null;
  const db = await readDb();
  return (
    db.users.find(
      (item) =>
        normalizeIdentifier(item.email) === target ||
        normalizeIdentifier(item.username) === target
    ) || null
  );
}

export async function findPublicAuthUserByIdentifier(identifier = "") {
  const user = await findAuthUserByIdentifier(identifier);
  return user ? toPublicUser(user) : null;
}

export async function findAuthUserById(userId = "") {
  const target = String(userId || "").trim();
  if (!target) return null;
  const db = await readDb();
  return db.users.find((item) => String(item.id || "") === target) || null;
}

export async function registerAuthUser({
  username,
  displayName,
  email,
  password,
  role = "user",
}) {
  const cleanUsername = sanitizeUsername(username);
  const cleanEmail = sanitizeEmail(email);
  const cleanDisplayName =
    sanitizeDisplayName(displayName) || cleanUsername || cleanEmail;
  const cleanRole = ["user", "lawyer", "admin"].includes(role) ? role : "user";

  const db = await readDb();
  const exists = db.users.some(
    (item) =>
      normalizeIdentifier(item.email) === cleanEmail ||
      normalizeIdentifier(item.username) === cleanUsername
  );
  if (exists) {
    throw new Error("Username or email already exists.");
  }

  const createdAt = nowIso();
  const user = {
    id: `user-${Date.now()}-${randomBytes(3).toString("hex")}`,
    username: cleanUsername,
    displayName: cleanDisplayName,
    email: cleanEmail,
    role: cleanRole,
    passwordHash: await hashPassword(password),
    createdAt,
    updatedAt: createdAt,
  };

  db.users.push(user);
  await writeDb(db);
  return toPublicUser(user);
}

export async function validateAuthCredentials(identifier, password) {
  const user = await findAuthUserByIdentifier(identifier);
  if (!user) return null;
  const passOk = await verifyPassword(password, user.passwordHash);
  if (!passOk) return null;
  return toPublicUser(user);
}

export async function listPublicAuthUsers() {
  const db = await readDb();
  return db.users.map((item) => toPublicUser(item));
}

export async function updateAuthUserRole(userId, role) {
  const cleanRole = ["user", "lawyer", "admin"].includes(role) ? role : "user";
  const db = await readDb();
  const index = db.users.findIndex((item) => String(item.id || "") === String(userId || ""));
  if (index === -1) return null;
  db.users[index] = {
    ...db.users[index],
    role: cleanRole,
    updatedAt: nowIso(),
  };
  await writeDb(db);
  return toPublicUser(db.users[index]);
}

export async function getPublicUserById(userId) {
  const user = await findAuthUserById(userId);
  return user ? toPublicUser(user) : null;
}
