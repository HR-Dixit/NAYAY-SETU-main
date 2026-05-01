import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  addDiscussionComment,
  addCommentReport,
  createDiscussion,
  getCommunityData,
  listCommunityReviewQueue,
  reviewCommentModeration,
  reviewDiscussionModeration,
  addDiscussionReport,
  upvoteDiscussion,
} from "./stores/communityStore.js";
import {
  buildJusticeRoute,
  COMPLIANCE_POLICY,
  getOfficialDomainAllowlist,
  isOfficialServiceUrl,
  JUSTICE_SERVICE_CATALOG,
  LEGAL_AID_CHANNELS,
  NJDG_INSIGHT_FACETS,
} from "./catalog/justiceCatalog.js";
import {
  addJusticeCase,
  addJusticeReminder,
  deleteJusticeCase,
  deleteJusticeReminder,
  getJusticeDesk,
  getJusticeDeskStoreMode,
  normalizeDeskUserId,
  updateJusticeCase,
  updateJusticeReminder,
} from "./stores/justiceDeskStore.js";
import {
  findPublicAuthUserByIdentifier,
  getPublicUserById,
  listPublicAuthUsers,
  registerAuthUser,
  sanitizeEmail,
  sanitizeUsername,
  validateAuthCredentials,
} from "./stores/authStore.js";
import {
  issueRefreshSession,
  listRefreshSessionsForUser,
  revokeAllRefreshSessionsForUser,
  revokeRefreshSession,
  rotateRefreshSession,
} from "./stores/authSessionStore.js";
import {
  activatePolicyVersion,
  getActivePolicyVersion,
  listPolicyAudit,
  listPolicyVersions,
  publishPolicyVersion,
} from "./stores/policyStore.js";
import { registerLegalAssistantRoutes } from "./routes/legalAssistantRoutes.js";
import { registerLawyerRoutes } from "./routes/lawyerRoutes.js";
import { registerCommunityPostRoutes } from "./routes/communityPostRoutes.js";
import { ensureNayaySetuMongoSchema } from "./models/nayaySetuMongo.js";

dotenv.config();

const DEFAULT_JWT_SECRET = "dev-insecure-jwt-secret-change-me";

function parseBooleanEnv(value, fallback = false) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseCommaList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const app = express();
const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";
const TRUST_PROXY =
  process.env.TRUST_PROXY != null
    ? parseBooleanEnv(process.env.TRUST_PROXY, false)
    : IS_PRODUCTION;
const CORS_ALLOWED_ORIGINS = parseCommaList(process.env.CORS_ALLOWED_ORIGINS);
const CORS_ALLOW_ALL_IN_DEV = CORS_ALLOWED_ORIGINS.length === 0 && !IS_PRODUCTION;
const SERVE_STATIC =
  process.env.SERVE_STATIC != null
    ? parseBooleanEnv(process.env.SERVE_STATIC, false)
    : IS_PRODUCTION;
const STATIC_DIR = path.join(process.cwd(), "dist");
const STATIC_INDEX_FILE = path.join(STATIC_DIR, "index.html");
const HAS_STATIC_BUILD = existsSync(STATIC_INDEX_FILE);
const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const API_RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 180);
const HEAVY_RATE_LIMIT_MAX = Number(process.env.HEAVY_RATE_LIMIT_MAX || 40);
const MAX_ATTACHMENTS = Number(process.env.MAX_ATTACHMENTS || 5);
const MAX_ATTACHMENT_BYTES = Number(process.env.MAX_ATTACHMENT_BYTES || 2_000_000);
const MAX_TOTAL_ATTACHMENT_BYTES = Number(process.env.MAX_TOTAL_ATTACHMENT_BYTES || 6_000_000);
const MAX_ATTACHMENT_TEXT_CHARS = Number(process.env.MAX_ATTACHMENT_TEXT_CHARS || 12_000);
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_ATTACHMENT_BYTES * 1.6) + 256;
const OPENAI_MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "14d";
const ENABLE_WEB_SEARCH = String(process.env.ENABLE_WEB_SEARCH || "false").toLowerCase() === "true";
const ENABLE_DEMO_SOCIAL_AUTH =
  String(process.env.ENABLE_DEMO_SOCIAL_AUTH || "false").toLowerCase() === "true";
const ENABLE_GOOGLE_AUTH =
  String(process.env.ENABLE_GOOGLE_AUTH || "true").toLowerCase() === "true";
const GOOGLE_CLIENT_ID = String(
  process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || ""
).trim();
const COMMUNITY_WRITE_RATE_LIMIT_MAX = Number(process.env.COMMUNITY_WRITE_RATE_LIMIT_MAX || 36);
const COMMUNITY_POST_COOLDOWN_MS = Number(process.env.COMMUNITY_POST_COOLDOWN_MS || 30_000);
const COMMUNITY_COMMENT_COOLDOWN_MS = Number(process.env.COMMUNITY_COMMENT_COOLDOWN_MS || 12_000);
const COMMUNITY_REPORT_COOLDOWN_MS = Number(process.env.COMMUNITY_REPORT_COOLDOWN_MS || 8_000);
const COMMUNITY_MAX_REPORTS_PER_HOUR = Number(process.env.COMMUNITY_MAX_REPORTS_PER_HOUR || 20);
const COMMUNITY_REPORT_AUTO_HIDE_THRESHOLD = Number(
  process.env.COMMUNITY_REPORT_AUTO_HIDE_THRESHOLD || 3
);
const ENABLE_COMMUNITY_CAPTCHA =
  String(process.env.ENABLE_COMMUNITY_CAPTCHA || "false").toLowerCase() === "true";
const RECAPTCHA_SECRET_KEY = String(process.env.RECAPTCHA_SECRET_KEY || "").trim();
const rateBuckets = new Map();
const communityActionBuckets = new Map();

app.disable("x-powered-by");
if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (CORS_ALLOW_ALL_IN_DEV || CORS_ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
if (SERVE_STATIC && HAS_STATIC_BUILD) {
  app.use(
    express.static(STATIC_DIR, {
      index: false,
      maxAge: IS_PRODUCTION ? "1h" : 0,
    })
  );
}

function pruneRateBuckets() {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}

function pruneCommunityActionBuckets() {
  const now = Date.now();
  const retentionMs = 2 * 60 * 60 * 1000;
  for (const [key, bucket] of communityActionBuckets.entries()) {
    if (!bucket || now - Number(bucket.lastSeenAt || 0) > retentionMs) {
      communityActionBuckets.delete(key);
    }
  }
}

setInterval(pruneRateBuckets, RATE_LIMIT_WINDOW_MS).unref();
setInterval(pruneCommunityActionBuckets, 60_000).unref();

function createRateLimiter({ keyPrefix, max, windowMs }) {
  return (req, res, next) => {
    const now = Date.now();
    const ip = String(req.ip || req.headers["x-forwarded-for"] || "unknown");
    const key = `${keyPrefix}:${ip}`;
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      rateBuckets.set(key, { count: 1, resetAt });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - 1)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
      res.status(429).json({
        error: "Too many requests. Please retry shortly.",
      });
      return;
    }

    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    next();
  };
}

app.use(
  "/api",
  createRateLimiter({
    keyPrefix: "api",
    max: API_RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })
);
app.use(
  "/api/assistant/query",
  createRateLimiter({
    keyPrefix: "assistant",
    max: HEAVY_RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })
);

const communityWriteRateLimiter = createRateLimiter({
  keyPrefix: "community-write",
  max: COMMUNITY_WRITE_RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW_MS,
});

const cleanText = (value) => String(value ?? "").trim();
const cleanTextLimited = (value, max) => cleanText(value).slice(0, Math.max(0, Number(max || 0)));

function validateMaxLength(value, max) {
  return cleanText(value).length <= max;
}

function isValidEmail(value = "") {
  return /^\S+@\S+\.\S+$/.test(String(value || "").trim());
}

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

function unauthorized(res, message = "Unauthorized.") {
  res.status(401).json({ error: message });
}

function forbidden(res, message = "Forbidden.") {
  res.status(403).json({ error: message });
}

registerLegalAssistantRoutes({
  app,
  apiKey: OPENAI_API_KEY,
  model: OPENAI_MODEL,
  badRequest,
});
registerLawyerRoutes(app);
registerCommunityPostRoutes(app);

function parseDurationToMs(value, fallbackMs) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return fallbackMs;
  const direct = Number(input);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const match = input.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] || 1);
}

const REFRESH_TOKEN_TTL_MS = parseDurationToMs(
  REFRESH_TOKEN_EXPIRES_IN,
  14 * 24 * 60 * 60 * 1000
);

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role || "user",
      typ: "access",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function getBearerToken(req) {
  const value = String(req.headers?.authorization || "");
  if (!value.startsWith("Bearer ")) return "";
  return value.slice(7).trim();
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    unauthorized(res, "Missing auth token.");
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.typ && decoded.typ !== "access") {
      unauthorized(res, "Invalid token type.");
      return;
    }
    const userId = String(decoded?.sub || "");
    if (!userId) {
      unauthorized(res, "Invalid auth token.");
      return;
    }
    const user = await getPublicUserById(userId);
    if (!user) {
      unauthorized(res, "User session is no longer valid.");
      return;
    }
    req.authUser = user;
    next();
  } catch {
    unauthorized(res, "Token expired or invalid.");
  }
}

async function resolveUserFromAccessToken(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.typ && decoded.typ !== "access") return null;
    const userId = String(decoded?.sub || "");
    if (!userId) return null;
    return getPublicUserById(userId);
  } catch {
    return null;
  }
}

function getRequestIp(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || String(req.ip || "").trim();
}

