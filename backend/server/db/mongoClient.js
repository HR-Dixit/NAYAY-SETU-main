const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "nayay_setu";

let mongoClientPromise = null;
let mongoDbPromise = null;

export function isMongoConfigured() {
  return Boolean(String(MONGODB_URI || "").trim());
}

export function getMongoConfig() {
  return {
    uriConfigured: isMongoConfigured(),
    dbName: MONGODB_DB_NAME,
  };
}

export async function getMongoClient() {
  if (!isMongoConfigured()) return null;

  if (!mongoClientPromise) {
    mongoClientPromise = (async () => {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 2500,
      });
      await client.connect();
      return client;
    })().catch((error) => {
      mongoClientPromise = null;
      throw error;
    });
  }

  return mongoClientPromise;
}

export async function getMongoDb() {
  if (!isMongoConfigured()) return null;

  if (!mongoDbPromise) {
    mongoDbPromise = (async () => {
      const client = await getMongoClient();
      if (!client) return null;
      return client.db(MONGODB_DB_NAME);
    })().catch((error) => {
      mongoDbPromise = null;
      throw error;
    });
  }

  return mongoDbPromise;
}

export async function getMongoCollection(name) {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection(String(name || "").trim());
}
