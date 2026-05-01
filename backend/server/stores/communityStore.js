import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "community-db.json");

const MODERATION_STATUS = {
  PUBLISHED: "published",
  PENDING_REVIEW: "pending_review",
  BLOCKED: "blocked",
};
const MAX_REPORT_ITEMS = 300;

const INITIAL_COMMUNITY_DB = {
  discussions: [
    {
      id: "s1",
      title: "FIR not registered after theft. What should I do next?",
      summary: "Police asked to come later and did not issue complaint receipt.",
      response:
        "Submit written complaint with acknowledgement, then escalate to SP in writing within 24 hours.",
      validatedBy: "Lawyer Verified",
      votes: 34,
      tags: ["FIR", "Police", "Criminal"],
      author: "Anonymous Citizen",
      handle: "@case_watch",
      postedAt: "2h ago",
      comments: [
        {
          id: "c-s1-1",
          author: "Adv. Ritu Sharma",
          handle: "@adv_ritu",
          text: "Keep a copy of your written complaint and ask for diary number.",
          postedAt: "1h ago",
        },
      ],
    },
    {
      id: "s2",
      title: "UPI scam happened 30 minutes ago. First hour checklist?",
      summary: "Money debited after fake support call and remote app install.",
      response:
        "Call 1930 immediately, alert bank for hold, then file cybercrime complaint with transaction evidence.",
      validatedBy: "Moderator Verified",
      votes: 49,
      tags: ["Cyber", "UPI", "Fraud"],
      author: "Riya S.",
      handle: "@cyber_alert",
      postedAt: "5h ago",
      comments: [
        {
          id: "c-s2-1",
          author: "Digital Volunteer",
          handle: "@cyber_sathi",
          text: "Do not delete call logs and screenshots, they are useful evidence.",
          postedAt: "3h ago",
        },
      ],
    },
    {
      id: "s3",
      title: "Landlord not returning deposit. Can I file directly?",
      summary: "Deposit pending for 4 months without proper deductions breakdown.",
      response:
        "Send legal notice first with payment proof and timeline, then proceed before rent authority/civil forum.",
      validatedBy: "Lawyer Verified",
      votes: 21,
      tags: ["Rent", "Property", "Civil"],
      author: "Tenant Voice",
      handle: "@rental_rights",
      postedAt: "1d ago",
      comments: [],
    },
    {
      id: "s4",
      title: "Salary not paid for two months. Where to complain?",
      summary: "Employer stopped replying after promise to clear dues.",
      response:
        "Collect appointment docs, payslips, and chats; file complaint before labour commissioner office.",
      validatedBy: "Volunteer Verified",
      votes: 27,
      tags: ["Labour", "Salary", "Complaint"],
      author: "Worker Help Desk",
      handle: "@labour_line",
      postedAt: "2d ago",
      comments: [],
    },
  ],
  meetups: [
    {
      id: "m1",
      city: "Delhi",
      title: "Know Your Rights: Women Safety",
      date: "22 Feb 2026",
      host: "Nyay Saathi Collective",
      venue: "Lajpat Nagar Community Hall",
      seats: "40 seats",
    },
    {
      id: "m2",
      city: "Mumbai",
      title: "Tenant Rights and Legal Notice Workshop",
      date: "01 Mar 2026",
      host: "Citizen Legal Forum",
      venue: "Andheri Legal Aid Center",
      seats: "55 seats",
    },
    {
      id: "m3",
      city: "Bengaluru",
      title: "Cyber Fraud Response Drill",
      date: "08 Mar 2026",
      host: "Digital Justice Volunteers",
      venue: "Indiranagar Public Library",
      seats: "35 seats",
    },
  ],
  qaSessions: [
    {
      id: "q1",
      topic: "Domestic Violence: Immediate Legal Protection",
      date: "24 Feb 2026",
      speaker: "Adv. Ritu Sharma",
      mode: "Live Video",
    },
    {
      id: "q2",
      topic: "Consumer Fraud and Refund Claims",
      date: "03 Mar 2026",
      speaker: "Adv. Arjun Mehta",
      mode: "Community Room",
    },
    {
      id: "q3",
      topic: "FIR, Bail, and First Court Appearance",
      date: "10 Mar 2026",
      speaker: "Adv. Kavya Rao",
      mode: "Hybrid",
    },
  ],
  volunteers: [
    {
      id: "v1",
      name: "Nyay Sathi Network",
      type: "NGO",
      focus: "Domestic violence response and court accompaniment",
      location: "Delhi NCR",
      members: "210 volunteers",
    },
    {
      id: "v2",
      name: "Awaaz Legal Collective",
      type: "Community",
      focus: "Labour wage disputes and documentation support",
      location: "Mumbai",
      members: "140 volunteers",
    },
    {
      id: "v3",
      name: "Cyber Rakshak Volunteers",
      type: "NGO",
      focus: "Cyber fraud reporting and digital evidence preservation",
      location: "Bengaluru",
      members: "95 volunteers",
    },
    {
      id: "v4",
      name: "Nari Nyay Circle",
      type: "Community",
      focus: "Women legal rights awareness and helpline navigation",
      location: "Jaipur",
      members: "120 volunteers",
    },
  ],
  experts: [
    "Adv. Ritu Sharma",
    "Adv. Arjun Mehta",
    "Digital Justice Volunteers",
    "Citizen Legal Forum",
  ],
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const deepClone = (value) => JSON.parse(JSON.stringify(value));

const cleanText = (value) => String(value || "").trim();
const cleanTextLimited = (value, max) => cleanText(value).slice(0, Math.max(0, Number(max || 0)));

const normalizeWithFallback = (value, fallback) => {
  const normalized = cleanText(value);
  return normalized || fallback;
};

function nowIso() {
  return new Date().toISOString();
}

function toRelativeTime(timestamp) {
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function normalizeStatus(value) {
  const status = cleanText(value).toLowerCase();
  if (status === MODERATION_STATUS.BLOCKED) return MODERATION_STATUS.BLOCKED;
  if (status === MODERATION_STATUS.PENDING_REVIEW) return MODERATION_STATUS.PENDING_REVIEW;
  return MODERATION_STATUS.PUBLISHED;
}

function normalizeReportState(value) {
  const items = asArray(value?.items)
    .map((item) => ({
      id: cleanTextLimited(item?.id, 120),
      userId: cleanTextLimited(item?.userId, 120),
      reason: cleanTextLimited(item?.reason, 160),
      detail: cleanTextLimited(item?.detail, 600),
      createdAt: cleanTextLimited(item?.createdAt, 40) || nowIso(),
    }))
    .filter((item) => item.id && item.userId);
  return {
    count: Number.isFinite(Number(value?.count)) ? Number(value.count) : items.length,
    items: items.slice(-MAX_REPORT_ITEMS),
    autoHiddenAt: cleanTextLimited(value?.autoHiddenAt, 40),
  };
}

function normalizeModerationMeta(value) {
  const categories = asArray(value?.categories)
    .map((item) => cleanTextLimited(item, 80))
    .filter(Boolean)
    .slice(0, 12);
  const reasons = asArray(value?.reasons)
    .map((item) => cleanTextLimited(item, 220))
    .filter(Boolean)
    .slice(0, 12);
  return {
    verdict: cleanTextLimited(value?.verdict, 32) || MODERATION_STATUS.PUBLISHED,
    categories,
    reasons,
    provider: cleanTextLimited(value?.provider, 40) || "none",
    reviewedBy: cleanTextLimited(value?.reviewedBy, 80),
    reviewedAt: cleanTextLimited(value?.reviewedAt, 40),
    note: cleanTextLimited(value?.note, 260),
  };
}

function normalizeAttachmentMeta(value) {
  return asArray(value)
    .map((item) => ({
      name: cleanTextLimited(item?.name, 120) || "attachment",
      kind: cleanTextLimited(item?.kind, 24).toLowerCase() || "file",
      type: cleanTextLimited(item?.type, 120).toLowerCase(),
      size: Math.max(0, Number(item?.size || 0)),
      payloadType: cleanTextLimited(item?.payloadType, 24).toLowerCase() || "metadata",
    }))
    .slice(0, 5);
}

function normalizeComment(item) {
  const createdAtMs = Number(item?.createdAt || Date.now());
  const status = normalizeStatus(item?.status);
  const hidden = typeof item?.hidden === "boolean" ? item.hidden : status !== MODERATION_STATUS.PUBLISHED;
  return {
    id: cleanTextLimited(item?.id, 120) || `c-${Date.now()}`,
    author: normalizeWithFallback(item?.author, "Community Member"),
    handle: normalizeWithFallback(item?.handle, "@member"),
    text: cleanTextLimited(item?.text, 800),
    postedAt: cleanTextLimited(item?.postedAt, 40) || toRelativeTime(createdAtMs),
    createdAt: createdAtMs,
    status,
    hidden,
    moderation: normalizeModerationMeta(item?.moderation),
    reports: normalizeReportState(item?.reports),
    attachments: normalizeAttachmentMeta(item?.attachments),
  };
}

function normalizeDiscussion(item) {
  const createdAtMs = Number(item?.createdAt || Date.now());
  const status = normalizeStatus(item?.status);
  const hidden = typeof item?.hidden === "boolean" ? item.hidden : status !== MODERATION_STATUS.PUBLISHED;
  return {
    id: cleanTextLimited(item?.id, 120) || `s-${Date.now()}`,
    title: cleanTextLimited(item?.title, 160),
    summary: cleanTextLimited(item?.summary, 1000),
    response:
      cleanTextLimited(item?.response, 1000) ||
      "Community response pending. Experts and volunteers will review shortly.",
    validatedBy: cleanTextLimited(item?.validatedBy, 80) || "Community Open",
    votes: Math.max(0, Number(item?.votes || 0)),
    tags: asArray(item?.tags)
      .map((tag) => cleanTextLimited(tag, 24))
      .filter(Boolean)
      .slice(0, 8),
    author: normalizeWithFallback(item?.author, "Community Member"),
    handle: normalizeWithFallback(item?.handle, "@member"),
    postedAt: cleanTextLimited(item?.postedAt, 40) || toRelativeTime(createdAtMs),
    comments: asArray(item?.comments).map(normalizeComment),
    createdAt: createdAtMs,
    status,
    hidden,
    moderation: normalizeModerationMeta(item?.moderation),
    reports: normalizeReportState(item?.reports),
    attachments: normalizeAttachmentMeta(item?.attachments),
  };
}

function isVisibleDiscussion(item) {
  return item.status === MODERATION_STATUS.PUBLISHED && !item.hidden;
}

function isVisibleComment(item) {
  return item.status === MODERATION_STATUS.PUBLISHED && !item.hidden;
}

function toPublicDiscussion(item) {
  const normalized = normalizeDiscussion(item);
  return {
    ...normalized,
    comments: normalized.comments.filter(isVisibleComment),
  };
}

function filterWithSearch(collection, search, selector) {
  if (!search) return collection;
  const q = search.toLowerCase();
  return collection.filter((item) => selector(item).toLowerCase().includes(q));
}

function applyModerationActionOnItem(item, action, actor = "Admin", note = "") {
  const cleanedAction = cleanText(action).toLowerCase();
  const cleanedActor = cleanTextLimited(actor, 80) || "Admin";
  const cleanedNote = cleanTextLimited(note, 260);
  const reviewedAt = nowIso();
  const next = { ...item };

  if (cleanedAction === "approve") {
    next.status = MODERATION_STATUS.PUBLISHED;
    next.hidden = false;
    next.validatedBy = "Moderator Verified";
  } else if (cleanedAction === "reject") {
    next.status = MODERATION_STATUS.BLOCKED;
    next.hidden = true;
    next.validatedBy = "Safety Blocked";
  } else if (cleanedAction === "hide") {
    if (next.status === MODERATION_STATUS.PUBLISHED) {
      next.status = MODERATION_STATUS.PENDING_REVIEW;
    }
    next.hidden = true;
    next.validatedBy = "Under Moderation Review";
  } else if (cleanedAction === "unhide") {
    if (next.status === MODERATION_STATUS.PENDING_REVIEW) {
      next.status = MODERATION_STATUS.PUBLISHED;
    }
    if (next.status === MODERATION_STATUS.BLOCKED) {
      next.hidden = true;
    } else {
      next.hidden = false;
    }
  } else {
    return item;
  }

  next.moderation = {
    ...normalizeModerationMeta(next.moderation),
    reviewedBy: cleanedActor,
    reviewedAt,
    note: cleanedNote,
  };
  return next;
}

async function ensureDbFile() {
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_COMMUNITY_DB, null, 2), "utf8");
  }
}