function getCommunityActorKey(req) {
  const userId = cleanTextLimited(req.authUser?.id, 120);
  if (userId) return `user:${userId}`;
  const ip = cleanTextLimited(getRequestIp(req), 120);
  return ip ? `ip:${ip}` : "unknown";
}

function getCommunityActionBucket(actorKey) {
  const key = cleanTextLimited(actorKey, 180) || "unknown";
  const existing = communityActionBuckets.get(key);
  if (existing) {
    existing.lastSeenAt = Date.now();
    return existing;
  }
  const created = {
    lastPostAt: 0,
    lastCommentAt: 0,
    lastReportAt: 0,
    reportWindowStartAt: 0,
    reportCount: 0,
    lastSeenAt: Date.now(),
  };
  communityActionBuckets.set(key, created);
  return created;
}

function enforceCommunityActionPolicy(
  req,
  res,
  { action, cooldownMs = 0, hourlyLimit = Number.POSITIVE_INFINITY }
) {
  const actorKey = getCommunityActorKey(req);
  const bucket = getCommunityActionBucket(actorKey);
  const now = Date.now();
  const safeCooldown = Math.max(0, Number(cooldownMs || 0));
  const actionKey =
    action === "post" ? "lastPostAt" : action === "comment" ? "lastCommentAt" : "lastReportAt";
  const lastAt = Number(bucket[actionKey] || 0);
  const retryAfterMs = safeCooldown - (now - lastAt);

  if (safeCooldown > 0 && lastAt > 0 && retryAfterMs > 0) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
    res.status(429).json({
      error: `Too many ${action} actions. Please wait a few seconds and retry.`,
    });
    return false;
  }

  if (Number.isFinite(hourlyLimit)) {
    const hourMs = 60 * 60 * 1000;
    if (!bucket.reportWindowStartAt || now - bucket.reportWindowStartAt > hourMs) {
      bucket.reportWindowStartAt = now;
      bucket.reportCount = 0;
    }
    if (bucket.reportCount >= hourlyLimit) {
      res.setHeader("Retry-After", "3600");
      res.status(429).json({
        error: "Report rate limit reached for this account. Please retry later.",
      });
      return false;
    }
  }

  bucket[actionKey] = now;
  if (Number.isFinite(hourlyLimit)) {
    bucket.reportCount += 1;
  }
  bucket.lastSeenAt = now;
  return true;
}

async function verifyRecaptchaToken({ token, ip }) {
  const responseToken = cleanTextLimited(token, 4096);
  if (!responseToken) {
    return { ok: false, error: "captcha-token-missing" };
  }
  if (!RECAPTCHA_SECRET_KEY) {
    return { ok: false, error: "captcha-secret-missing" };
  }

  const form = new URLSearchParams();
  form.set("secret", RECAPTCHA_SECRET_KEY);
  form.set("response", responseToken);
  if (ip) {
    form.set("remoteip", ip);
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!response.ok) {
    return { ok: false, error: `captcha-http-${response.status}` };
  }
  const payload = await response.json();
  if (!payload?.success) {
    const code = Array.isArray(payload?.["error-codes"]) ? payload["error-codes"].join(",") : "";
    return { ok: false, error: code || "captcha-verification-failed" };
  }
  return { ok: true };
}

async function enforceCommunityCaptcha(req, res) {
  if (!ENABLE_COMMUNITY_CAPTCHA) return true;
  const token = cleanTextLimited(req.body?.captchaToken, 4096);
  const verification = await verifyRecaptchaToken({
    token,
    ip: getRequestIp(req),
  });
  if (verification.ok) return true;
  forbidden(
    res,
    `Captcha verification failed. (${verification.error || "captcha-invalid"})`
  );
  return false;
}

const HEURISTIC_HATE_PATTERNS = [
  /\b(kill|lynch|genocide|exterminate)\b/i,
  /\b(hate|filthy|dirty)\b.{0,24}\b(muslim|hindu|sikh|christian|dalit|women|gay|lesbian|trans)\b/i,
  /\b(nazi|terrorist)\b.{0,24}\b(group|community|religion)\b/i,
];
const HEURISTIC_SPAM_PATTERNS = [
  /(https?:\/\/\S+){3,}/i,
  /\b(guaranteed win|pay now|earn money fast|100% result|click here)\b/i,
  /\b(telegram|whatsapp)\b.{0,20}\b(group|channel)\b/i,
];
const HEURISTIC_MISLEADING_PATTERNS = [
  /\b(fake order|forged order|fake judgement|edited fir|doctored evidence)\b/i,
  /\b(impersonate|pretend to be|fake advocate)\b/i,
  /\b(bribe|pay police directly|destroy evidence)\b/i,
];

