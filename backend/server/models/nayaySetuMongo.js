import { getMongoCollection, getMongoDb, isMongoConfigured } from "../db/mongoClient.js";

export const NAYAY_COLLECTIONS = {
  USERS: "users",
  LAWYERS: "lawyers",
  CASE_REQUESTS: "case_requests",
  COMMUNITY_POSTS: "community_posts",
  COMMENTS: "comments",
};

const RESPONSE_DEADLINE_MINUTES = 18;

function nowDate() {
  return new Date();
}

function clampNumber(value, fallback = 0, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function cleanText(value, max = 400) {
  return String(value || "").trim().slice(0, Math.max(1, Number(max || 1)));
}

function cleanArray(value, maxItems = 12, maxLen = 120) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanText(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function computeCaseResponseDeadline(from = new Date()) {
  const base = from instanceof Date ? from : new Date(from);
  return new Date(base.getTime() + RESPONSE_DEADLINE_MINUTES * 60 * 1000);
}

export function buildUserDocument(payload = {}) {
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : nowDate();
  return {
    name: cleanText(payload.name, 120),
    email: cleanText(payload.email, 180).toLowerCase(),
    password: cleanText(payload.password, 500),
    role: ["user", "lawyer", "admin"].includes(payload.role) ? payload.role : "user",
    phone: cleanText(payload.phone, 40),
    location: cleanText(payload.location, 120),
    createdAt,
  };
}

export function buildLawyerDocument(payload = {}) {
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : nowDate();
  return {
    name: cleanText(payload.name, 120),
    photo: cleanText(payload.photo, 500),
    email: cleanText(payload.email, 180).toLowerCase(),
    phone: cleanText(payload.phone, 40),
    specialization: cleanText(payload.specialization, 120),
    experience_years: clampNumber(payload.experience_years, 0, 0, 80),
    rating: clampNumber(payload.rating, 0, 0, 5),
    location: cleanText(payload.location, 120),
    languages: cleanArray(payload.languages, 10, 40),
    availability_status: ["available", "busy", "offline"].includes(payload.availability_status)
      ? payload.availability_status
      : "available",
    response_time: clampNumber(payload.response_time, 0, 0, 10080),
    verified: Boolean(payload.verified),
    createdAt,
  };
}

export function buildCaseRequestDocument(payload = {}) {
  const createdAt = payload.createdAt ? new Date(payload.createdAt) : nowDate();
  const assignedAt = payload.assignedAt ? new Date(payload.assignedAt) : null;
  return {
    user_id: payload.user_id,
    lawyer_id: payload.lawyer_id || null,
    issue_description: cleanText(payload.issue_description, 4000),
    status: ["pending", "accepted", "reassigned", "completed"].includes(payload.status)
      ? payload.status
      : "pending",
    createdAt,
    assignedAt,
    response_deadline: payload.response_deadline
      ? new Date(payload.response_deadline)
      : computeCaseResponseDeadline(assignedAt || createdAt),
    reassignment_count: clampNumber(payload.reassignment_count, 0, 0, 1000),
  };
}

export function buildCommunityPostDocument(payload = {}) {
  return {
    user_id: payload.user_id,
    title: cleanText(payload.title, 240),
    content: cleanText(payload.content, 4000),
    tags: cleanArray(payload.tags, 10, 40),
    upvotes: clampNumber(payload.upvotes, 0, 0, Number.MAX_SAFE_INTEGER),
    createdAt: payload.createdAt ? new Date(payload.createdAt) : nowDate(),
  };
}

export function buildCommentDocument(payload = {}) {
  return {
    post_id: payload.post_id,
    user_id: payload.user_id,
    comment_text: cleanText(payload.comment_text, 2000),
    createdAt: payload.createdAt ? new Date(payload.createdAt) : nowDate(),
  };
}

const COLLECTION_SCHEMAS = {
  [NAYAY_COLLECTIONS.USERS]: {
    bsonType: "object",
    required: ["name", "email", "password", "role", "phone", "location", "createdAt"],
    properties: {
      name: { bsonType: "string" },
      email: { bsonType: "string" },
      password: { bsonType: "string" },
      role: { enum: ["user", "lawyer", "admin"] },
      phone: { bsonType: "string" },
      location: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
  [NAYAY_COLLECTIONS.LAWYERS]: {
    bsonType: "object",
    required: [
      "name",
      "photo",
      "email",
      "phone",
      "specialization",
      "experience_years",
      "rating",
      "location",
      "languages",
      "availability_status",
      "response_time",
      "verified",
      "createdAt",
    ],
    properties: {
      name: { bsonType: "string" },
      photo: { bsonType: "string" },
      email: { bsonType: "string" },
      phone: { bsonType: "string" },
      specialization: { bsonType: "string" },
      experience_years: { bsonType: ["int", "long", "double", "decimal"] },
      rating: { bsonType: ["int", "long", "double", "decimal"] },
      location: { bsonType: "string" },
      languages: { bsonType: "array", items: { bsonType: "string" } },
      availability_status: { enum: ["available", "busy", "offline"] },
      response_time: { bsonType: ["int", "long", "double", "decimal"] },
      verified: { bsonType: "bool" },
      createdAt: { bsonType: "date" },
    },
  },
  [NAYAY_COLLECTIONS.CASE_REQUESTS]: {
    bsonType: "object",
    required: ["user_id", "issue_description", "status", "createdAt", "response_deadline"],
    properties: {
      user_id: { bsonType: ["objectId", "string"] },
      lawyer_id: { bsonType: ["objectId", "string", "null"] },
      issue_description: { bsonType: "string" },
      status: { enum: ["pending", "accepted", "reassigned", "completed"] },
      createdAt: { bsonType: "date" },
      assignedAt: { bsonType: ["date", "null"] },
      response_deadline: { bsonType: "date" },
      reassignment_count: { bsonType: ["int", "long", "double", "decimal"] },
    },
  },
  [NAYAY_COLLECTIONS.COMMUNITY_POSTS]: {
    bsonType: "object",
    required: ["user_id", "title", "content", "tags", "upvotes", "createdAt"],
    properties: {
      user_id: { bsonType: ["objectId", "string"] },
      title: { bsonType: "string" },
      content: { bsonType: "string" },
      tags: { bsonType: "array", items: { bsonType: "string" } },
      upvotes: { bsonType: ["int", "long", "double", "decimal"] },
      createdAt: { bsonType: "date" },
    },
  },
  [NAYAY_COLLECTIONS.COMMENTS]: {
    bsonType: "object",
    required: ["post_id", "user_id", "comment_text", "createdAt"],
    properties: {
      post_id: { bsonType: ["objectId", "string"] },
      user_id: { bsonType: ["objectId", "string"] },
      comment_text: { bsonType: "string" },
      createdAt: { bsonType: "date" },
    },
  },
};

const COLLECTION_INDEXES = {
  [NAYAY_COLLECTIONS.USERS]: [
    { key: { email: 1 }, options: { unique: true, name: "users_email_unique" } },
    { key: { role: 1, createdAt: -1 }, options: { name: "users_role_createdAt" } },
    { key: { location: 1 }, options: { name: "users_location" } },
  ],
  [NAYAY_COLLECTIONS.LAWYERS]: [
    { key: { email: 1 }, options: { unique: true, name: "lawyers_email_unique" } },
    {
      key: { specialization: 1, location: 1, rating: -1, experience_years: -1 },
      options: { name: "lawyers_filter_compound" },
    },
    {
      key: { verified: 1, availability_status: 1, response_time: 1 },
      options: { name: "lawyers_verification_availability" },
    },
    {
      key: { name: "text", specialization: "text", location: "text", languages: "text" },
      options: { name: "lawyers_text_search" },
    },
  ],
  [NAYAY_COLLECTIONS.CASE_REQUESTS]: [
    {
      key: { lawyer_id: 1, status: 1, response_deadline: 1 },
      options: { name: "case_requests_assignment_deadline" },
    },
    {
      key: { user_id: 1, createdAt: -1 },
      options: { name: "case_requests_user_history" },
    },
    {
      key: { status: 1, response_deadline: 1 },
      options: { name: "case_requests_status_deadline" },
    },
  ],
  [NAYAY_COLLECTIONS.COMMUNITY_POSTS]: [
    { key: { user_id: 1, createdAt: -1 }, options: { name: "community_posts_user_createdAt" } },
    { key: { tags: 1, createdAt: -1 }, options: { name: "community_posts_tags_createdAt" } },
    {
      key: { title: "text", content: "text", tags: "text" },
      options: { name: "community_posts_text_search" },
    },
  ],
  [NAYAY_COLLECTIONS.COMMENTS]: [
    { key: { post_id: 1, createdAt: 1 }, options: { name: "comments_post_createdAt" } },
    { key: { user_id: 1, createdAt: -1 }, options: { name: "comments_user_createdAt" } },
  ],
};

async function ensureCollection(db, name, schema) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, {
      validator: { $jsonSchema: schema },
      validationLevel: "moderate",
    });
    return;
  }

  try {
    await db.command({
      collMod: name,
      validator: { $jsonSchema: schema },
      validationLevel: "moderate",
    });
  } catch {
    // Best effort only.
  }
}

export async function ensureNayaySetuMongoSchema() {
  if (!isMongoConfigured()) {
    return { enabled: false, initialized: false, reason: "mongo-not-configured" };
  }

  const db = await getMongoDb();
  if (!db) {
    return { enabled: true, initialized: false, reason: "mongo-db-unavailable" };
  }

  for (const [name, schema] of Object.entries(COLLECTION_SCHEMAS)) {
    await ensureCollection(db, name, schema);
    const collection = db.collection(name);
    for (const definition of COLLECTION_INDEXES[name] || []) {
      await collection.createIndex(definition.key, definition.options || {});
    }
  }

  return { enabled: true, initialized: true };
}

function toBooleanFilter(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return null;
}

export async function findLawyers(filters = {}) {
  const collection = await getMongoCollection(NAYAY_COLLECTIONS.LAWYERS);
  if (!collection) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      storeMode: isMongoConfigured() ? "mongo-unavailable" : "mongo-not-configured",
    };
  }

  const page = clampNumber(filters.page, 1, 1, 10000);
  const limit = clampNumber(filters.limit, 10, 1, 50);
  const minRating = clampNumber(filters.min_rating, 0, 0, 5);
  const minExperience = clampNumber(filters.min_experience, 0, 0, 80);
  const query = {
    rating: { $gte: minRating },
    experience_years: { $gte: minExperience },
  };

  if (cleanText(filters.specialization, 120)) {
    query.specialization = cleanText(filters.specialization, 120);
  }
  if (cleanText(filters.location, 120)) {
    query.location = cleanText(filters.location, 120);
  }
  if (cleanText(filters.language, 40)) {
    query.languages = cleanText(filters.language, 40);
  }
  if (cleanText(filters.availability_status, 20)) {
    query.availability_status = cleanText(filters.availability_status, 20);
  }

  const verified = toBooleanFilter(filters.verified);
  if (verified !== null) {
    query.verified = verified;
  }

  const search = cleanText(filters.search, 140);
  let sort = { rating: -1, response_time: 1, experience_years: -1, createdAt: -1 };
  if (search) {
    query.$text = { $search: search };
    sort = { score: { $meta: "textScore" }, rating: -1, response_time: 1 };
  } else if (filters.sort_by === "response_time") {
    sort = { response_time: 1, rating: -1 };
  } else if (filters.sort_by === "experience") {
    sort = { experience_years: -1, rating: -1 };
  } else if (filters.sort_by === "createdAt") {
    sort = { createdAt: -1 };
  }

  const [items, total] = await Promise.all([
    collection
      .find(query, search ? { projection: { score: { $meta: "textScore" } } } : {})
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    storeMode: "mongo",
  };
}