async function readDb() {
  await ensureDbFile();

  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      discussions: asArray(parsed.discussions).map(normalizeDiscussion),
      meetups: asArray(parsed.meetups),
      qaSessions: asArray(parsed.qaSessions),
      volunteers: asArray(parsed.volunteers),
      experts: asArray(parsed.experts),
    };
  } catch {
    const fallback = deepClone(INITIAL_COMMUNITY_DB);
    await fs.writeFile(DB_FILE, JSON.stringify(fallback, null, 2), "utf8");
    return {
      discussions: asArray(fallback.discussions).map(normalizeDiscussion),
      meetups: asArray(fallback.meetups),
      qaSessions: asArray(fallback.qaSessions),
      volunteers: asArray(fallback.volunteers),
      experts: asArray(fallback.experts),
    };
  }
}

async function writeDb(nextDb) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(nextDb, null, 2), "utf8");
}

export async function getCommunityData(search = "", options = {}) {
  const db = await readDb();
  const normalizedSearch = cleanText(search);
  const includeModeration = Boolean(options?.includeModeration);

  const discussions = includeModeration
    ? db.discussions.map(normalizeDiscussion)
    : db.discussions.filter(isVisibleDiscussion).map(toPublicDiscussion);
  const meetups = asArray(db.meetups);
  const qaSessions = asArray(db.qaSessions);
  const volunteers = asArray(db.volunteers);
  const experts = asArray(db.experts);

  return {
    discussions: filterWithSearch(
      discussions,
      normalizedSearch,
      (item) =>
        [
          item.title,
          item.summary,
          item.response,
          item.author,
          item.handle,
          item.validatedBy,
          item.status,
          ...(item.tags || []),
          ...asArray(item.comments).map((comment) => comment.text),
        ]
          .filter(Boolean)
          .join(" ")
    ),
    meetups: filterWithSearch(
      meetups,
      normalizedSearch,
      (item) => [item.city, item.title, item.host, item.venue, item.date].join(" ")
    ),
    qaSessions: filterWithSearch(
      qaSessions,
      normalizedSearch,
      (item) => [item.topic, item.date, item.speaker, item.mode].join(" ")
    ),
    volunteers: filterWithSearch(
      volunteers,
      normalizedSearch,
      (item) => [item.name, item.type, item.focus, item.location, item.members].join(" ")
    ),
    experts: filterWithSearch(experts, normalizedSearch, (item) => String(item)),
  };
}