function evaluateHeuristicCommunityRisk(text) {
  const input = cleanTextLimited(text, 5000);
  if (!input) {
    return {
      categories: [],
      reasons: [],
    };
  }

  const categories = new Set();
  const reasons = [];

  for (const pattern of HEURISTIC_HATE_PATTERNS) {
    if (pattern.test(input)) {
      categories.add("hate");
      reasons.push("Heuristic hate/abuse pattern detected.");
      break;
    }
  }
  for (const pattern of HEURISTIC_SPAM_PATTERNS) {
    if (pattern.test(input)) {
      categories.add("spam");
      reasons.push("Heuristic spam/promotion pattern detected.");
      break;
    }
  }
  for (const pattern of HEURISTIC_MISLEADING_PATTERNS) {
    if (pattern.test(input)) {
      categories.add("misleading");
      reasons.push("Heuristic misleading/fraud pattern detected.");
      break;
    }
  }

  if ((input.match(/https?:\/\//gi) || []).length >= 5) {
    categories.add("spam");
    reasons.push("Excessive links detected.");
  }
  if ((input.match(/(.)\1{7,}/g) || []).length > 0) {
    categories.add("spam");
    reasons.push("Repeated character spam detected.");
  }

  return {
    categories: [...categories],
    reasons,
  };
}

async function callOpenAIModeration(input) {
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODERATION_MODEL,
      input,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Moderation API error ${response.status}`);
  }
  const payload = await response.json();
  const result = payload?.results?.[0] || {};
  const categories = Object.entries(result?.categories || {})
    .filter((entry) => Boolean(entry?.[1]))
    .map((entry) => String(entry?.[0] || ""));

  return {
    flagged: Boolean(result?.flagged || categories.length),
    categories,
  };
}

function decideCommunityVerdict(categories, requiresManualReview = false) {
  const set = new Set(
    (Array.isArray(categories) ? categories : [])
      .map((item) => cleanTextLimited(item, 80).toLowerCase())
      .filter(Boolean)
  );
  const blockingCategories = new Set([
    "hate",
    "hate/threatening",
    "harassment/threatening",
    "sexual/minors",
    "illicit/violent",
    "violence/graphic",
  ]);
  const reviewCategories = new Set([
    "spam",
    "misleading",
    "sexual",
    "harassment",
    "violence",
    "self-harm",
    "self-harm/intent",
  ]);

  for (const category of set) {
    if (blockingCategories.has(category)) return "blocked";
  }
  for (const category of set) {
    if (reviewCategories.has(category)) return "pending_review";
  }
  return requiresManualReview ? "pending_review" : "published";
}

async function moderateCommunitySubmission({ title, summary, text, attachments }) {
  const combinedText = [title, summary, text].filter(Boolean).join("\n\n");
  const heuristic = evaluateHeuristicCommunityRisk(combinedText);
  const categorySet = new Set(heuristic.categories);
  const reasons = [...heuristic.reasons];
  let provider = "heuristic-only";
  let requiresManualReview = false;

  if (OPENAI_API_KEY && combinedText) {
    try {
      const textModeration = await callOpenAIModeration(combinedText);
      if (textModeration.flagged) {
        textModeration.categories.forEach((item) => categorySet.add(item));
        reasons.push("OpenAI text moderation flagged the submission.");
      }
      provider = "openai+heuristic";
    } catch {
      reasons.push("OpenAI moderation check failed; fallback heuristic moderation applied.");
    }
  }

  const normalizedAttachments = Array.isArray(attachments) ? attachments : [];
  for (const attachment of normalizedAttachments) {
    if (attachment.payloadType === "text" && attachment.textContent) {
      const textRisk = evaluateHeuristicCommunityRisk(attachment.textContent);
      textRisk.categories.forEach((item) => categorySet.add(item));
      textRisk.reasons.forEach((item) => reasons.push(`${attachment.name}: ${item}`));
      continue;
    }

    if (attachment.payloadType === "data-url" && attachment.dataUrl) {
      try {
        const decoded = decodeDataUrl(attachment.dataUrl);
        if (decoded.mimeType.startsWith("image/")) {
          if (OPENAI_API_KEY) {
            try {
              const imageModeration = await callOpenAIModeration([
                {
                  type: "input_image",
                  image_url: attachment.dataUrl,
                },
              ]);
              if (imageModeration.flagged) {
                imageModeration.categories.forEach((item) => categorySet.add(item));
                reasons.push(`${attachment.name}: image moderation flagged content.`);
              }
            } catch {
              requiresManualReview = true;
              reasons.push(`${attachment.name}: image moderation unavailable, queued for review.`);
            }
          } else {
            requiresManualReview = true;
            reasons.push(`${attachment.name}: image requires manual moderation review.`);
          }
          continue;
        }

        if (decoded.mimeType.startsWith("audio/")) {
          if (OPENAI_API_KEY) {
            try {
              const transcript = await transcribeAudioAttachment({
                buffer: decoded.buffer,
                mimeType: decoded.mimeType,
                filename: attachment.name,
              });
              const audioRisk = evaluateHeuristicCommunityRisk(transcript);
              audioRisk.categories.forEach((item) => categorySet.add(item));
              audioRisk.reasons.forEach((item) =>
                reasons.push(`${attachment.name}: transcript check - ${item}`)
              );
            } catch {
              requiresManualReview = true;
              reasons.push(`${attachment.name}: audio moderation unavailable, queued for review.`);
            }
          } else {
            requiresManualReview = true;
            reasons.push(`${attachment.name}: audio requires manual moderation review.`);
          }
          continue;
        }

        if (decoded.mimeType.startsWith("video/")) {
          requiresManualReview = true;
          reasons.push(`${attachment.name}: video requires manual moderation review.`);
          continue;
        }

        requiresManualReview = true;
        reasons.push(`${attachment.name}: unsupported binary type queued for manual review.`);
      } catch {
        categorySet.add("invalid_attachment");
        reasons.push(`${attachment.name}: invalid attachment payload.`);
      }
      continue;
    }

    if (attachment.kind === "video" || attachment.kind === "audio" || attachment.kind === "camera") {
      requiresManualReview = true;
      reasons.push(`${attachment.name}: media metadata submission queued for manual review.`);
    }
  }

  const categories = [...categorySet];
  const verdict = decideCommunityVerdict(categories, requiresManualReview);
  return {
    verdict,
    categories,
    reasons: reasons.slice(0, 12),
    provider,
  };
}

function moderationMessageForVerdict(verdict) {
  if (verdict === "blocked") {
    return "Submission blocked by safety filters.";
  }
  if (verdict === "pending_review") {
    return "Submission queued for moderation review.";
  }
  return "Submission published.";
}

async function issueAuthSession(user, req) {
  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshSession({
    userId: user.id,
    ttlMs: REFRESH_TOKEN_TTL_MS,
    userAgent: req.headers?.["user-agent"] || "",
    ip: getRequestIp(req),
  });
  return {
    user,
    accessToken,
    refreshToken: refresh.refreshToken,
    tokenType: "Bearer",
    accessTokenExpiresIn: JWT_EXPIRES_IN,
    refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
  };
}

async function buildUniqueSocialUsername(provider, email) {
  const emailPrefix = sanitizeUsername(String(email || "").split("@")[0] || "member");
  const providerPrefix = sanitizeUsername(provider || "social");
  let candidate = sanitizeUsername(`${providerPrefix}_${emailPrefix}`) || `${providerPrefix}_user`;
  candidate = candidate.slice(0, 40);
  if (!candidate) candidate = `${providerPrefix}_user`;

  const collision = await findPublicAuthUserByIdentifier(candidate);
  if (!collision) return candidate;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomBytes(2).toString("hex");
    const next = sanitizeUsername(`${candidate.slice(0, 34)}_${suffix}`).slice(0, 40);
    if (!next) continue;
    const exists = await findPublicAuthUserByIdentifier(next);
    if (!exists) return next;
  }

  return sanitizeUsername(`social_${Date.now()}`).slice(0, 40);
}

async function verifyGoogleIdToken(idToken = "") {
  const token = String(idToken || "").trim();
  if (!token) {
    throw new Error("Google ID token is required.");
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`;
  const response = await fetch(verifyUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Google token verification failed.");
  }

  const payload = await response.json();
  if (String(payload?.aud || "") !== GOOGLE_CLIENT_ID) {
    throw new Error("Google token audience mismatch.");
  }
  const email = sanitizeEmail(payload?.email || "");
  if (!isValidEmail(email)) {
    throw new Error("Google account email is invalid.");
  }
  const emailVerified = String(payload?.email_verified || "").toLowerCase();
  if (emailVerified !== "true") {
    throw new Error("Google account email is not verified.");
  }

  return {
    email,
    displayName: cleanTextLimited(payload?.name || "", 80) || email.split("@")[0],
    providerUserId: cleanTextLimited(payload?.sub || "", 80),
    picture: cleanTextLimited(payload?.picture || "", 240),
  };
}

function getAuthDeskUserId(req) {
  return normalizeDeskUserId(req.authUser?.email || req.authUser?.username || "");
}

function buildCommunityHandleFromUser(user) {
  const base = cleanTextLimited(user?.username || user?.displayName || "member", 40)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return `@${base || "member"}`;
}

function requireAdmin(req, res, next) {
  const role = String(req.authUser?.role || "").toLowerCase();
  if (role !== "admin") {
    forbidden(res, "Admin role is required.");
    return;
  }
  next();
}

function resolveAuthorizedDeskUserId(req, res, requestedUserId = "") {
  const authDeskUserId = getAuthDeskUserId(req);
  const targetDeskUserId = normalizeDeskUserId(requestedUserId || authDeskUserId);
  const isAdmin = String(req.authUser?.role || "").toLowerCase() === "admin";

  if (!isAdmin && authDeskUserId !== targetDeskUserId) {
    forbidden(res, "You can only access your own desk.");
    return "";
  }
  return targetDeskUserId;
}

const stripTags = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const decodeHtmlEntities = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function unwrapDuckDuckGoUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const absolute = rawUrl.startsWith("http")
      ? rawUrl
      : `https://duckduckgo.com${rawUrl}`;
    const parsed = new URL(absolute);
    const encodedTarget = parsed.searchParams.get("uddg");
    if (encodedTarget) {
      return decodeURIComponent(encodedTarget);
    }
    return absolute;
  } catch {
    return rawUrl;
  }
}

async function searchWeb(query, limit = 8) {
  if (!ENABLE_WEB_SEARCH) {
    throw new Error("Web search is disabled in compliance mode.");
  }
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NayaySetuBot/1.0)",
      Accept: "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Search provider returned ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) && results.length < limit) {
    const rawUrl = match[1] || "";
    const titleHtml = match[2] || "";
    const nextSlice = html.slice(match.index, match.index + 1200);
    const snippetMatch = nextSlice.match(
      /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i
    );

    const cleanUrl = unwrapDuckDuckGoUrl(rawUrl);
    if (!cleanUrl.startsWith("http")) {
      continue;
    }

    const title = decodeHtmlEntities(stripTags(titleHtml));
    const snippet = decodeHtmlEntities(stripTags(snippetMatch?.[1] || snippetMatch?.[2] || ""));

    if (!title) {
      continue;
    }

    results.push({
      title,
      url: cleanUrl,
      snippet,
      domain: extractDomain(cleanUrl),
    });
  }

  return results;
}

function inferEmergencyLine(query) {
  const q = String(query || "").toLowerCase();
  if (/cyber|upi|online\s*scam|fraud/.test(q)) return "Cyber Fraud Helpline 1930";
  if (/domestic\s*violence|women|sexual|harassment/.test(q)) return "Women Helpline 181 / 1091";
  if (/child|minor/.test(q)) return "Child Helpline 1098";
  if (/ambulance|accident|injury|medical/.test(q)) return "Ambulance 102 / 108";
  if (/fire|burn|smoke/.test(q)) return "Fire 101";
  if (/threat|violence|fir|police|theft|emergency/.test(q)) return "Police 100 / 112";
  return "";
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value <= 0) return "0 KB";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1000))} KB`;
}

function normalizeAttachmentText(value, max = MAX_ATTACHMENT_TEXT_CHARS) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, Math.max(0, max));
}

const ALLOWED_ATTACHMENT_KINDS = new Set([
  "file",
  "audio",
  "video",
  "camera",
  "microphone",
]);
const ALLOWED_PAYLOAD_TYPES = new Set(["metadata", "text", "data-url"]);

function normalizeIncomingAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > MAX_ATTACHMENTS) {
    throw new Error(`Attachments limit exceeded. Max ${MAX_ATTACHMENTS} attachments are allowed.`);
  }

  return raw.map((item, index) => {
    const kindRaw = cleanTextLimited(item?.kind, 24).toLowerCase();
    const payloadTypeRaw = cleanTextLimited(item?.payloadType, 24).toLowerCase();
    const sizeRaw = Number(item?.size || 0);
    const normalized = {
      name: cleanTextLimited(item?.name, 120) || `attachment-${index + 1}`,
      kind: ALLOWED_ATTACHMENT_KINDS.has(kindRaw) ? kindRaw : "file",
      type: cleanTextLimited(item?.type, 120).toLowerCase(),
      size: Number.isFinite(sizeRaw) ? Math.max(0, sizeRaw) : 0,
      payloadType: ALLOWED_PAYLOAD_TYPES.has(payloadTypeRaw) ? payloadTypeRaw : "metadata",
      note: cleanTextLimited(item?.note, 240),
      textContent: "",
      dataUrl: "",
    };

    if (normalized.payloadType === "text") {
      normalized.textContent = normalizeAttachmentText(item?.textContent);
    }

    if (normalized.payloadType === "data-url") {
      const rawDataUrl = String(item?.dataUrl || "");
      if (!rawDataUrl) {
        throw new Error(`Attachment "${normalized.name}" has empty content payload.`);
      }
      if (rawDataUrl.length > MAX_DATA_URL_LENGTH) {
        throw new Error(
          `Attachment "${normalized.name}" exceeds payload size limit (${formatBytes(MAX_ATTACHMENT_BYTES)}).`
        );
      }
      normalized.dataUrl = rawDataUrl;
    }

    return normalized;
  });
}

function decodeDataUrl(dataUrl) {
  const compact = String(dataUrl || "").replace(/\s+/g, "");
  const match = compact.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("Unsupported attachment format.");
  }

  const mimeType = String(match[1] || "").toLowerCase();
  const buffer = Buffer.from(match[2] || "", "base64");
  if (!buffer.length) {
    throw new Error("Attachment content is empty.");
  }
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds ${formatBytes(MAX_ATTACHMENT_BYTES)}.`);
  }

  return { mimeType, buffer };
}

