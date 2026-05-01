import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "justice-desk-db.json");

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "nayay_setu";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION_JUSTICE_DESK || "justice_desks";

let mongoClientPromise = null;
let mongoCollectionPromise = null;
let lastStoreMode = "file";

const INITIAL_DB = {
  users: {},
};

function nowIso() {
  return new Date().toISOString();
}

function sanitizeUserId(value = "") {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || "guest";
}

function normalizeCaseItem(item = {}, fallbackIndex = 0) {
  const id =
    String(item.id || "").trim() ||
    `case-${Date.now()}-${Math.max(0, Number(fallbackIndex || 0))}`;
  return {
    id,
    title: String(item.title || "").trim() || "Untitled Case",
    cnrNumber: String(item.cnrNumber || "").trim(),
    court: String(item.court || "").trim(),
    status: String(item.status || "").trim() || "Open",
    nextHearingDate: String(item.nextHearingDate || "").trim(),
    notes: String(item.notes || "").trim(),
    aiPlan: String(item.aiPlan || "").trim(),
    createdAt: String(item.createdAt || nowIso()),
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  };
}

function normalizeReminder(item = {}, fallbackIndex = 0) {
  const id =
    String(item.id || "").trim() ||
    `reminder-${Date.now()}-${Math.max(0, Number(fallbackIndex || 0))}`;
  return {
    id,
    title: String(item.title || "").trim() || "Reminder",
    dueDate: String(item.dueDate || "").trim(),
    done: Boolean(item.done),
    channel: String(item.channel || "").trim() || "in-app",
    createdAt: String(item.createdAt || nowIso()),
    updatedAt: String(item.updatedAt || item.createdAt || nowIso()),
  };
}

function normalizeDeskDoc(doc = {}, userId = "guest") {
  const cases = Array.isArray(doc.cases) ? doc.cases : [];
  const reminders = Array.isArray(doc.reminders) ? doc.reminders : [];
  return {
    userId: sanitizeUserId(doc.userId || userId),
    cases: cases.map((item, index) => normalizeCaseItem(item, index)),
    reminders: reminders.map((item, index) => normalizeReminder(item, index)),
    updatedAt: String(doc.updatedAt || nowIso()),
  };
}

async function ensureFileDb() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
  }
}

async function readFileDb() {
  await ensureFileDb();
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const users = parsed?.users && typeof parsed.users === "object" ? parsed.users : {};
    return { users };
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf8");
    return { users: {} };
  }
}

async function writeFileDb(nextDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(nextDb, null, 2), "utf8");
}

async function getMongoCollection() {
  if (!MONGODB_URI) return null;

  if (!mongoCollectionPromise) {
    mongoCollectionPromise = (async () => {
      try {
        if (!mongoClientPromise) {
          const { MongoClient } = await import("mongodb");
          const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 2000,
          });
          mongoClientPromise = client.connect();
        }
        const client = await mongoClientPromise;
        return client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
      } catch {
        mongoCollectionPromise = null;
        return null;
      }
    })();
  }

  return mongoCollectionPromise;
}

async function readDesk(userId) {
  const cleanUserId = sanitizeUserId(userId);
  const collection = await getMongoCollection();

  if (collection) {
    try {
      const doc = await collection.findOne({ _id: cleanUserId });
      lastStoreMode = "mongo";
      if (!doc) return normalizeDeskDoc({ userId: cleanUserId }, cleanUserId);
      return normalizeDeskDoc(
        {
          userId: cleanUserId,
          cases: doc.cases,
          reminders: doc.reminders,
          updatedAt: doc.updatedAt,
        },
        cleanUserId
      );
    } catch {
      lastStoreMode = "file";
    }
  }

  const db = await readFileDb();
  const record = db.users[cleanUserId] || { userId: cleanUserId, cases: [], reminders: [] };
  lastStoreMode = "file";
  return normalizeDeskDoc(record, cleanUserId);
}

async function writeDesk(userId, nextDesk) {
  const cleanUserId = sanitizeUserId(userId);
  const payload = normalizeDeskDoc(nextDesk, cleanUserId);
  payload.updatedAt = nowIso();

  const collection = await getMongoCollection();
  if (collection) {
    try {
      await collection.updateOne(
        { _id: cleanUserId },
        {
          $set: {
            userId: cleanUserId,
            cases: payload.cases,
            reminders: payload.reminders,
            updatedAt: payload.updatedAt,
          },
        },
        { upsert: true }
      );
      lastStoreMode = "mongo";
      return payload;
    } catch {
      lastStoreMode = "file";
    }
  }

  const db = await readFileDb();
  db.users[cleanUserId] = payload;
  await writeFileDb(db);
  lastStoreMode = "file";
  return payload;
}

async function updateDesk(userId, mutateFn) {
  const current = await readDesk(userId);
  const draft = normalizeDeskDoc(current, userId);
  mutateFn(draft);
  return writeDesk(userId, draft);
}

export async function getJusticeDesk(userId) {
  const desk = await readDesk(userId);
  return {
    ...desk,
    storeMode: lastStoreMode,
  };
}

export async function addJusticeCase(userId, payload) {
  const clean = normalizeCaseItem(payload);
  const desk = await updateDesk(userId, (draft) => {
    draft.cases = [clean, ...draft.cases];
  });
  return { case: clean, desk };
}

export async function updateJusticeCase(userId, caseId, patch) {
  const targetId = String(caseId || "").trim();
  const desk = await updateDesk(userId, (draft) => {
    draft.cases = draft.cases.map((item) => {
      if (item.id !== targetId) return item;
      return normalizeCaseItem(
        {
          ...item,
          ...patch,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: nowIso(),
        },
        0
      );
    });
  });

  const updated = desk.cases.find((item) => item.id === targetId) || null;
  return { case: updated, desk };
}

export async function deleteJusticeCase(userId, caseId) {
  const targetId = String(caseId || "").trim();
  const desk = await updateDesk(userId, (draft) => {
    draft.cases = draft.cases.filter((item) => item.id !== targetId);
  });
  return { desk };
}

export async function addJusticeReminder(userId, payload) {
  const clean = normalizeReminder(payload);
  const desk = await updateDesk(userId, (draft) => {
    draft.reminders = [clean, ...draft.reminders];
  });
  return { reminder: clean, desk };
}

export async function updateJusticeReminder(userId, reminderId, patch) {
  const targetId = String(reminderId || "").trim();
  const desk = await updateDesk(userId, (draft) => {
    draft.reminders = draft.reminders.map((item) => {
      if (item.id !== targetId) return item;
      return normalizeReminder(
        {
          ...item,
          ...patch,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: nowIso(),
        },
        0
      );
    });
  });

  const updated = desk.reminders.find((item) => item.id === targetId) || null;
  return { reminder: updated, desk };
}

export async function deleteJusticeReminder(userId, reminderId) {
  const targetId = String(reminderId || "").trim();
  const desk = await updateDesk(userId, (draft) => {
    draft.reminders = draft.reminders.filter((item) => item.id !== targetId);
  });
  return { desk };
}

export function getJusticeDeskStoreMode() {
  return lastStoreMode;
}

export function normalizeDeskUserId(value) {
  return sanitizeUserId(value);
}