export async function createDiscussion({
  title,
  summary,
  author = "Community Member",
  handle = "@member",
  tags = [],
  status = MODERATION_STATUS.PUBLISHED,
  moderation = null,
  attachments = [],
}) {
  const db = await readDb();
  const createdAt = Date.now();
  const normalizedTags = asArray(tags)
    .map((tag) => cleanTextLimited(tag, 24))
    .filter(Boolean)
    .slice(0, 6);
  const normalizedStatus = normalizeStatus(status);
  const hidden = normalizedStatus !== MODERATION_STATUS.PUBLISHED;

  const discussion = normalizeDiscussion({
    id: `s-${createdAt}`,
    title,
    summary,
    response: "Community response pending. Experts and volunteers will review shortly.",
    validatedBy:
      normalizedStatus === MODERATION_STATUS.PUBLISHED
        ? "Community Open"
        : "Under Moderation Review",
    votes: 0,
    tags: normalizedTags,
    author: normalizeWithFallback(author, "Community Member"),
    handle: normalizeWithFallback(handle, "@member"),
    postedAt: toRelativeTime(createdAt),
    comments: [],
    createdAt,
    status: normalizedStatus,
    hidden,
    moderation: normalizeModerationMeta(moderation),
    reports: { count: 0, items: [], autoHiddenAt: "" },
    attachments: normalizeAttachmentMeta(attachments),
  });

  db.discussions = [discussion, ...db.discussions.map(normalizeDiscussion)];
  await writeDb(db);
  return normalizeDiscussion(discussion);
}