async function describeImageAttachment(dataUrl) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "You summarize image evidence for legal workflows in India. Keep response concise and factual.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract visible text and key facts from this image that can help draft a legal complaint. Mention if unreadable.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `OpenAI image analysis error ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return normalizeAttachmentText(content, 900);
}

async function transcribeAudioAttachment({ buffer, mimeType, filename }) {
  const formData = new FormData();
  formData.set("model", "gpt-4o-mini-transcribe");
  formData.set("response_format", "text");
  formData.set(
    "file",
    new Blob([buffer], { type: mimeType || "audio/webm" }),
    filename || "audio-note.webm"
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `OpenAI transcription error ${response.status}`);
  }

  const text = await response.text();
  return normalizeAttachmentText(text, 1200);
}

async function buildAttachmentInsights(attachments) {
  if (!attachments.length) return [];

  const insights = [];
  let totalBinaryBytes = 0;

  for (const item of attachments) {
    const label = `${item.name} (${item.kind})`;

    if (item.payloadType === "text" && item.textContent) {
      insights.push(`${label}: ${normalizeAttachmentText(item.textContent, 900)}`);
      continue;
    }

    if (item.payloadType === "data-url" && item.dataUrl) {
      const decoded = decodeDataUrl(item.dataUrl);
      totalBinaryBytes += decoded.buffer.length;
      if (totalBinaryBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        throw new Error(
          `Total attachment payload exceeds ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.`
        );
      }

      if (OPENAI_API_KEY && decoded.mimeType.startsWith("image/")) {
        try {
          const imageSummary = await describeImageAttachment(item.dataUrl);
          if (imageSummary) {
            insights.push(`${label}: OCR summary - ${imageSummary}`);
            continue;
          }
        } catch {
          // Continue to non-AI fallback insight below.
        }
      }

      if (
        OPENAI_API_KEY &&
        (decoded.mimeType.startsWith("audio/") || item.kind === "microphone")
      ) {
        try {
          const transcript = await transcribeAudioAttachment({
            buffer: decoded.buffer,
            mimeType: decoded.mimeType,
            filename: item.name,
          });
          if (transcript) {
            insights.push(`${label}: Transcript - ${transcript}`);
            continue;
          }
        } catch {
          // Continue to non-AI fallback insight below.
        }
      }

      if (decoded.mimeType.startsWith("video/")) {
        insights.push(`${label}: Video attached. Add key timestamps in text for analysis.`);
      } else if (decoded.mimeType.includes("pdf")) {
        insights.push(`${label}: PDF attached. Add copied text for full analysis.`);
      } else if (decoded.mimeType.startsWith("image/")) {
        insights.push(`${label}: Image attached. OCR needs API key access.`);
      } else if (decoded.mimeType.startsWith("audio/")) {
        insights.push(`${label}: Audio attached. Transcription needs API key access.`);
      } else {
        insights.push(`${label}: Binary file attached (${decoded.mimeType || "unknown format"}).`);
      }
      continue;
    }

    if (item.note) {
      insights.push(`${label}: ${item.note}`);
    } else {
      insights.push(`${label}: Metadata attached.`);
    }
  }

  return insights.slice(0, 6);
}

function fallbackAssistantReply(query, attachmentInsights = []) {
  const attachmentHint = attachmentInsights.length
    ? ` Shared file context: ${attachmentInsights.slice(0, 2).join(" ")}`
    : "";

  return {
    now: "Share issue type, city/state, and urgency in one line.",
    next24h: "Preserve evidence and file with the correct authority immediately.",
    docs: `Keep ID proof, incident timeline, notices/messages, payment proofs, and witness details.${attachmentHint}`,
    fileAt: "Depends on issue: police station, magistrate/family/civil court, labor office, or cyber portal.",
    emergencyLine: inferEmergencyLine(query),
  };
}

async function callOpenAIForAssistant({
  query,
  instruction,
  attachments,
  attachmentInsights,
  webSources,
}) {
  const contextBlock = webSources
    .map((item, index) => `${index + 1}. ${item.title} | ${item.url} | ${item.snippet}`)
    .join("\n");

  const systemPrompt = [
    "You are an Indian legal information assistant.",
    "Return JSON only with keys: now, next24h, docs, fileAt, emergencyLine.",
    "Keep each key concise, practical, and legally safe (general legal information, not legal advice).",
    "If query is ambiguous, still provide best provisional steps and mention what extra details user should add.",
    "Prefer India-specific filing authorities and helplines when relevant.",
  ].join(" ");

  const userPrompt = [
    `User query: ${query}`,
    instruction ? `User instruction: ${instruction}` : "",
    attachments?.length
      ? `Attached files: ${attachments.map((item) => `${item.name} (${item.kind})`).join(", ")}`
      : "",
    attachmentInsights?.length
      ? `Attachment insights:\n${attachmentInsights.map((item, index) => `${index + 1}. ${item}`).join("\n")}`
      : "",
    contextBlock ? `Recent web context:\n${contextBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `OpenAI API error ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = JSON.parse(content);

  return {
    now: String(parsed.now || "").trim(),
    next24h: String(parsed.next24h || "").trim(),
    docs: String(parsed.docs || "").trim(),
    fileAt: String(parsed.fileAt || "").trim(),
    emergencyLine: String(parsed.emergencyLine || "").trim(),
  };
}

async function generateAssistantResponse({
  query,
  instruction,
  attachments,
  onStatus,
}) {
  const emit = (message) => {
    if (typeof onStatus === "function") {
      onStatus(String(message || "").trim());
    }
  };

  emit("Validating inputs...");

  emit("Processing attachments...");
  let attachmentInsights = [];
  try {
    attachmentInsights = await buildAttachmentInsights(attachments);
  } catch (error) {
    const message = String(error?.message || "Could not process attachment payload.");
    const attachError = new Error(message);
    attachError.code = "ATTACHMENT_PROCESSING_FAILED";
    throw attachError;
  }

  emit("Collecting legal context...");
  let webSources = [];
  try {
    webSources = await searchWeb(`${query} India legal rights complaint process`, 6);
  } catch {
    webSources = [];
  }

  const fallback = fallbackAssistantReply(query, attachmentInsights);
  if (!OPENAI_API_KEY) {
    return {
      mode: "fallback-no-openai-key",
      answer: fallback,
      sources: webSources,
      attachmentInsights,
    };
  }

  emit("Generating AI response...");
  try {
    const aiAnswer = await callOpenAIForAssistant({
      query,
      instruction,
      attachments,
      attachmentInsights,
      webSources,
    });

    return {
      mode: "ai",
      answer: {
        ...fallback,
        ...aiAnswer,
      },
      sources: webSources,
      attachmentInsights,
    };
  } catch (error) {
    return {
      mode: "fallback-openai-error",
      answer: fallback,
      sources: webSources,
      attachmentInsights,
      error: String(error?.message || "Unknown AI error"),
    };
  }
}

function normalizeUrlForCheck(value) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const next = raw.startsWith("http") ? raw : `https://${raw}`;
    return new URL(next).toString();
  } catch {
    return "";
  }
}

function fallbackCasePlan({ caseTitle, caseStatus, nextHearingDate, notes }) {
  const safeTitle = cleanTextLimited(caseTitle, 120) || "your case";
  const safeStatus = cleanTextLimited(caseStatus, 120) || "under review";
  const safeDate = cleanTextLimited(nextHearingDate, 32) || "not scheduled";
  const noteHint = cleanTextLimited(notes, 220);

  return {
    summary: `Case "${safeTitle}" is currently marked as "${safeStatus}". Next hearing: ${safeDate}.`,
    actions: [
      "Verify latest order/cause list on official eCourts links before filing any application.",
      "Keep all annexures and evidence indexed and hearing-ready in one folder.",
      "Prepare a short chronology of events with date-wise proof references.",
    ],
    risks: [
      "Missed filing or hearing deadlines can impact case progress.",
      "Unverified third-party links can lead to misinformation.",
      "Incomplete documents may delay relief.",
    ],
    preparation: noteHint
      ? `Current note considered: ${noteHint}`
      : "Add case notes to generate a more specific preparation plan.",
    disclaimer:
      "General legal workflow guidance only. Consult your advocate for final case strategy.",
  };
}