export async function findNextAvailableLawyer({ specialization, location, excludeLawyerIds = [] } = {}) {
  const collection = await getMongoCollection(NAYAY_COLLECTIONS.LAWYERS);
  if (!collection) return null;

  const query = {
    verified: true,
    availability_status: "available",
  };

  if (cleanText(specialization, 120)) {
    query.specialization = cleanText(specialization, 120);
  }
  if (cleanText(location, 120)) {
    query.location = cleanText(location, 120);
  }
  if (Array.isArray(excludeLawyerIds) && excludeLawyerIds.length > 0) {
    query._id = { $nin: excludeLawyerIds };
  }

  return collection.find(query).sort({ response_time: 1, rating: -1, experience_years: -1 }).limit(1).next();
}

export async function findExpiredPendingCaseRequests(referenceAt = new Date()) {
  const collection = await getMongoCollection(NAYAY_COLLECTIONS.CASE_REQUESTS);
  if (!collection) return [];

  return collection
    .find({
      status: { $in: ["pending", "reassigned"] },
      response_deadline: { $lte: referenceAt },
      lawyer_id: { $ne: null },
    })
    .sort({ response_deadline: 1 })
    .toArray();
}

export async function reassignExpiredCaseRequests(referenceAt = new Date()) {
  const collection = await getMongoCollection(NAYAY_COLLECTIONS.CASE_REQUESTS);
  if (!collection) {
    return {
      storeMode: isMongoConfigured() ? "mongo-unavailable" : "mongo-not-configured",
      reassigned: 0,
    };
  }

  const expired = await findExpiredPendingCaseRequests(referenceAt);
  let reassigned = 0;

  for (const request of expired) {
    const nextLawyer = await findNextAvailableLawyer({
      excludeLawyerIds: request.lawyer_id ? [request.lawyer_id] : [],
    });
    if (!nextLawyer) continue;

    await collection.updateOne(
      { _id: request._id },
      {
        $set: {
          lawyer_id: nextLawyer._id,
          status: "reassigned",
          assignedAt: referenceAt,
          response_deadline: computeCaseResponseDeadline(referenceAt),
        },
        $inc: {
          reassignment_count: 1,
        },
      }
    );
    reassigned += 1;
  }

  return { storeMode: "mongo", reassigned };
}