export async function upvoteDiscussion(discussionId) {
  const db = await readDb();
  let updated = null;

  db.discussions = db.discussions.map((item) => {
    const next = normalizeDiscussion(item);
    if (next.id !== discussionId) return next;
    if (!isVisibleDiscussion(next)) return next;
    updated = { ...next, votes: next.votes + 1 };
    return updated;
  });

  if (!updated) return null;
  await writeDb(db);
  return toPublicDiscussion(updated);
}

export async function addDiscussionComment(
  discussionId,
  {
    text,
    author = "Community Member",
    handle = "@member",
    status = MODERATION_STATUS.PUBLISHED,
    moderation = null,
    attachments = [],
  }
) {
  const db = await readDb();
  const createdAt = Date.now();
  let updated = null;

  db.discussions = db.discussions.map((item) => {
    const next = normalizeDiscussion(item);
    if (next.id !== discussionId) return next;
    if (!isVisibleDiscussion(next)) return next;
    const normalizedStatus = normalizeStatus(status);
    const comment = normalizeComment({
      id: `c-${discussionId}-${createdAt}`,
      author: normalizeWithFallback(author, "Community Member"),
      handle: normalizeWithFallback(handle, "@member"),
      text: cleanTextLimited(text, 800),
      postedAt: toRelativeTime(createdAt),
      createdAt,
      status: normalizedStatus,
      hidden: normalizedStatus !== MODERATION_STATUS.PUBLISHED,
      moderation: normalizeModerationMeta(moderation),
      reports: { count: 0, items: [], autoHiddenAt: "" },
      attachments: normalizeAttachmentMeta(attachments),
    });
    updated = {
      ...next,
      comments: [...next.comments, comment],
    };
    return updated;
  });

  if (!updated) return null;
  await writeDb(db);
  return toPublicDiscussion(updated);
}