async function callOpenAIForCasePlan({
  caseTitle,
  caseStatus,
  nextHearingDate,
  notes,
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You assist with Indian legal case workflow planning.",
            "Return JSON only with keys: summary, actions, risks, preparation, disclaimer.",
            "Do not provide final legal advice. Keep practical and conservative steps.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Case title: ${cleanTextLimited(caseTitle, 120)}`,
            `Case status: ${cleanTextLimited(caseStatus, 120)}`,
            `Next hearing date: ${cleanTextLimited(nextHearingDate, 32) || "not specified"}`,
            `Case notes: ${cleanTextLimited(notes, 1200) || "none"}`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `OpenAI case-plan error ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty case plan.");
  }
  const parsed = JSON.parse(content);
  const actions = Array.isArray(parsed.actions)
    ? parsed.actions.map((item) => cleanTextLimited(item, 220)).filter(Boolean).slice(0, 5)
    : [];
  const risks = Array.isArray(parsed.risks)
    ? parsed.risks.map((item) => cleanTextLimited(item, 220)).filter(Boolean).slice(0, 5)
    : [];

  return {
    summary: cleanTextLimited(parsed.summary, 500),
    actions,
    risks,
    preparation: cleanTextLimited(parsed.preparation, 600),
    disclaimer:
      cleanTextLimited(parsed.disclaimer, 240) ||
      "General legal workflow guidance only. Consult your advocate for final case strategy.",
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasOpenAiKey: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL,
    webSearchEnabled: ENABLE_WEB_SEARCH,
  });
});

app.get("/api/ready", async (_req, res) => {
  try {
    // DB-backed module check.
    await getCommunityData("");
    await ensureNayaySetuMongoSchema();
    res.json({
      ok: true,
      ready: true,
      hasOpenAiKey: Boolean(OPENAI_API_KEY),
      model: OPENAI_MODEL,
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      ready: false,
      error: String(error?.message || "Server dependency is not ready."),
    });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const username = sanitizeUsername(cleanTextLimited(req.body?.username, 40));
  const displayName = cleanTextLimited(req.body?.displayName, 80);
  const email = sanitizeEmail(cleanTextLimited(req.body?.email, 120));
  const password = String(req.body?.password || "");

  if (!username || !displayName || !email || !password) {
    badRequest(res, "username, displayName, email and password are required.");
    return;
  }
  if (!isValidEmail(email)) {
    badRequest(res, "Valid email is required.");
    return;
  }
  if (password.length < 8) {
    badRequest(res, "Password must be at least 8 characters.");
    return;
  }

  try {
    const user = await registerAuthUser({
      username,
      displayName,
      email,
      password,
      role: "user",
    });
    const session = await issueAuthSession(user, req);
    res.status(201).json(session);
  } catch (error) {
    const message = String(error?.message || "Could not create account.");
    if (message.toLowerCase().includes("exists")) {
      res.status(409).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = cleanTextLimited(req.body?.identifier, 160);
  const password = String(req.body?.password || "");

  if (!identifier || !password) {
    badRequest(res, "identifier and password are required.");
    return;
  }

  const user = await validateAuthCredentials(identifier, password);
  if (!user) {
    unauthorized(res, "Invalid credentials.");
    return;
  }

  const session = await issueAuthSession(user, req);
  res.json(session);
});

app.post("/api/auth/social", async (req, res) => {
  if (!ENABLE_DEMO_SOCIAL_AUTH) {
    forbidden(
      res,
      "Social auth is disabled. Use username/password login or enable demo social auth."
    );
    return;
  }

  const provider = cleanTextLimited(req.body?.provider, 30).toLowerCase();
  const allowedProviders = new Set(["google", "facebook", "twitter", "linkedin"]);
  if (!allowedProviders.has(provider)) {
    badRequest(res, "Supported providers: google, facebook, twitter, linkedin.");
    return;
  }

  const email = sanitizeEmail(cleanTextLimited(req.body?.email, 120));
  if (!isValidEmail(email)) {
    badRequest(res, "Valid email is required for social auth.");
    return;
  }

  const inputDisplayName = cleanTextLimited(req.body?.displayName, 80);
  const inferredName = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  const displayName = inputDisplayName || inferredName || `${provider} member`;

  try {
    let user = await findPublicAuthUserByIdentifier(email);
    if (!user) {
      const username = await buildUniqueSocialUsername(provider, email);
      user = await registerAuthUser({
        username,
        displayName,
        email,
        password: randomBytes(24).toString("hex"),
        role: "user",
      });
    }

    const session = await issueAuthSession(user, req);
    res.json({
      ...session,
      provider,
      mode: "demo-social-auth",
    });
  } catch (error) {
    res.status(500).json({
      error: String(error?.message || "Could not process social auth."),
    });
  }
});

app.post("/api/auth/google", async (req, res) => {
  if (!ENABLE_GOOGLE_AUTH) {
    forbidden(res, "Google auth is disabled by server configuration.");
    return;
  }

  const idToken = cleanTextLimited(req.body?.idToken, 4096);
  if (!idToken) {
    badRequest(res, "idToken is required.");
    return;
  }

  try {
    const googleProfile = await verifyGoogleIdToken(idToken);
    let user = await findPublicAuthUserByIdentifier(googleProfile.email);
    if (!user) {
      const username = await buildUniqueSocialUsername("google", googleProfile.email);
      user = await registerAuthUser({
        username,
        displayName: googleProfile.displayName,
        email: googleProfile.email,
        password: randomBytes(24).toString("hex"),
        role: "user",
      });
    }

    const session = await issueAuthSession(user, req);
    res.json({
      ...session,
      provider: "google",
      mode: "oauth-google",
    });
  } catch (error) {
    const message = String(error?.message || "Google auth failed.");
    if (
      message.toLowerCase().includes("required") ||
      message.toLowerCase().includes("mismatch") ||
      message.toLowerCase().includes("invalid") ||
      message.toLowerCase().includes("failed")
    ) {
      unauthorized(res, message);
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: req.authUser,
  });
});

app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = cleanTextLimited(req.body?.refreshToken, 500);
  if (!refreshToken) {
    badRequest(res, "refreshToken is required.");
    return;
  }

  try {
    const rotated = await rotateRefreshSession({
      refreshToken,
      ttlMs: REFRESH_TOKEN_TTL_MS,
      userAgent: req.headers?.["user-agent"] || "",
      ip: getRequestIp(req),
    });
    const user = await getPublicUserById(rotated.userId);
    if (!user) {
      await revokeRefreshSession(rotated.refreshToken, "orphaned-user");
      unauthorized(res, "User session is no longer valid.");
      return;
    }

    res.json({
      user,
      accessToken: signAccessToken(user),
      refreshToken: rotated.refreshToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: JWT_EXPIRES_IN,
      refreshTokenExpiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
  } catch (error) {
    const code = String(error?.code || "");
    if (
      code === "REFRESH_NOT_FOUND" ||
      code === "REFRESH_REVOKED" ||
      code === "REFRESH_EXPIRED"
    ) {
      unauthorized(res, "Refresh token expired or invalid.");
      return;
    }
    res.status(500).json({ error: String(error?.message || "Could not refresh session.") });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const refreshToken = cleanTextLimited(req.body?.refreshToken, 500);
  const authUser = await resolveUserFromAccessToken(req);
  let revokedCount = 0;

  if (refreshToken) {
    const revoked = await revokeRefreshSession(refreshToken, "logout");
    revokedCount += revoked.revoked ? 1 : 0;
  } else if (authUser?.id) {
    const result = await revokeAllRefreshSessionsForUser(authUser.id, "logout");
    revokedCount += result.revokedCount || 0;
  }

  res.json({
    ok: true,
    revokedCount,
  });
});

app.post("/api/auth/logout-all", requireAuth, async (req, res) => {
  const result = await revokeAllRefreshSessionsForUser(req.authUser.id, "logout_all");
  res.json({
    ok: true,
    revokedCount: result.revokedCount || 0,
  });
});

app.get("/api/auth/sessions", requireAuth, async (req, res) => {
  const sessions = await listRefreshSessionsForUser(req.authUser.id, 50);
  res.json({ sessions });
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await listPublicAuthUsers();
  res.json({ users });
});

app.get("/api/compliance/policy", async (_req, res) => {
  const policy = await getActivePolicyVersion();
  res.json({
    ...COMPLIANCE_POLICY,
    officialDomains: getOfficialDomainAllowlist(),
    sourceAttribution:
      "Official service metadata references Department of Justice, eCourts, and NALSA public portals.",
    deskStoreMode: getJusticeDeskStoreMode(),
    policyVersion: policy.activeVersion || null,
  });
});

app.get("/api/admin/policies", requireAuth, requireAdmin, async (_req, res) => {
  const versions = await listPolicyVersions({ includeContent: true });
  const audit = await listPolicyAudit(120);
  res.json({
    ...versions,
    audit,
  });
});

app.post("/api/admin/policies/publish", requireAuth, requireAdmin, async (req, res) => {
  const result = await publishPolicyVersion({
    versionLabel: cleanTextLimited(req.body?.versionLabel, 40),
    effectiveFrom: cleanTextLimited(req.body?.effectiveFrom, 20),
    note: cleanTextLimited(req.body?.note, 240),
    terms: Array.isArray(req.body?.terms) ? req.body.terms : req.body?.termsText,
    privacy: Array.isArray(req.body?.privacy) ? req.body.privacy : req.body?.privacyText,
    retention: Array.isArray(req.body?.retention)
      ? req.body.retention
      : req.body?.retentionText,
    actor: req.authUser?.displayName || req.authUser?.username || "Admin",
  });
  const audit = await listPolicyAudit(120);
  res.status(201).json({
    ...result,
    audit,
  });
});

app.post(
  "/api/admin/policies/activate/:versionId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const versionId = cleanTextLimited(req.params?.versionId, 80);
    if (!versionId) {
      badRequest(res, "Version id is required.");
      return;
    }
    try {
      const result = await activatePolicyVersion({
        versionId,
        note: cleanTextLimited(req.body?.note, 240),
        actor: req.authUser?.displayName || req.authUser?.username || "Admin",
      });
      const audit = await listPolicyAudit(120);
      res.json({
        ...result,
        audit,
      });
    } catch (error) {
      const message = String(error?.message || "Could not activate policy version.");
      if (message.toLowerCase().includes("not found")) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  }
);

app.get("/api/justice/services", (_req, res) => {
  res.json({
    services: JUSTICE_SERVICE_CATALOG.map((item) => ({
      ...item,
      isOfficialDomain: isOfficialServiceUrl(item.url),
    })),
    officialDomains: getOfficialDomainAllowlist(),
  });
});

app.post("/api/justice/route", (req, res) => {
  const query = cleanTextLimited(req.body?.query, 600);
  const problemType = cleanTextLimited(req.body?.problemType, 80).toLowerCase();
  const urgency = cleanTextLimited(req.body?.urgency, 20).toLowerCase() || "medium";

  if (!query && !problemType) {
    badRequest(res, "Please provide query or problemType for routing.");
    return;
  }

  const route = buildJusticeRoute({
    query,
    problemType,
    urgency,
  });

  res.json({
    route,
    legalNotice: COMPLIANCE_POLICY.legalNotice,
  });
});

app.get("/api/justice/link/verify", (req, res) => {
  const url = normalizeUrlForCheck(req.query?.url);
  if (!url) {
    badRequest(res, "Valid URL is required.");
    return;
  }
  const isOfficial = isOfficialServiceUrl(url);
  res.json({
    url,
    isOfficial,
    recommendation: isOfficial
      ? "Trusted official domain."
      : "Unverified domain. Confirm manually before sharing personal/legal data.",
  });
});

app.get("/api/justice/legal-aid", (_req, res) => {
  res.json({
    channels: LEGAL_AID_CHANNELS.map((item) => ({
      ...item,
      isOfficialDomain: isOfficialServiceUrl(item.url),
    })),
    legalNotice: COMPLIANCE_POLICY.legalNotice,
  });
});

app.get("/api/justice/njdg-insights", (_req, res) => {
  res.json({
    title: "NJDG Insight Guide",
    officialUrl: "https://njdg.ecourts.gov.in/njdg_v3/",
    isOfficialDomain: true,
    facets: NJDG_INSIGHT_FACETS,
    note:
      "Use NJDG for aggregate judiciary trends. Case-specific decisions should rely on court records and orders.",
  });
});

app.post("/api/justice/case-plan", requireAuth, async (req, res) => {
  const caseTitle = cleanTextLimited(req.body?.caseTitle, 120);
  const caseStatus = cleanTextLimited(req.body?.caseStatus, 120);
  const nextHearingDate = cleanTextLimited(req.body?.nextHearingDate, 32);
  const notes = cleanTextLimited(req.body?.notes, 1200);

  if (!caseTitle && !notes) {
    badRequest(res, "Provide caseTitle or notes.");
    return;
  }

  const fallback = fallbackCasePlan({
    caseTitle,
    caseStatus,
    nextHearingDate,
    notes,
  });

  if (!OPENAI_API_KEY) {
    res.json({
      mode: "fallback-no-openai-key",
      plan: fallback,
    });
    return;
  }

  try {
    const aiPlan = await callOpenAIForCasePlan({
      caseTitle,
      caseStatus,
      nextHearingDate,
      notes,
    });
    res.json({
      mode: "ai",
      plan: {
        ...fallback,
        ...aiPlan,
      },
    });
  } catch (error) {
    res.json({
      mode: "fallback-openai-error",
      plan: fallback,
      error: String(error?.message || "Unknown AI error"),
    });
  }
});

app.get("/api/justice/desk/:userId", requireAuth, async (req, res) => {
  const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
  if (!userId) return;
  const desk = await getJusticeDesk(userId);
  res.json(desk);
});

app.post("/api/justice/desk/:userId/cases", requireAuth, async (req, res) => {
  const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
  if (!userId) return;
  const title = cleanTextLimited(req.body?.title, 140);
  if (!title) {
    badRequest(res, "Case title is required.");
    return;
  }
  const payload = {
    title,
    cnrNumber: cleanTextLimited(req.body?.cnrNumber, 48),
    court: cleanTextLimited(req.body?.court, 140),
    status: cleanTextLimited(req.body?.status, 80),
    nextHearingDate: cleanTextLimited(req.body?.nextHearingDate, 32),
    notes: cleanTextLimited(req.body?.notes, 800),
  };
  const result = await addJusticeCase(userId, payload);
  res.status(201).json(result);
});

app.patch("/api/justice/desk/:userId/cases/:caseId", requireAuth, async (req, res) => {
  const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
  if (!userId) return;
  const caseId = cleanTextLimited(req.params?.caseId, 80);
  if (!caseId) {
    badRequest(res, "Case id is required.");
    return;
  }
  const patch = {
    title: cleanTextLimited(req.body?.title, 140),
    cnrNumber: cleanTextLimited(req.body?.cnrNumber, 48),
    court: cleanTextLimited(req.body?.court, 140),
    status: cleanTextLimited(req.body?.status, 80),
    nextHearingDate: cleanTextLimited(req.body?.nextHearingDate, 32),
    notes: cleanTextLimited(req.body?.notes, 800),
    aiPlan: cleanTextLimited(req.body?.aiPlan, 2500),
  };
  const result = await updateJusticeCase(userId, caseId, patch);
  if (!result.case) {
    res.status(404).json({ error: "Case not found." });
    return;
  }
  res.json(result);
});

app.delete("/api/justice/desk/:userId/cases/:caseId", requireAuth, async (req, res) => {
  const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
  if (!userId) return;
  const caseId = cleanTextLimited(req.params?.caseId, 80);
  if (!caseId) {
    badRequest(res, "Case id is required.");
    return;
  }
  const result = await deleteJusticeCase(userId, caseId);
  res.json(result);
});

app.post("/api/justice/desk/:userId/reminders", requireAuth, async (req, res) => {
  const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
  if (!userId) return;
  const title = cleanTextLimited(req.body?.title, 140);
  if (!title) {
    badRequest(res, "Reminder title is required.");
    return;
  }
  const payload = {
    title,
    dueDate: cleanTextLimited(req.body?.dueDate, 32),
    done: Boolean(req.body?.done),
    channel: cleanTextLimited(req.body?.channel, 20),
  };
  const result = await addJusticeReminder(userId, payload);
  res.status(201).json(result);
});

app.patch(
  "/api/justice/desk/:userId/reminders/:reminderId",
  requireAuth,
  async (req, res) => {
    const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
    if (!userId) return;
    const reminderId = cleanTextLimited(req.params?.reminderId, 80);
    if (!reminderId) {
      badRequest(res, "Reminder id is required.");
      return;
    }
    const patch = {
      title: cleanTextLimited(req.body?.title, 140),
      dueDate: cleanTextLimited(req.body?.dueDate, 32),
      channel: cleanTextLimited(req.body?.channel, 20),
    };
    if (typeof req.body?.done === "boolean") {
      patch.done = req.body.done;
    }
    const result = await updateJusticeReminder(userId, reminderId, patch);
    if (!result.reminder) {
      res.status(404).json({ error: "Reminder not found." });
      return;
    }
    res.json(result);
  }
);

app.delete(
  "/api/justice/desk/:userId/reminders/:reminderId",
  requireAuth,
  async (req, res) => {
    const userId = resolveAuthorizedDeskUserId(req, res, req.params?.userId);
    if (!userId) return;
    const reminderId = cleanTextLimited(req.params?.reminderId, 80);
    if (!reminderId) {
      badRequest(res, "Reminder id is required.");
      return;
    }
    const result = await deleteJusticeReminder(userId, reminderId);
    res.json(result);
  }
);

app.get("/api/justice/desk/me", requireAuth, async (req, res) => {
  const userId = getAuthDeskUserId(req);
  const desk = await getJusticeDesk(userId);
  res.json(desk);
});

app.post("/api/justice/desk/me/cases", requireAuth, async (req, res) => {
  const title = cleanTextLimited(req.body?.title, 140);
  if (!title) {
    badRequest(res, "Case title is required.");
    return;
  }
  const payload = {
    title,
    cnrNumber: cleanTextLimited(req.body?.cnrNumber, 48),
    court: cleanTextLimited(req.body?.court, 140),
    status: cleanTextLimited(req.body?.status, 80),
    nextHearingDate: cleanTextLimited(req.body?.nextHearingDate, 32),
    notes: cleanTextLimited(req.body?.notes, 800),
  };
  const result = await addJusticeCase(getAuthDeskUserId(req), payload);
  res.status(201).json(result);
});

app.patch("/api/justice/desk/me/cases/:caseId", requireAuth, async (req, res) => {
  const caseId = cleanTextLimited(req.params?.caseId, 80);
  if (!caseId) {
    badRequest(res, "Case id is required.");
    return;
  }
  const patch = {
    title: cleanTextLimited(req.body?.title, 140),
    cnrNumber: cleanTextLimited(req.body?.cnrNumber, 48),
    court: cleanTextLimited(req.body?.court, 140),
    status: cleanTextLimited(req.body?.status, 80),
    nextHearingDate: cleanTextLimited(req.body?.nextHearingDate, 32),
    notes: cleanTextLimited(req.body?.notes, 800),
    aiPlan: cleanTextLimited(req.body?.aiPlan, 2500),
  };
  const result = await updateJusticeCase(getAuthDeskUserId(req), caseId, patch);
  if (!result.case) {
    res.status(404).json({ error: "Case not found." });
    return;
  }
  res.json(result);
});

app.delete("/api/justice/desk/me/cases/:caseId", requireAuth, async (req, res) => {
  const caseId = cleanTextLimited(req.params?.caseId, 80);
  if (!caseId) {
    badRequest(res, "Case id is required.");
    return;
  }
  const result = await deleteJusticeCase(getAuthDeskUserId(req), caseId);
  res.json(result);
});

app.post("/api/justice/desk/me/reminders", requireAuth, async (req, res) => {
  const title = cleanTextLimited(req.body?.title, 140);
  if (!title) {
    badRequest(res, "Reminder title is required.");
    return;
  }
  const payload = {
    title,
    dueDate: cleanTextLimited(req.body?.dueDate, 32),
    done: Boolean(req.body?.done),
    channel: cleanTextLimited(req.body?.channel, 20),
  };
  const result = await addJusticeReminder(getAuthDeskUserId(req), payload);
  res.status(201).json(result);
});

app.patch(
  "/api/justice/desk/me/reminders/:reminderId",
  requireAuth,
  async (req, res) => {
    const reminderId = cleanTextLimited(req.params?.reminderId, 80);
    if (!reminderId) {
      badRequest(res, "Reminder id is required.");
      return;
    }
    const patch = {
      title: cleanTextLimited(req.body?.title, 140),
      dueDate: cleanTextLimited(req.body?.dueDate, 32),
      channel: cleanTextLimited(req.body?.channel, 20),
    };
    if (typeof req.body?.done === "boolean") {
      patch.done = req.body.done;
    }
    const result = await updateJusticeReminder(getAuthDeskUserId(req), reminderId, patch);
    if (!result.reminder) {
      res.status(404).json({ error: "Reminder not found." });
      return;
    }
    res.json(result);
  }
);

app.delete(
  "/api/justice/desk/me/reminders/:reminderId",
  requireAuth,
  async (req, res) => {
    const reminderId = cleanTextLimited(req.params?.reminderId, 80);
    if (!reminderId) {
      badRequest(res, "Reminder id is required.");
      return;
    }
    const result = await deleteJusticeReminder(getAuthDeskUserId(req), reminderId);
    res.json(result);
  }
);

app.post("/api/assistant/query", async (req, res) => {
  const query = cleanText(req.body?.query);
  const instruction = cleanText(req.body?.instruction);
  const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  let attachments = [];

  if (!query) {
    badRequest(res, "Query is required.");
    return;
  }
  if (!validateMaxLength(query, 600)) {
    badRequest(res, "Query must be 600 characters or less.");
    return;
  }
  if (!validateMaxLength(instruction, 800)) {
    badRequest(res, "Instruction must be 800 characters or less.");
    return;
  }
  try {
    attachments = normalizeIncomingAttachments(attachmentsRaw);
  } catch (error) {
    badRequest(res, String(error?.message || "Invalid attachment payload."));
    return;
  }

  try {
    const response = await generateAssistantResponse({
      query,
      instruction,
      attachments,
    });
    res.json(response);
  } catch (error) {
    if (String(error?.code || "") === "ATTACHMENT_PROCESSING_FAILED") {
      badRequest(res, String(error?.message || "Could not process attachment payload."));
      return;
    }
    res.status(500).json({
      error: String(error?.message || "Could not generate assistant response."),
    });
  }
});

app.post("/api/assistant/query/stream", async (req, res) => {
  const query = cleanText(req.body?.query);
  const instruction = cleanText(req.body?.instruction);
  const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  let attachments = [];

  if (!query) {
    badRequest(res, "Query is required.");
    return;
  }
  if (!validateMaxLength(query, 600)) {
    badRequest(res, "Query must be 600 characters or less.");
    return;
  }
  if (!validateMaxLength(instruction, 800)) {
    badRequest(res, "Instruction must be 800 characters or less.");
    return;
  }
  try {
    attachments = normalizeIncomingAttachments(attachmentsRaw);
  } catch (error) {
    badRequest(res, String(error?.message || "Invalid attachment payload."));
    return;
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let clientClosed = false;
  req.on("close", () => {
    clientClosed = true;
  });

  const send = (payload) => {
    if (clientClosed || res.writableEnded) return;
    res.write(`${JSON.stringify(payload)}\n`);
  };

  send({
    type: "status",
    message: "Starting analysis...",
    at: new Date().toISOString(),
  });

  try {
    const response = await generateAssistantResponse({
      query,
      instruction,
      attachments,
      onStatus: (message) => {
        send({
          type: "status",
          message,
          at: new Date().toISOString(),
        });
      },
    });

    send({
      type: "result",
      ...response,
      at: new Date().toISOString(),
    });
    send({
      type: "done",
      at: new Date().toISOString(),
    });
  } catch (error) {
    send({
      type: "error",
      message: String(error?.message || "Assistant stream failed."),
      at: new Date().toISOString(),
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

app.get("/api/lawyers/search", async (req, res) => {
  const query = cleanTextLimited(req.query?.query, 120);
  const state = cleanTextLimited(req.query?.state, 80);
  const district = cleanTextLimited(req.query?.district, 80);
  const field = cleanTextLimited(req.query?.field, 80);

  const searchable = [query || "lawyer", field, district, state, "India"]
    .filter(Boolean)
    .join(" ");

  if (!ENABLE_WEB_SEARCH) {
    res.json({
      mode: "compliance-web-search-disabled",
      lawyers: [],
      sources: [],
      note:
        "Online web listing search is disabled in compliance mode. Use verified local directory and official portals.",
    });
    return;
  }

  try {
    const sources = await searchWeb(`${searchable} advocate contact`, 10);

    const lawyers = sources.map((item, index) => ({
      id: `online-${Date.now()}-${index}`,
      name: item.title,
      field: field || "General Practice",
      district: district || "Various",
      state: state || "Various",
      experience: "Online listing",
      source: item.domain,
      sourceUrl: item.url,
      summary: item.snippet || "Open source link to view profile/contact information.",
      phone: "",
      email: "",
    }));

    res.json({
      mode: "online",
      lawyers,
      sources,
    });
  } catch (error) {
    res.status(502).json({
      error: "Online lawyer search failed.",
      detail: String(error?.message || "Unknown search error"),
      lawyers: [],
      sources: [],
    });
  }
});

app.get("/api/rights/search", async (req, res) => {
  const query = cleanTextLimited(req.query?.query, 160);
  if (!query) {
    res.json({ rights: [], sources: [] });
    return;
  }

  if (!ENABLE_WEB_SEARCH) {
    res.json({
      mode: "compliance-web-search-disabled",
      rights: [],
      sources: [],
      note:
        "Online web rights search is disabled in compliance mode. Use official legal portals from Justice Router.",
    });
    return;
  }

  try {
    const sources = await searchWeb(`${query} India legal right law remedy`, 8);

    const rights = sources.map((item, index) => ({
      id: `right-${Date.now()}-${index}`,
      title: item.title,
      details: item.snippet || "Open source link for full legal text and practical guidance.",
      source: item.domain,
      sourceUrl: item.url,
    }));

    res.json({
      mode: "online",
      rights,
      sources,
    });
  } catch (error) {
    res.status(502).json({
      error: "Online rights search failed.",
      detail: String(error?.message || "Unknown search error"),
      rights: [],
      sources: [],
    });
  }
});

app.get("/api/community", async (req, res) => {
  const search = cleanTextLimited(req.query?.search, 120);

  try {
    const data = await getCommunityData(search);
    res.json({
      mode: "community-db",
      ...data,
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not load community data.",
      detail: String(error?.message || "Unknown community data error"),
    });
  }
});

app.post("/api/community/discussions", requireAuth, communityWriteRateLimiter, async (req, res) => {
  const title = cleanText(req.body?.title);
  const summary = cleanText(req.body?.summary);
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
  const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  let attachments = [];

  if (!(await enforceCommunityCaptcha(req, res))) return;
  if (
    !enforceCommunityActionPolicy(req, res, {
      action: "post",
      cooldownMs: COMMUNITY_POST_COOLDOWN_MS,
    })
  ) {
    return;
  }

  if (!title || !summary) {
    badRequest(res, "Title and summary are required.");
    return;
  }
  if (!validateMaxLength(title, 160)) {
    badRequest(res, "Title must be 160 characters or less.");
    return;
  }
  if (!validateMaxLength(summary, 1000)) {
    badRequest(res, "Summary must be 1000 characters or less.");
    return;
  }
  if (req.body?.tags != null && !Array.isArray(req.body?.tags)) {
    badRequest(res, "Tags must be an array.");
    return;
  }

  const normalizedTags = tags
    .map((item) => cleanTextLimited(item, 24))
    .filter(Boolean)
    .slice(0, 6);

  try {
    attachments = normalizeIncomingAttachments(attachmentsRaw);
  } catch (error) {
    badRequest(res, String(error?.message || "Invalid attachment payload."));
    return;
  }

  try {
    const moderation = await moderateCommunitySubmission({
      title,
      summary,
      text: "",
      attachments,
    });
    const discussion = await createDiscussion({
      title,
      summary,
      author: cleanTextLimited(
        req.authUser?.displayName || req.authUser?.username || "Community Member",
        80
      ),
      handle: buildCommunityHandleFromUser(req.authUser),
      tags: normalizedTags,
      status: moderation.verdict,
      moderation,
      attachments,
    });
    res.status(moderation.verdict === "published" ? 201 : 202).json({
      discussion,
      moderation: {
        verdict: moderation.verdict,
        categories: moderation.categories,
        reasons: moderation.reasons,
      },
      message: moderationMessageForVerdict(moderation.verdict),
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not create discussion.",
      detail: String(error?.message || "Unknown create discussion error"),
    });
  }
});

app.post("/api/community/discussions/:id/upvote", requireAuth, communityWriteRateLimiter, async (req, res) => {
  const id = cleanTextLimited(req.params?.id, 80);
  if (!id) {
    badRequest(res, "Discussion id is required.");
    return;
  }

  try {
    const discussion = await upvoteDiscussion(id);
    if (!discussion) {
      res.status(404).json({ error: "Discussion not found." });
      return;
    }
    res.json({ discussion });
  } catch (error) {
    res.status(500).json({
      error: "Could not upvote discussion.",
      detail: String(error?.message || "Unknown upvote error"),
    });
  }
});

app.post(
  "/api/community/discussions/:id/comments",
  requireAuth,
  communityWriteRateLimiter,
  async (req, res) => {
  const id = cleanTextLimited(req.params?.id, 80);
  const text = cleanText(req.body?.text);
  const attachmentsRaw = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  let attachments = [];

  if (!(await enforceCommunityCaptcha(req, res))) return;
  if (
    !enforceCommunityActionPolicy(req, res, {
      action: "comment",
      cooldownMs: COMMUNITY_COMMENT_COOLDOWN_MS,
    })
  ) {
    return;
  }

  if (!id) {
    badRequest(res, "Discussion id is required.");
    return;
  }
  if (!text) {
    badRequest(res, "Comment text is required.");
    return;
  }
  if (!validateMaxLength(text, 800)) {
    badRequest(res, "Comment text must be 800 characters or less.");
    return;
  }

  try {
    attachments = normalizeIncomingAttachments(attachmentsRaw);
  } catch (error) {
    badRequest(res, String(error?.message || "Invalid attachment payload."));
    return;
  }

  try {
    const moderation = await moderateCommunitySubmission({
      title: "",
      summary: "",
      text,
      attachments,
    });
    const discussion = await addDiscussionComment(id, {
      text,
      author: cleanTextLimited(
        req.authUser?.displayName || req.authUser?.username || "Community Member",
        80
      ),
      handle: buildCommunityHandleFromUser(req.authUser),
      status: moderation.verdict,
      moderation,
      attachments,
    });
    if (!discussion) {
      res.status(404).json({
        error: "Discussion not found or currently unavailable for comments.",
      });
      return;
    }
    res.status(moderation.verdict === "published" ? 201 : 202).json({
      discussion,
      moderation: {
        verdict: moderation.verdict,
        categories: moderation.categories,
        reasons: moderation.reasons,
      },
      message: moderationMessageForVerdict(moderation.verdict),
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not add comment.",
      detail: String(error?.message || "Unknown add comment error"),
    });
  }
  }
);

app.post(
  "/api/community/discussions/:id/report",
  requireAuth,
  communityWriteRateLimiter,
  async (req, res) => {
    const discussionId = cleanTextLimited(req.params?.id, 80);
    const reason = cleanTextLimited(req.body?.reason, 160) || "reported";
    const detail = cleanTextLimited(req.body?.detail, 600);

    if (!discussionId) {
      badRequest(res, "Discussion id is required.");
      return;
    }
    if (
      !enforceCommunityActionPolicy(req, res, {
        action: "report",
        cooldownMs: COMMUNITY_REPORT_COOLDOWN_MS,
        hourlyLimit: COMMUNITY_MAX_REPORTS_PER_HOUR,
      })
    ) {
      return;
    }

    try {
      const result = await addDiscussionReport(discussionId, {
        userId: cleanTextLimited(req.authUser?.id, 120),
        reason,
        detail,
        autoHideThreshold: COMMUNITY_REPORT_AUTO_HIDE_THRESHOLD,
      });
      if (!result) {
        res.status(404).json({ error: "Discussion not found." });
        return;
      }
      res.status(result.duplicate ? 200 : 201).json({
        reportAccepted: !result.duplicate,
        duplicate: Boolean(result.duplicate),
        autoHidden: Boolean(result.autoHidden),
        reportCount: Number(result.discussion?.reports?.count || 0),
      });
    } catch (error) {
      res.status(500).json({
        error: "Could not submit report.",
        detail: String(error?.message || "Unknown report error"),
      });
    }
  }
);

app.post(
  "/api/community/discussions/:id/comments/:commentId/report",
  requireAuth,
  communityWriteRateLimiter,
  async (req, res) => {
    const discussionId = cleanTextLimited(req.params?.id, 80);
    const commentId = cleanTextLimited(req.params?.commentId, 120);
    const reason = cleanTextLimited(req.body?.reason, 160) || "reported";
    const detail = cleanTextLimited(req.body?.detail, 600);

    if (!discussionId || !commentId) {
      badRequest(res, "Discussion id and comment id are required.");
      return;
    }
    if (
      !enforceCommunityActionPolicy(req, res, {
        action: "report",
        cooldownMs: COMMUNITY_REPORT_COOLDOWN_MS,
        hourlyLimit: COMMUNITY_MAX_REPORTS_PER_HOUR,
      })
    ) {
      return;
    }

    try {
      const result = await addCommentReport(discussionId, commentId, {
        userId: cleanTextLimited(req.authUser?.id, 120),
        reason,
        detail,
        autoHideThreshold: COMMUNITY_REPORT_AUTO_HIDE_THRESHOLD,
      });
      if (!result) {
        res.status(404).json({ error: "Comment not found." });
        return;
      }
      res.status(result.duplicate ? 200 : 201).json({
        reportAccepted: !result.duplicate,
        duplicate: Boolean(result.duplicate),
        autoHidden: Boolean(result.autoHidden),
        reportCount: Number(result.comment?.reports?.count || 0),
      });
    } catch (error) {
      res.status(500).json({
        error: "Could not submit report.",
        detail: String(error?.message || "Unknown report error"),
      });
    }
  }
);

app.get("/api/admin/community/review-queue", requireAuth, requireAdmin, async (req, res) => {
  try {
    const queue = await listCommunityReviewQueue(200);
    res.json(queue);
  } catch (error) {
    res.status(500).json({
      error: "Could not load community moderation queue.",
      detail: String(error?.message || "Unknown moderation queue error"),
    });
  }
});

app.post("/api/admin/community/review", requireAuth, requireAdmin, async (req, res) => {
  const targetType = cleanTextLimited(req.body?.targetType, 20).toLowerCase();
  const action = cleanTextLimited(req.body?.action, 20).toLowerCase();
  const note = cleanTextLimited(req.body?.note, 260);
  const actor = req.authUser?.displayName || req.authUser?.username || "Admin";

  if (!["discussion", "comment"].includes(targetType)) {
    badRequest(res, "targetType must be discussion or comment.");
    return;
  }
  if (!["approve", "reject", "hide", "unhide"].includes(action)) {
    badRequest(res, "action must be approve, reject, hide, or unhide.");
    return;
  }

  try {
    if (targetType === "discussion") {
      const discussionId = cleanTextLimited(req.body?.discussionId, 80);
      if (!discussionId) {
        badRequest(res, "discussionId is required.");
        return;
      }
      const discussion = await reviewDiscussionModeration({
        discussionId,
        action,
        actor,
        note,
      });
      if (!discussion) {
        res.status(404).json({ error: "Discussion not found." });
        return;
      }
      res.json({ discussion });
      return;
    }

    const discussionId = cleanTextLimited(req.body?.discussionId, 80);
    const commentId = cleanTextLimited(req.body?.commentId, 120);
    if (!discussionId || !commentId) {
      badRequest(res, "discussionId and commentId are required for comment review.");
      return;
    }
    const result = await reviewCommentModeration({
      discussionId,
      commentId,
      action,
      actor,
      note,
    });
    if (!result) {
      res.status(404).json({ error: "Comment not found." });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Could not apply moderation action.",
      detail: String(error?.message || "Unknown moderation action error"),
    });
  }
});

if (SERVE_STATIC && HAS_STATIC_BUILD) {
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(STATIC_INDEX_FILE);
  });
}

app.use("/api", (_req, res) => {
  res.status(404).json({
    error: "API route not found.",
  });
});

app.use((error, _req, res, next) => {
  void next;
  const message = String(error?.message || "Unexpected server error.");
  console.error("Unhandled API error:", message);
  if (res.headersSent) return;
  res.status(500).json({
    error: "Internal server error.",
    detail: IS_PRODUCTION ? undefined : message,
  });
});

if (IS_PRODUCTION && JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.error("FATAL: JWT_SECRET must be configured in production.");
  process.exit(1);
}

const server = app.listen(PORT, () => {
  if (JWT_SECRET === DEFAULT_JWT_SECRET) {
    console.warn("WARNING: Using default JWT secret. Set JWT_SECRET for production.");
  }
  if (REFRESH_TOKEN_TTL_MS < 60_000) {
    console.warn("WARNING: Refresh token expiry is too low. Increase REFRESH_TOKEN_EXPIRES_IN.");
  }
  if (!ENABLE_WEB_SEARCH) {
    console.log("Compliance mode: public web scraping/search is disabled.");
  }
  if (ENABLE_DEMO_SOCIAL_AUTH) {
    console.log("Demo social auth is enabled (email-based social sign-in for development).");
  }
  if (ENABLE_GOOGLE_AUTH) {
    if (GOOGLE_CLIENT_ID) {
      console.log("Google OAuth is enabled.");
    } else {
      console.warn("Google OAuth enabled but GOOGLE_CLIENT_ID is missing.");
    }
  }
  if (SERVE_STATIC) {
    if (HAS_STATIC_BUILD) {
      console.log(`Serving static frontend from ${STATIC_DIR}`);
    } else {
      console.warn(`SERVE_STATIC is enabled but no build found at ${STATIC_INDEX_FILE}`);
    }
  }
  if (CORS_ALLOW_ALL_IN_DEV) {
    console.log("CORS: all origins allowed in development mode.");
  } else if (CORS_ALLOWED_ORIGINS.length) {
    console.log(`CORS allowlist enabled (${CORS_ALLOWED_ORIGINS.length} origin(s)).`);
  } else {
    console.warn("CORS allowlist is empty; browser cross-origin calls will be blocked.");
  }
  void ensureNayaySetuMongoSchema()
    .then((result) => {
      if (result?.initialized) {
        console.log("MongoDB schema initialized for Nayay Setu collections.");
      }
    })
    .catch((error) => {
      console.warn(`MongoDB schema initialization skipped: ${String(error?.message || error)}`);
    });
  console.log(`NAYAY-SETU API running on http://127.0.0.1:${PORT}`);
});

let isShuttingDown = false;
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`Received ${signal}. Closing HTTP server...`);

  server.close((error) => {
    if (error) {
      console.error("Error while closing server:", String(error?.message || error));
      process.exit(1);
      return;
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timeout reached. Forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", String(error?.stack || error));
  shutdown("uncaughtException");
});