export async function listCommunityPosts({ search, tag, page = 1, limit = 10 } = {}) {
  const posts = await getMongoCollection(NAYAY_COLLECTIONS.COMMUNITY_POSTS);
  const comments = await getMongoCollection(NAYAY_COLLECTIONS.COMMENTS);

  if (!posts || !comments) {
    return {
      items: [],
      total: 0,
      page: 1,
      limit: clampNumber(limit, 10, 1, 50),
      storeMode: isMongoConfigured() ? "mongo-unavailable" : "mongo-not-configured",
    };
  }

  const safePage = clampNumber(page, 1, 1, 10000);
  const safeLimit = clampNumber(limit, 10, 1, 50);
  const match = {};

  if (cleanText(tag, 40)) {
    match.tags = cleanText(tag, 40);
  }
  if (cleanText(search, 140)) {
    match.$text = { $search: cleanText(search, 140) };
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: NAYAY_COLLECTIONS.COMMENTS,
        localField: "_id",
        foreignField: "post_id",
        as: "comments",
      },
    },
    {
      $addFields: {
        comment_count: { $size: "$comments" },
      },
    },
    {
      $project: {
        comments: 0,
      },
    },
    { $sort: cleanText(search, 140) ? { score: { $meta: "textScore" }, createdAt: -1 } : { createdAt: -1 } },
    { $skip: (safePage - 1) * safeLimit },
    { $limit: safeLimit },
  ];

  if (cleanText(search, 140)) {
    pipeline.splice(1, 0, {
      $addFields: {
        score: { $meta: "textScore" },
      },
    });
  }

  const [items, totalDocs] = await Promise.all([
    posts.aggregate(pipeline).toArray(),
    posts.countDocuments(match),
  ]);

  return {
    items,
    total: totalDocs,
    page: safePage,
    limit: safeLimit,
    storeMode: "mongo",
  };
}