export async function addDiscussionReport(
  discussionId,
  { userId, reason = "reported", detail = "", autoHideThreshold = 3 }
) {
  const db = await readDb();
  const createdAt = nowIso();
  const cleanUserId = cleanTextLimited(userId, 120);
  let result = null;

  db.discussions = db.discussions.map((item) => {
    const next = normalizeDiscussion(item);
    if (next.id !== discussionId) return next;

    const reports = normalizeReportState(next.reports);
    const alreadyReported = reports.items.some((entry) => entry.userId === cleanUserId);
    if (alreadyReported) {
      result = {
        discussion: next,
        duplicate: true,
        autoHidden: false,
      };
      return next;
    }

    const reportRecord = {
      id: `r-${next.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: cleanUserId,
      reason: cleanTextLimited(reason, 160) || "reported",
      detail: cleanTextLimited(detail, 600),
      createdAt,
    };
    const reportItems = [...reports.items, reportRecord].slice(-MAX_REPORT_ITEMS);
    let hidden = next.hidden;
    let status = next.status;
    let autoHidden = false;

    if (reportItems.length >= Math.max(1, Number(autoHideThreshold || 3))) {
      hidden = true;
      if (status === MODERATION_STATUS.PUBLISHED) {
        status = MODERATION_STATUS.PENDING_REVIEW;
      }
      autoHidden = true;
    }

    const updated = {
      ...next,
      hidden,
      status,
      validatedBy:
        status === MODERATION_STATUS.PUBLISHED ? next.validatedBy : "Under Moderation Review",
      reports: {
        count: reportItems.length,
        items: reportItems,
        autoHiddenAt: autoHidden ? createdAt : reports.autoHiddenAt,
      },
    };
    result = {
      discussion: updated,
      duplicate: false,
      autoHidden,
    };
    return updated;
  });

  if (!result) return null;
  await writeDb(db);
  return {
    ...result,
    discussion: normalizeDiscussion(result.discussion),
  };
}

export async function addCommentReport(
  discussionId,
  commentId,
  { userId, reason = "reported", detail = "", autoHideThreshold = 3 }
) {
  const db = await readDb();
  const createdAt = nowIso();
  const cleanUserId = cleanTextLimited(userId, 120);
  let result = null;

  db.discussions = db.discussions.map((item) => {
    const discussion = normalizeDiscussion(item);
    if (discussion.id !== discussionId) return discussion;

    const nextComments = discussion.comments.map((comment) => {
      const next = normalizeComment(comment);
      if (next.id !== commentId) return next;

      const reports = normalizeReportState(next.reports);
      const alreadyReported = reports.items.some((entry) => entry.userId === cleanUserId);
      if (alreadyReported) {
        result = {
          discussion,
          comment: next,
          duplicate: true,
          autoHidden: false,
        };
        return next;
      }

      const reportRecord = {
        id: `r-${discussion.id}-${next.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: cleanUserId,
        reason: cleanTextLimited(reason, 160) || "reported",
        detail: cleanTextLimited(detail, 600),
        createdAt,
      };
      const reportItems = [...reports.items, reportRecord].slice(-MAX_REPORT_ITEMS);
      let hidden = next.hidden;
      let status = next.status;
      let autoHidden = false;

      if (reportItems.length >= Math.max(1, Number(autoHideThreshold || 3))) {
        hidden = true;
        if (status === MODERATION_STATUS.PUBLISHED) {
          status = MODERATION_STATUS.PENDING_REVIEW;
        }
        autoHidden = true;
      }

      const updatedComment = {
        ...next,
        hidden,
        status,
        reports: {
          count: reportItems.length,
          items: reportItems,
          autoHiddenAt: autoHidden ? createdAt : reports.autoHiddenAt,
        },
      };
      result = {
        discussion: {
          ...discussion,
          comments: discussion.comments.map((entry) =>
            entry.id === next.id ? updatedComment : entry
          ),
        },
        comment: updatedComment,
        duplicate: false,
        autoHidden,
      };
      return updatedComment;
    });

    return {
      ...discussion,
      comments: nextComments,
    };
  });

  if (!result) return null;
  await writeDb(db);
  return {
    ...result,
    discussion: normalizeDiscussion(result.discussion),
    comment: normalizeComment(result.comment),
  };
}

export async function listCommunityReviewQueue(limit = 120) {
  const db = await readDb();
  const maxItems = Math.max(1, Number(limit) || 120);

  const discussions = db.discussions
    .map(normalizeDiscussion)
    .filter(
      (item) =>
        item.status !== MODERATION_STATUS.PUBLISHED ||
        item.hidden ||
        Number(item.reports?.count || 0) > 0
    )
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, maxItems);

  const comments = [];
  discussions.forEach((discussion) => {
    discussion.comments.forEach((comment) => {
      const nextComment = normalizeComment(comment);
      if (
        nextComment.status !== MODERATION_STATUS.PUBLISHED ||
        nextComment.hidden ||
        Number(nextComment.reports?.count || 0) > 0
      ) {
        comments.push({
          ...nextComment,
          discussionId: discussion.id,
          discussionTitle: discussion.title,
        });
      }
    });
  });

  comments.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  return {
    discussions,
    comments: comments.slice(0, maxItems),
    totals: {
      discussions: discussions.length,
      comments: comments.length,
    },
  };
}

export async function reviewDiscussionModeration({
  discussionId,
  action,
  actor = "Admin",
  note = "",
}) {
  const db = await readDb();
  let updated = null;

  db.discussions = db.discussions.map((item) => {
    const next = normalizeDiscussion(item);
    if (next.id !== discussionId) return next;
    updated = applyModerationActionOnItem(next, action, actor, note);
    return normalizeDiscussion(updated);
  });

  if (!updated) return null;
  await writeDb(db);
  return normalizeDiscussion(updated);
}

export async function reviewCommentModeration({
  discussionId,
  commentId,
  action,
  actor = "Admin",
  note = "",
}) {
  const db = await readDb();
  let updatedDiscussion = null;
  let updatedComment = null;

  db.discussions = db.discussions.map((item) => {
    const discussion = normalizeDiscussion(item);
    if (discussion.id !== discussionId) return discussion;

    const nextComments = discussion.comments.map((comment) => {
      const next = normalizeComment(comment);
      if (next.id !== commentId) return next;
      updatedComment = applyModerationActionOnItem(next, action, actor, note);
      return normalizeComment(updatedComment);
    });

    updatedDiscussion = {
      ...discussion,
      comments: nextComments,
    };
    return updatedDiscussion;
  });

  if (!updatedDiscussion || !updatedComment) return null;
  await writeDb(db);
  return {
    discussion: normalizeDiscussion(updatedDiscussion),
    comment: normalizeComment(updatedComment),
  };
}
