import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateAdminPolicyVersion,
  fetchAdminPolicyManager,
  publishAdminPolicyVersion,
} from "../../services/legalApi";
import "./DashboardPage.css";

const USERS_STORAGE_KEY = "nayay-setu-users";
const LAWYERS_STORAGE_KEY = "nayay-setu-lawyers";
const SAVED_LAWYERS_KEY_PREFIX = "nayay-setu-saved-lawyers";
const SAVED_LAWYER_PROFILES_KEY_PREFIX = "nayay-setu-saved-lawyer-profiles";
const BILL_LEDGER_KEY = "nayay-setu-bill-ledger";
const ADMIN_REPORTS_STORAGE_KEY = "nayay-setu-admin-reports";
const CURRENT_USER_KEY = "nayay-setu-current-user";
const ADMIN_TICKETS_STORAGE_KEY = "nayay-setu-admin-tickets";
const ADMIN_AUDIT_LOGS_STORAGE_KEY = "nayay-setu-admin-audit-logs";
const ADMIN_VERIFICATION_QUEUE_STORAGE_KEY = "nayay-setu-admin-verification-queue";
const ADMIN_RISK_FLAGS_STORAGE_KEY = "nayay-setu-admin-risk-flags";
const ADMIN_ANNOUNCEMENTS_STORAGE_KEY = "nayay-setu-admin-announcements";

const USER_DEMO_DATA = {
  savedLawyers: [
    {
      name: "Adv. Ritu Sharma",
      field: "Family Law",
      city: "Delhi",
      lastContact: "2 days ago",
    },
    {
      name: "Adv. Arjun Mehta",
      field: "Criminal Law",
      city: "Mumbai",
      lastContact: "1 week ago",
    },
    {
      name: "Adv. Kavya Rao",
      field: "Cyber Law",
      city: "Bengaluru",
      lastContact: "Just now",
    },
  ],
  appointments: [
    { title: "Property consultation", date: "2026-02-16", status: "Upcoming" },
    { title: "Cyber fraud follow-up", date: "2026-02-18", status: "Upcoming" },
  ],
  rights: [
    "Right to Equality",
    "Right to Constitutional Remedies",
    "Consumer Rights",
  ],
  cases: [
    {
      id: "CASE-2026-041",
      type: "Consumer Complaint",
      status: "Hearing Scheduled",
      lastUpdate: "14 Feb 2026",
      lawyer: "Adv. Arjun Mehta",
      bill: {
        generated: true,
        amount: 2500,
        purpose: "Case consultation fee",
        status: "Pending",
        reference: "BILL-041",
      },
      documents: [
        {
          id: "DOC-1001",
          name: "Payment Receipts.zip",
          type: "text",
          uploadedOn: "10 Feb 2026",
        },
      ],
    },
    {
      id: "CASE-2026-052",
      type: "Cyber Fraud Recovery",
      status: "Evidence Review",
      lastUpdate: "13 Feb 2026",
      lawyer: "Adv. Kavya Rao",
      bill: {
        generated: false,
        amount: 3200,
        purpose: "Case handling fee",
        status: "Not Generated",
        reference: "",
      },
      documents: [
        {
          id: "DOC-1002",
          name: "FIR Copy.pdf",
          type: "text",
          uploadedOn: "12 Feb 2026",
        },
      ],
    },
  ],
};

const LAWYER_DEMO_DATA = {
  leads: [
    { client: "Rahul Verma", case: "Tenant dispute", priority: "High" },
    { client: "Aditi Singh", case: "Domestic violence", priority: "Critical" },
    { client: "Mohit Rao", case: "Cyber complaint", priority: "Medium" },
  ],
  requestedCases: [
    {
      id: "REQ-3021",
      client: "Neha Kapoor",
      type: "Consumer Complaint",
      requestedOn: "15 Feb 2026",
      priority: "High",
      summary: "Defective home appliance replacement dispute with seller.",
      location: "Delhi",
      preferredContact: "Phone",
    },
    {
      id: "REQ-3022",
      client: "Imran Ali",
      type: "Property Dispute",
      requestedOn: "14 Feb 2026",
      priority: "Medium",
      summary: "Builder delay in possession and penalty claim.",
      location: "Mumbai",
      preferredContact: "Email",
    },
  ],
  calendar: [
    { slot: "10:00 AM", subject: "Bail consultation", date: "2026-02-14" },
    { slot: "2:30 PM", subject: "Family mediation", date: "2026-02-15" },
    { slot: "5:00 PM", subject: "FIR escalation review", date: "2026-02-15" },
  ],
  checks: [
    "Bar Council enrollment verified",
    "eCourts profile synced",
    "Office location confirmed",
  ],
  myCases: [
    {
      id: "LC-7892",
      client: "Rahul Verma",
      stage: "Drafting Reply",
      nextDate: "19 Feb 2026",
      bill: {
        generated: true,
        amount: 3500,
        purpose: "Drafting and hearing preparation",
        status: "Pending",
        reference: "LBILL-7892",
      },
      documents: [
        {
          id: "DOC-2001",
          name: "Affidavit Draft.docx",
          type: "text",
          updatedOn: "15 Feb 2026",
        },
      ],
    },
    {
      id: "LC-7910",
      client: "Aditi Singh",
      stage: "Interim Application",
      nextDate: "21 Feb 2026",
      bill: {
        generated: false,
        amount: 3500,
        purpose: "Case handling fee",
        status: "Not Generated",
        reference: "",
      },
      documents: [
        {
          id: "DOC-2002",
          name: "Medical Report Scan.pdf",
          type: "image",
          updatedOn: "14 Feb 2026",
        },
      ],
    },
  ],
};

const ADMIN_DEMO_REPORTS = [
  { item: "New lawyer verification requests", value: 18 },
  { item: "Reported profile issues", value: 6 },
  { item: "Pending moderation items", value: 11 },
];

const RIGHTS_REFERENCE = [
  {
    title: "Right to Equality",
    details: "Protection against discrimination and equal treatment under law.",
    law: "Articles 14-18",
    authority: "State Human Rights Commission / High Court",
    quickStep: "Collect evidence and file a written complaint.",
  },
  {
    title: "Right to Constitutional Remedies",
    details: "You can approach courts when fundamental rights are violated.",
    law: "Article 32",
    authority: "Supreme Court / High Court",
    quickStep: "Prepare violation timeline and supporting documents.",
  },
  {
    title: "Consumer Rights",
    details: "Right to safety, information, choice, and grievance redressal.",
    law: "Consumer Protection Act",
    authority: "National Consumer Helpline / Consumer Commission",
    quickStep: "Keep bill, warranty, and complaint communication records.",
  },
  {
    title: "Right to Freedom",
    details: "Speech, movement, association, and profession freedoms within legal limits.",
    law: "Article 19",
    authority: "Local Magistrate / High Court",
    quickStep: "Document unlawful restrictions and seek legal notice.",
  },
  {
    title: "Right to Information (RTI)",
    details: "Citizens can seek information from public authorities.",
    law: "RTI Act 2005",
    authority: "Public Information Officer",
    quickStep: "File RTI with specific questions and keep acknowledgement.",
  },
];

const LAWYER_CASE_STAGE_OPTIONS = [
  "Drafting Reply",
  "Interim Application",
  "Evidence Collection",
  "Final Arguments",
  "Closed",
];

const FILE_KIND_OPTIONS = ["image", "video", "audio", "text"];
const USER_CASE_TYPE_OPTIONS = [
  "Consumer Complaint",
  "Cyber Fraud Recovery",
  "Family Dispute",
  "Property Dispute",
  "Employment Issue",
  "Criminal Defense",
  "Other",
];

const BILL_AMOUNT_BY_CASE_TYPE = {
  "Consumer Complaint": 2500,
  "Cyber Fraud Recovery": 3200,
  "Family Dispute": 2800,
  "Property Dispute": 4500,
  "Employment Issue": 2600,
  "Criminal Defense": 5000,
  Other: 3000,
};
const LAWYER_DEFAULT_BILL_AMOUNT = 3500;

const formatToday = () =>
  new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getRightReference = (title) => {
  const normalized = String(title || "").trim().toLowerCase();
  const match = RIGHTS_REFERENCE.find(
    (item) => item.title.toLowerCase() === normalized
  );
  if (match) return match;
  return {
    title,
    details:
      "Quick reference saved by you. Open Know Your Rights for complete legal guidance.",
    law: "Refer to relevant constitutional/statutory provision",
    authority: "Appropriate legal authority based on your case",
    quickStep: "Collect documents and seek legal guidance.",
  };
};

const getEstimatedBillAmount = (caseType = "") =>
  BILL_AMOUNT_BY_CASE_TYPE[caseType] || BILL_AMOUNT_BY_CASE_TYPE.Other;

const readBillLedger = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(BILL_LEDGER_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeBillLedger = (ledger) => {
  localStorage.setItem(BILL_LEDGER_KEY, JSON.stringify(ledger));
};

const upsertBillLedger = (reference, payload) => {
  if (!reference) return;
  const current = readBillLedger();
  current[reference] = {
    ...(current[reference] || {}),
    ...payload,
    updatedOn: formatToday(),
  };
  writeBillLedger(current);
};

const mergeCaseBillsFromLedger = (caseList = []) => {
  const ledger = readBillLedger();
  return caseList.map((item) => {
    const ref = item.bill?.reference;
    if (!ref || !ledger[ref]) return item;
    return {
      ...item,
      bill: {
        ...(item.bill || {}),
        ...ledger[ref],
        reference: ref,
      },
    };
  });
};

const slugifyValue = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const hashSeed = (value = "") =>
  String(value)
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

const normalizeEmailOrUsername = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const getMemberIdentifier = (currentUser) =>
  String(currentUser?.email || currentUser?.username || "")
    .trim()
    .toLowerCase();

const getSavedLawyerKeysStorageKey = (currentUser) => {
  const identifier = getMemberIdentifier(currentUser);
  return identifier ? `${SAVED_LAWYERS_KEY_PREFIX}:${identifier}` : "";
};

const getSavedLawyerProfilesStorageKey = (currentUser) => {
  const identifier = getMemberIdentifier(currentUser);
  return identifier ? `${SAVED_LAWYER_PROFILES_KEY_PREFIX}:${identifier}` : "";
};

const normalizeSavedLawyer = (lawyer, index = 0) => {
  const name = String(lawyer?.name || `Advocate ${index + 1}`).trim();
  const slug = slugifyValue(name) || `advocate-${index + 1}`;
  const seed = hashSeed(`${name}-${lawyer?.email || lawyer?.phone || index}`);
  const fallbackPhone = `9${String(100000000 + (seed % 900000000))}`;
  const cleanPhone =
    String(lawyer?.phone || fallbackPhone).replace(/\D/g, "").slice(-10) || fallbackPhone;
  const email = String(lawyer?.email || `${slug}@nayaysetu.in`).trim().toLowerCase();
  const city = String(lawyer?.city || lawyer?.district || "Not specified").trim();
  const state = String(lawyer?.state || "").trim();
  const location = state ? `${city}, ${state}` : city;
  const social = lawyer?.social || lawyer?.socialLinks || {};
  const sourceUrl = lawyer?.sourceUrl || social.website || "";

  return {
    storageKey:
      lawyer?.storageKey ||
      `local:${lawyer?.id || lawyer?.email || lawyer?.phone || slug}`,
    id: lawyer?.id || slug,
    name,
    field: lawyer?.field || "General Lawyer",
    city,
    state,
    location,
    experience: lawyer?.experience || `${3 + (seed % 15)} years`,
    lastContact: lawyer?.lastContact || "Just now",
    phone: cleanPhone,
    email,
    appointmentEmail: lawyer?.appointmentEmail || email,
    sourceUrl,
    verified:
      typeof lawyer?.verified === "boolean"
        ? lawyer.verified
        : lawyer?.docsVerified !== false,
    trustScore:
      typeof lawyer?.trustScore === "number"
        ? lawyer.trustScore
        : 60 + (seed % 41),
    social: {
      linkedin: social.linkedin || `https://www.linkedin.com/in/${slug}`,
      x: social.x || `https://x.com/${slug.replace(/-/g, "")}`,
      instagram: social.instagram || `https://www.instagram.com/${slug.replace(/-/g, "")}`,
      facebook: social.facebook || `https://www.facebook.com/${slug.replace(/-/g, ".")}`,
      website: sourceUrl || `https://${slug}.lawyer`,
    },
  };
};

const readSavedLawyersForUser = (currentUser) => {
  const keyStorage = getSavedLawyerKeysStorageKey(currentUser);
  const profileStorage = getSavedLawyerProfilesStorageKey(currentUser);
  if (!keyStorage || !profileStorage) return [];

  const savedKeys = readArrayFromStorage(keyStorage).filter((item) => typeof item === "string");
  if (savedKeys.length === 0) return [];

  let profileMap = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(profileStorage) || "{}");
    profileMap = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    profileMap = {};
  }

  return [...new Set(savedKeys)].map((key, index) =>
    normalizeSavedLawyer(
      {
        storageKey: key,
        ...(profileMap[key] || {}),
      },
      index
    )
  );
};

const writeSavedLawyersForUser = (currentUser, lawyers) => {
  const keyStorage = getSavedLawyerKeysStorageKey(currentUser);
  const profileStorage = getSavedLawyerProfilesStorageKey(currentUser);
  if (!keyStorage || !profileStorage) return;

  const normalized = lawyers.map((item, index) => normalizeSavedLawyer(item, index));
  const deduped = [];
  const seen = new Set();
  normalized.forEach((item) => {
    if (seen.has(item.storageKey)) return;
    seen.add(item.storageKey);
    deduped.push(item);
  });

  const profileMap = deduped.reduce((acc, item) => {
    acc[item.storageKey] = {
      id: item.id,
      name: item.name,
      field: item.field,
      city: item.city,
      state: item.state,
      experience: item.experience,
      phone: item.phone,
      email: item.email,
      appointmentEmail: item.appointmentEmail,
      sourceUrl: item.sourceUrl,
      verified: item.verified,
      trustScore: item.trustScore,
      social: item.social,
      lastContact: item.lastContact,
    };
    return acc;
  }, {});

  localStorage.setItem(keyStorage, JSON.stringify(deduped.map((item) => item.storageKey)));
  localStorage.setItem(profileStorage, JSON.stringify(profileMap));
};

function readArrayFromStorage(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const normalizeAdminReport = (report, index = 0) => {
  const label = String(report?.item || "").trim() || `Report ${index + 1}`;
  const valueRaw = Number(report?.value);
  const value = Number.isFinite(valueRaw) && valueRaw >= 0 ? Math.round(valueRaw) : 0;
  const status = report?.status === "Resolved" ? "Resolved" : "Open";

  return {
    id: String(report?.id || `REPORT-${Date.now()}-${index}`),
    item: label,
    value,
    note: String(report?.note || "").trim(),
    status,
    createdOn: String(report?.createdOn || formatToday()),
    updatedOn: String(report?.updatedOn || report?.createdOn || formatToday()),
  };
};

const createSeedAdminReports = () =>
  ADMIN_DEMO_REPORTS.map((item, index) =>
    normalizeAdminReport(
      {
        id: `DEMO-REPORT-${index + 1}`,
        item: item.item,
        value: item.value,
        note: "Seeded demo report",
        status: "Open",
        createdOn: formatToday(),
      },
      index
    )
  );

const TICKET_STATUS_OPTIONS = ["Open", "In Review", "Resolved"];
const TICKET_SEVERITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const VERIFICATION_PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];
const VERIFICATION_STATUS_OPTIONS = [
  "Pending",
  "In Review",
  "Approved",
  "Rejected",
];
const ANNOUNCEMENT_AUDIENCE_OPTIONS = ["All", "Users", "Lawyers", "Admins"];
const ANNOUNCEMENT_SEVERITY_OPTIONS = ["Info", "Warning", "Critical"];
const ANNOUNCEMENT_STATUS_OPTIONS = ["Draft", "Published", "Archived"];
const ADMIN_TIER_OPTIONS = ["super_admin", "moderator", "verification_manager"];

const ADMIN_PERMISSION_MATRIX = {
  super_admin: [
    "manage_reports",
    "manage_accounts",
    "manage_roles",
    "manage_lawyers",
    "manage_verification",
    "manage_tickets",
    "manage_risk",
    "manage_announcements",
    "manage_policies",
    "view_audit",
    "view_analytics",
    "export_data",
  ],
  moderator: [
    "manage_reports",
    "manage_tickets",
    "manage_risk",
    "manage_announcements",
    "manage_policies",
    "view_audit",
    "view_analytics",
    "export_data",
  ],
  verification_manager: [
    "manage_lawyers",
    "manage_verification",
    "view_audit",
    "view_analytics",
    "export_data",
  ],
};

const getNowIso = () => new Date().toISOString();
const getTodayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

const splitPolicyLines = (value = "") =>
  String(value || "")
    .split(/\n+/)
    .map((item) => item.replace(/^[-*\u2022\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 16);

const formatPolicyLines = (list = []) =>
  (Array.isArray(list) ? list : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("\n");

const createPolicyDraft = () => ({
  versionLabel: "",
  effectiveFrom: getTodayIso(),
  note: "",
  termsText: "",
  privacyText: "",
  retentionText: "",
});

const createPolicyDraftFromVersion = (version) => ({
  ...createPolicyDraft(),
  termsText: formatPolicyLines(version?.terms || []),
  privacyText: formatPolicyLines(version?.privacy || []),
  retentionText: formatPolicyLines(version?.retention || []),
});

const toDateTimeLabel = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateLabel = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getUserIdentifier = (user) =>
  normalizeEmailOrUsername(user?.email || user?.username);

const getLawyerIdentifier = (lawyer) =>
  String(lawyer?.id || lawyer?.email || lawyer?.phone || "").trim();

const normalizeAdminTier = (user = {}) => {
  if (user.role !== "admin") return "";
  const current = String(user.adminTier || "").trim().toLowerCase();
  if (ADMIN_TIER_OPTIONS.includes(current)) return current;
  const identifier = getUserIdentifier(user);
  if (identifier === "admin@nayaysetu.in" || identifier === "demo_admin") {
    return "super_admin";
  }
  return "moderator";
};

const normalizeAdminTicket = (ticket, index = 0) => {
  const status = TICKET_STATUS_OPTIONS.includes(ticket?.status)
    ? ticket.status
    : "Open";
  const severity = TICKET_SEVERITY_OPTIONS.includes(ticket?.severity)
    ? ticket.severity
    : "Medium";
  const createdAt = String(ticket?.createdAt || getNowIso());
  const updatedAt = String(ticket?.updatedAt || createdAt);

  return {
    id: String(ticket?.id || `TICKET-${Date.now()}-${index}`),
    title: String(ticket?.title || `Ticket ${index + 1}`).trim(),
    description: String(ticket?.description || "").trim(),
    severity,
    status,
    sourceReportId: String(ticket?.sourceReportId || "").trim(),
    reportedUser: normalizeEmailOrUsername(ticket?.reportedUser || ""),
    assignee: String(ticket?.assignee || "").trim(),
    dueDate: String(ticket?.dueDate || addDaysIso(2)),
    resolutionNote: String(ticket?.resolutionNote || "").trim(),
    createdAt,
    updatedAt,
  };
};

const normalizeVerificationQueueEntry = (entry, index = 0) => {
  const status = VERIFICATION_STATUS_OPTIONS.includes(entry?.status)
    ? entry.status
    : "Pending";
  const priority = VERIFICATION_PRIORITY_OPTIONS.includes(entry?.priority)
    ? entry.priority
    : "Medium";
  const dueDate = String(entry?.dueDate || addDaysIso(2));
  const updatedAt = String(entry?.updatedAt || getNowIso());

  return {
    id: String(entry?.id || `VERIFY-${Date.now()}-${index}`),
    lawyerId: String(entry?.lawyerId || "").trim(),
    lawyerName: String(entry?.lawyerName || "Lawyer").trim(),
    email: normalizeEmailOrUsername(entry?.email || ""),
    priority,
    status,
    dueDate,
    escalated: Boolean(entry?.escalated),
    notes: String(entry?.notes || "").trim(),
    updatedAt,
  };
};

const syncVerificationQueueWithLawyers = (queue, lawyers) => {
  const map = new Map();
  (Array.isArray(queue) ? queue : []).forEach((item, index) => {
    const normalized = normalizeVerificationQueueEntry(item, index);
    if (!normalized.lawyerId) return;
    map.set(normalized.lawyerId, normalized);
  });

  (Array.isArray(lawyers) ? lawyers : []).forEach((lawyer) => {
    const lawyerId = getLawyerIdentifier(lawyer);
    if (!lawyerId) return;
    const existing = map.get(lawyerId);
    const docsVerified = Boolean(lawyer?.docsVerified);
    const status = docsVerified ? "Approved" : existing?.status || "Pending";
    const priority = existing?.priority || (docsVerified ? "Low" : "Medium");

    map.set(
      lawyerId,
      normalizeVerificationQueueEntry({
        id: existing?.id || `VERIFY-${lawyerId}`,
        lawyerId,
        lawyerName: lawyer?.name || existing?.lawyerName || "Lawyer",
        email: lawyer?.email || existing?.email || "",
        status,
        priority,
        dueDate: existing?.dueDate || addDaysIso(2),
        escalated: existing?.escalated || false,
        notes: existing?.notes || "",
        updatedAt: existing?.updatedAt || getNowIso(),
      })
    );
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.status === b.status) return a.lawyerName.localeCompare(b.lawyerName);
    if (a.status === "Pending") return -1;
    if (b.status === "Pending") return 1;
    if (a.status === "In Review") return -1;
    if (b.status === "In Review") return 1;
    return a.lawyerName.localeCompare(b.lawyerName);
  });
};

const normalizeAuditLog = (entry, index = 0) => ({
  id: String(entry?.id || `AUDIT-${Date.now()}-${index}`),
  at: String(entry?.at || getNowIso()),
  actor: String(entry?.actor || "Admin").trim(),
  action: String(entry?.action || "Updated record").trim(),
  target: String(entry?.target || "System").trim(),
  details: String(entry?.details || "").trim(),
});

const normalizeAnnouncement = (item, index = 0) => {
  const severity = ANNOUNCEMENT_SEVERITY_OPTIONS.includes(item?.severity)
    ? item.severity
    : "Info";
  const status = ANNOUNCEMENT_STATUS_OPTIONS.includes(item?.status)
    ? item.status
    : "Draft";
  const audience = ANNOUNCEMENT_AUDIENCE_OPTIONS.includes(item?.audience)
    ? item.audience
    : "All";

  return {
    id: String(item?.id || `ANNOUNCE-${Date.now()}-${index}`),
    title: String(item?.title || `Announcement ${index + 1}`).trim(),
    message: String(item?.message || "").trim(),
    audience,
    severity,
    status,
    createdAt: String(item?.createdAt || getNowIso()),
    updatedAt: String(item?.updatedAt || item?.createdAt || getNowIso()),
  };
};

const computeRiskScore = ({
  failedLogins = 0,
  spamReports = 0,
  profileEdits = 0,
  openHighSeverityTickets = 0,
}) =>
  failedLogins * 15 +
  spamReports * 20 +
  profileEdits * 4 +
  openHighSeverityTickets * 12;

const getRiskLevel = (score = 0) => {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const syncRiskProfiles = (profiles, users, tickets) => {
  const existingMap = new Map();
  (Array.isArray(profiles) ? profiles : []).forEach((item) => {
    const identifier = normalizeEmailOrUsername(item?.userIdentifier || item?.email);
    if (!identifier) return;
    existingMap.set(identifier, item);
  });

  const openHighTicketCount = (identifier) =>
    (Array.isArray(tickets) ? tickets : []).filter((ticket) => {
      if (!["Open", "In Review"].includes(ticket?.status)) return false;
      if (!["High", "Critical"].includes(ticket?.severity)) return false;
      return normalizeEmailOrUsername(ticket?.reportedUser) === identifier;
    }).length;

  return (Array.isArray(users) ? users : []).map((user, index) => {
    const identifier = getUserIdentifier(user);
    const existing = existingMap.get(identifier) || {};
    const nextOpenHighTickets = openHighTicketCount(identifier);
    const failedLogins = Number(existing.failedLogins || 0);
    const spamReports = Number(existing.spamReports || 0);
    const profileEdits = Number(existing.profileEdits || 0);
    const riskScore = computeRiskScore({
      failedLogins,
      spamReports,
      profileEdits,
      openHighSeverityTickets: nextOpenHighTickets,
    });
    const riskLevel = getRiskLevel(riskScore);
    const previousSnapshot = {
      displayName: existing.displayName || "",
      email: existing.email || "",
      role: existing.role || "",
      failedLogins: Number(existing.failedLogins || 0),
      spamReports: Number(existing.spamReports || 0),
      profileEdits: Number(existing.profileEdits || 0),
      openHighSeverityTickets: Number(existing.openHighSeverityTickets || 0),
      riskScore: Number(existing.riskScore || 0),
      riskLevel: existing.riskLevel || "Low",
      flagged: Boolean(existing.flagged),
    };
    const nextSnapshot = {
      displayName: user?.displayName || user?.username || "Member",
      email: user?.email || "",
      role: user?.role || "user",
      failedLogins,
      spamReports,
      profileEdits,
      openHighSeverityTickets: nextOpenHighTickets,
      riskScore,
      riskLevel,
      flagged: riskLevel === "High",
    };
    const changed =
      JSON.stringify(previousSnapshot) !== JSON.stringify(nextSnapshot);

    return {
      id: String(existing.id || `RISK-${Date.now()}-${index}`),
      userIdentifier: identifier,
      displayName: nextSnapshot.displayName,
      email: nextSnapshot.email,
      role: nextSnapshot.role,
      failedLogins,
      spamReports,
      profileEdits,
      openHighSeverityTickets: nextOpenHighTickets,
      riskScore,
      riskLevel,
      flagged: riskLevel === "High",
      updatedAt: changed ? getNowIso() : existing.updatedAt || getNowIso(),
    };
  });
};

const toCsv = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((key) => escapeCsv(row?.[key])).join(",")),
  ];
  return lines.join("\n");
};

const downloadTextFile = (filename, content, mimeType) => {
  const blob = new Blob([content], {
    type: mimeType || "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

function DashboardProfileCard({ currentUser, subtitle }) {
  const name = currentUser?.displayName || currentUser?.username || "Member";
  const handle = currentUser?.username ? `@${currentUser.username}` : "@member";
  const email = currentUser?.email || "No email added";
  const initial = String(name).trim().charAt(0).toUpperCase() || "M";

  return (
    <article className="dashboard-profile-card">
      <div className="dashboard-profile-avatar">{initial}</div>
      <div className="dashboard-profile-meta">
        <strong>{name}</strong>
        <span>{handle}</span>
        <p>{email}</p>
      </div>
      <p className="dashboard-profile-note">{subtitle}</p>
    </article>
  );
}

function DashboardServiceAccess({
  onOpenLegalAssistant,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  return (
    <div className="dashboard-service-block">
      <h5>Core Services</h5>
      <div className="dashboard-service-links">
        <button type="button" onClick={() => onOpenLegalAssistant?.()}>
          AI Assistant
        </button>
        <button type="button" onClick={() => onOpenLawyerHub?.()}>
          Lawyer Directory
        </button>
        <button type="button" onClick={() => onOpenCommunityHub?.()}>
          Community
        </button>
        <button type="button" onClick={() => onOpenEmergencySupport?.()}>
          Emergency
        </button>
        <button type="button" onClick={() => onOpenRightsHub?.()}>
          Know Your Rights
        </button>
        <button type="button" onClick={() => onOpenJusticeHub?.()}>
          Official Links
        </button>
      </div>
    </div>
  );
}

function UserDashboard({
  currentUser,
  onOpenLegalAssistant,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  const [savedLawyers, setSavedLawyers] = useState(() => {
    const stored = readSavedLawyersForUser(currentUser);
    if (stored.length > 0) return stored;
    return USER_DEMO_DATA.savedLawyers.map((item, index) =>
      normalizeSavedLawyer(item, index)
    );
  });
  const appointments = USER_DEMO_DATA.appointments;
  const [rights, setRights] = useState(USER_DEMO_DATA.rights);
  const [cases, setCases] = useState(() => mergeCaseBillsFromLedger(USER_DEMO_DATA.cases));
  const [activeSection, setActiveSection] = useState("overview");
  const [caseDraft, setCaseDraft] = useState({
    id: "",
    type: "",
    lawyer: "",
  });
  const [docDrafts, setDocDrafts] = useState({});

  useEffect(() => {
    const stored = readSavedLawyersForUser(currentUser);
    if (stored.length > 0) {
      setSavedLawyers(stored);
      return;
    }
    setSavedLawyers(
      USER_DEMO_DATA.savedLawyers.map((item, index) => normalizeSavedLawyer(item, index))
    );
  }, [currentUser]);

  useEffect(() => {
    setCases((prev) => mergeCaseBillsFromLedger(prev));
  }, []);

  const menuItems = [
    { id: "overview", label: "Overview", count: 1 },
    { id: "saved", label: "Saved Lawyers", count: savedLawyers.length },
    { id: "appointments", label: "Appointments", count: appointments.length },
    { id: "rights", label: "Bookmarked Rights", count: rights.length },
    { id: "cases", label: "My Cases", count: cases.length },
    {
      id: "payments",
      label: "Pay Bills",
      count: cases.filter((item) => item.bill?.generated && item.bill?.status !== "Paid").length,
    },
  ];

  const updateSavedLawyers = (nextLawyers) => {
    const normalized = nextLawyers.map((item, index) => normalizeSavedLawyer(item, index));
    setSavedLawyers(normalized);
    writeSavedLawyersForUser(currentUser, normalized);
  };

  const addCase = () => {
    const type = caseDraft.type.trim();
    const lawyer = caseDraft.lawyer.trim();
    if (!type || !lawyer) {
      window.alert("Select case type and lawyer first.");
      return;
    }
    setCases((prev) => [
      {
        id: caseDraft.id.trim() || `CASE-${Date.now()}`,
        type,
        status: "Filed",
        lawyer,
        lastUpdate: formatToday(),
        bill: {
          generated: false,
          amount: getEstimatedBillAmount(type),
          purpose: "Case handling fee",
          status: "Not Generated",
          reference: "",
        },
        documents: [],
      },
      ...prev,
    ]);
    setCaseDraft({
      id: "",
      type: "",
      lawyer: "",
    });
  };

  const updateDocDraft = (caseId, draft) => {
    setDocDrafts((prev) => ({
      ...prev,
      [caseId]: { name: "", type: "text", ...(prev[caseId] || {}), ...draft },
    }));
  };

  const payCaseBill = (caseId) => {
    setCases((prev) =>
      prev.map((entry) =>
        entry.id === caseId
          ? {
              ...entry,
              bill: {
                generated: true,
                amount: entry.bill?.amount || getEstimatedBillAmount(entry.type),
                purpose: entry.bill?.purpose || "Case handling fee",
                status: "Paid",
                reference:
                  entry.bill?.reference ||
                  `BILL-${String(entry.id).replace(/[^0-9]/g, "").slice(-4) || Date.now()}`,
              },
              lastUpdate: formatToday(),
            }
          : entry
      )
    );
  };

  const challengeCaseBill = (caseId) => {
    setCases((prev) =>
      prev.map((entry) =>
        entry.id === caseId
          ? {
              ...entry,
              bill: {
                generated: true,
                amount: entry.bill?.amount || getEstimatedBillAmount(entry.type),
                purpose: entry.bill?.purpose || "Case handling fee",
                status: "Challenged",
                reference:
                  entry.bill?.reference ||
                  `BILL-${String(entry.id).replace(/[^0-9]/g, "").slice(-4) || Date.now()}`,
              },
              lastUpdate: formatToday(),
            }
          : entry
      )
    );
  };

  const requestCaseBillDiscount = (caseId) => {
    setCases((prev) =>
      prev.map((entry) =>
        entry.id === caseId
          ? {
              ...entry,
              bill: {
                generated: true,
                amount: entry.bill?.amount || getEstimatedBillAmount(entry.type),
                purpose: entry.bill?.purpose || "Case handling fee",
                status: "Discount Requested",
                reference:
                  entry.bill?.reference ||
                  `BILL-${String(entry.id).replace(/[^0-9]/g, "").slice(-4) || Date.now()}`,
              },
              lastUpdate: formatToday(),
            }
          : entry
      )
    );
  };

  useEffect(() => {
    cases.forEach((item) => {
      const ref = item.bill?.reference;
      if (!ref) return;
      upsertBillLedger(ref, {
        generated: Boolean(item.bill?.generated),
        amount: item.bill?.amount || getEstimatedBillAmount(item.type),
        purpose: item.bill?.purpose || "Case handling fee",
        status:
          item.bill?.status || (item.bill?.generated ? "Pending" : "Not Generated"),
      });
    });
  }, [cases]);

  return (
    <section className="dashboard-role-shell">
      <div className="dashboard-profile-row">
        <DashboardProfileCard
          currentUser={currentUser}
          subtitle="Track legal progress and saved resources from one place."
        />
      </div>
      <div className="dashboard-role-layout">
        <aside className="dashboard-side-menu">
          <h4>User Menu</h4>
          <div className="dashboard-side-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSection === item.id ? "is-active" : ""}
                onClick={() => setActiveSection(item.id)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <DashboardServiceAccess
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        </aside>

        <div className="dashboard-role-main">
          {activeSection === "overview" && (
            <>
              <section className="dashboard-panel">
                <h3>Overview</h3>
                <div className="dashboard-kpi-grid">
                  <article className="dashboard-kpi-card">
                    <span>Saved Lawyers</span>
                    <strong>{savedLawyers.length}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Upcoming Appointments</span>
                    <strong>{appointments.length}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Bookmarked Rights</span>
                    <strong>{rights.length}</strong>
                  </article>
                </div>
              </section>

              <div className="dashboard-content-grid">
                <section className="dashboard-panel">
                  <h3>Saved Lawyers</h3>
                  <div className="dashboard-list">
                    {savedLawyers.map((item, index) => (
                      <article key={`${item.name}-${index}`} className="dashboard-list-item">
                        <div>
                          <strong>{item.name}</strong>
                          <p>
                            {item.field} • {item.city}
                          </p>
                        </div>
                        <span>{item.lastContact}</span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dashboard-panel">
                  <h3>Appointments</h3>
                  <div className="dashboard-list">
                    {appointments.map((item) => (
                      <article key={`${item.title}-${item.date}`} className="dashboard-list-item">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.date}</p>
                        </div>
                        <span>{item.status}</span>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {activeSection === "saved" && (
            <section className="dashboard-panel">
              <h3>Saved Lawyers</h3>
              <div className="dashboard-lawyer-card-grid">
                {savedLawyers.map((item, index) => (
                  <article key={item.storageKey || `${item.name}-${index}`} className="dashboard-lawyer-card">
                    <div className="dashboard-lawyer-head">
                      <div className="dashboard-lawyer-avatar">
                        {String(item.name || "L").charAt(0).toUpperCase()}
                      </div>
                      <div className="dashboard-lawyer-meta">
                        <div className="dashboard-lawyer-name-row">
                          <strong>{item.name}</strong>
                          <button
                            type="button"
                            className="dashboard-danger-btn dashboard-lawyer-unsave-btn"
                            onClick={() =>
                              updateSavedLawyers(savedLawyers.filter((_, itemIndex) => itemIndex !== index))
                            }
                          >
                            Unsave
                          </button>
                        </div>
                        <p>{item.field}</p>
                        <p>
                          {item.location} • {item.experience}
                        </p>
                      </div>
                    </div>

                    <div className="dashboard-lawyer-badges">
                      <span
                        className={`dashboard-lawyer-verify ${
                          item.verified ? "is-verified" : "not-verified"
                        }`}
                      >
                        {item.verified ? "Verified" : "Not Verified"}
                      </span>
                      <span className="dashboard-lawyer-trust">
                        Trust Score: {item.trustScore}/100
                      </span>
                    </div>

                    <div className="dashboard-lawyer-actions-row">
                      <a href={`tel:${item.phone}`}>Call</a>
                      <a
                        href={`https://wa.me/91${item.phone}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Message
                      </a>
                      <a
                        href={`mailto:${item.appointmentEmail}?subject=Appointment Request&body=Hello ${item.name}, I want to schedule a consultation.`}
                      >
                        Appointment
                      </a>
                      <a href={`mailto:${item.email}`}>Gmail</a>
                    </div>

                    <div className="dashboard-lawyer-social-links">
                      <a href={item.social.linkedin} target="_blank" rel="noreferrer">
                        LinkedIn
                      </a>
                      <a href={item.social.x} target="_blank" rel="noreferrer">
                        X
                      </a>
                      <a href={item.social.instagram} target="_blank" rel="noreferrer">
                        Instagram
                      </a>
                      <a href={item.social.facebook} target="_blank" rel="noreferrer">
                        Facebook
                      </a>
                      <a href={item.social.website} target="_blank" rel="noreferrer">
                        Website
                      </a>
                    </div>

                    <div className="dashboard-lawyer-footer">
                      <span>Last contact: {item.lastContact}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "appointments" && (
            <section className="dashboard-panel">
              <h3>Appointments</h3>
              <div className="dashboard-list">
                {appointments.map((item) => (
                  <article key={`${item.title}-${item.date}`} className="dashboard-list-item">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.date}</p>
                    </div>
                    <span>{item.status}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "rights" && (
            <section className="dashboard-panel">
              <h3>Bookmarked Rights</h3>
              <div className="dashboard-rights-grid">
                {rights.map((item, index) => {
                  const rightRef = getRightReference(item);
                  return (
                    <article key={`${item}-${index}`} className="dashboard-right-card">
                      <div>
                        <div className="dashboard-right-title-row">
                          <strong>{item}</strong>
                          <button
                            type="button"
                            className="dashboard-danger-btn"
                            onClick={() =>
                              setRights((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                            }
                          >
                            Remove
                          </button>
                        </div>
                        <p>{rightRef.details}</p>
                        <p className="dashboard-right-meta">
                          <span>Law:</span> {rightRef.law}
                        </p>
                        <p className="dashboard-right-meta">
                          <span>Authority:</span> {rightRef.authority}
                        </p>
                        <p className="dashboard-right-meta">
                          <span>Quick Step:</span> {rightRef.quickStep}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeSection === "cases" && (
            <section className="dashboard-panel">
              <h3>My Cases</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Case ID (optional)"
                  value={caseDraft.id}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, id: event.target.value }))
                  }
                />
                <select
                  value={caseDraft.type}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <option value="">Select case type</option>
                  {USER_CASE_TYPE_OPTIONS.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
                <select
                  value={caseDraft.lawyer}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, lawyer: event.target.value }))
                  }
                >
                  <option value="">Select assigned lawyer</option>
                  {savedLawyers.map((lawyer) => (
                    <option
                      key={lawyer.storageKey || lawyer.email || lawyer.name}
                      value={lawyer.name}
                    >
                      {lawyer.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={addCase}
                >
                  Add Case
                </button>
              </div>

              <div className="dashboard-list">
                {cases.map((item) => (
                  <article key={item.id} className="dashboard-list-item dashboard-case-item">
                    <div className="dashboard-case-head">
                      <div>
                        <strong>{item.id}</strong>
                        <p>
                          {item.type} • {item.status}
                        </p>
                        <p>
                          Lawyer: {item.lawyer} • Updated: {item.lastUpdate}
                        </p>
                        <p>
                          Bill Amount: Rs.{" "}
                          {(item.bill?.amount || getEstimatedBillAmount(item.type)).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>
                      <div className="dashboard-item-actions">
                        <span>{item.status}</span>
                        <span>
                          Bill:{" "}
                          {item.bill?.status ||
                            (item.bill?.generated ? "Pending" : "Not Generated")}
                        </span>
                        <button
                          type="button"
                          className="dashboard-danger-btn"
                          onClick={() =>
                            setCases((prev) => prev.filter((entry) => entry.id !== item.id))
                          }
                        >
                          Delete Case
                        </button>
                      </div>
                    </div>

                    <div className="dashboard-doc-section">
                      <p>My Documents</p>
                      <div className="dashboard-doc-list">
                        {(Array.isArray(item.documents) ? item.documents : []).map((doc) => (
                          <div key={doc.id} className="dashboard-doc-item">
                            <span>
                              {doc.name} ({doc.type}) - {doc.uploadedOn}
                            </span>
                            <button
                              type="button"
                              className="dashboard-danger-btn"
                              onClick={() =>
                                setCases((prev) =>
                                  prev.map((entry) =>
                                    entry.id === item.id
                                      ? {
                                          ...entry,
                                          documents: (entry.documents || []).filter(
                                            (docItem) => docItem.id !== doc.id
                                          ),
                                          lastUpdate: formatToday(),
                                        }
                                      : entry
                                  )
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="dashboard-inline-form">
                        <input
                          type="text"
                          placeholder="File name"
                          value={docDrafts[item.id]?.name || ""}
                          onChange={(event) =>
                            updateDocDraft(item.id, { name: event.target.value })
                          }
                        />
                        <select
                          value={docDrafts[item.id]?.type || "text"}
                          onChange={(event) =>
                            updateDocDraft(item.id, { type: event.target.value })
                          }
                        >
                          {FILE_KIND_OPTIONS.map((kind) => (
                            <option key={kind} value={kind}>
                              {kind}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="dashboard-action-btn"
                          onClick={() => {
                            const draft = docDrafts[item.id] || { name: "", type: "text" };
                            const name = String(draft.name || "").trim();
                            if (!name) return;
                            setCases((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      documents: [
                                        {
                                          id: `DOC-${Date.now()}`,
                                          name,
                                          type: draft.type || "text",
                                          uploadedOn: formatToday(),
                                        },
                                        ...(entry.documents || []),
                                      ],
                                      lastUpdate: formatToday(),
                                    }
                                  : entry
                              )
                            );
                            updateDocDraft(item.id, { name: "", type: "text" });
                          }}
                        >
                          Add File
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "payments" && (
            <section className="dashboard-panel">
              <h3>Pay Bills</h3>
              <div className="dashboard-list">
                {cases.map((item) => (
                  <article key={`bill-${item.id}`} className="dashboard-list-item">
                    <div>
                      <strong>{item.id}</strong>
                      <p>
                        {item.type} • Lawyer: {item.lawyer}
                      </p>
                      <p>
                        Amount: Rs.{" "}
                        {(item.bill?.amount || getEstimatedBillAmount(item.type)).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                      <p>Purpose: {item.bill?.purpose || "Case handling fee"}</p>
                      <p>
                        Status:{" "}
                        {item.bill?.status ||
                          (item.bill?.generated ? "Pending" : "Not Generated")}
                      </p>
                    </div>
                    <div className="dashboard-item-actions">
                      {item.bill?.reference && <span>{item.bill.reference}</span>}
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => payCaseBill(item.id)}
                        disabled={!item.bill?.generated || item.bill?.status === "Paid"}
                      >
                        Pay Bill
                      </button>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => requestCaseBillDiscount(item.id)}
                        disabled={
                          !item.bill?.generated ||
                          item.bill?.status === "Paid" ||
                          item.bill?.status === "Discount Requested"
                        }
                      >
                        Request Discount
                      </button>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => challengeCaseBill(item.id)}
                        disabled={
                          !item.bill?.generated ||
                          item.bill?.status === "Paid" ||
                          item.bill?.status === "Challenged" ||
                          item.bill?.status === "Discount Requested"
                        }
                      >
                        Challenge Bill
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

function LawyerDashboard({
  currentUser,
  onOpenLegalAssistant,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [myCases, setMyCases] = useState(() => mergeCaseBillsFromLedger(LAWYER_DEMO_DATA.myCases));
  const [requestedCases, setRequestedCases] = useState(LAWYER_DEMO_DATA.requestedCases);
  const [expandedRequestById, setExpandedRequestById] = useState({});
  const [caseDraft, setCaseDraft] = useState({
    id: "",
    client: "",
    stage: LAWYER_CASE_STAGE_OPTIONS[0],
    nextDate: "",
  });
  const [docDrafts, setDocDrafts] = useState({});
  const [billDrafts, setBillDrafts] = useState({});

  const menuItems = [
    { id: "overview", label: "Overview", count: 1 },
    { id: "leads", label: "Client Leads", count: LAWYER_DEMO_DATA.leads.length },
    { id: "requested", label: "New / Requested Cases", count: requestedCases.length },
    { id: "calendar", label: "Calendar", count: LAWYER_DEMO_DATA.calendar.length },
    { id: "checks", label: "Verification", count: LAWYER_DEMO_DATA.checks.length },
    { id: "cases", label: "My Cases", count: myCases.length },
    { id: "billing", label: "Generate Bills", count: myCases.length },
  ];

  const updateDocDraft = (caseId, draft) => {
    setDocDrafts((prev) => ({
      ...prev,
      [caseId]: { name: "", type: "text", ...(prev[caseId] || {}), ...draft },
    }));
  };

  const updateBillDraft = (caseId, draft) => {
    setBillDrafts((prev) => ({
      ...prev,
      [caseId]: {
        purpose: "Case handling fee",
        amount: String(LAWYER_DEFAULT_BILL_AMOUNT),
        ...(prev[caseId] || {}),
        ...draft,
      },
    }));
  };

  const addCase = () => {
    const client = caseDraft.client.trim();
    if (!client) return;
    setMyCases((prev) => [
      {
        id: caseDraft.id.trim() || `LC-${Date.now()}`,
        client,
        stage: caseDraft.stage,
        nextDate: caseDraft.nextDate.trim() || formatToday(),
        bill: {
          generated: false,
          amount: LAWYER_DEFAULT_BILL_AMOUNT,
          purpose: "Case handling fee",
          status: "Not Generated",
          reference: "",
        },
        documents: [],
      },
      ...prev,
    ]);
    setCaseDraft({
      id: "",
      client: "",
      stage: LAWYER_CASE_STAGE_OPTIONS[0],
      nextDate: "",
    });
  };

  const acceptRequestedCase = (requestItem) => {
    setMyCases((prev) => [
      {
        id: requestItem.id.replace("REQ-", "LC-"),
        client: requestItem.client,
        stage: LAWYER_CASE_STAGE_OPTIONS[0],
        nextDate: formatToday(),
        bill: {
          generated: false,
          amount: LAWYER_DEFAULT_BILL_AMOUNT,
          purpose: "Case handling fee",
          status: "Not Generated",
          reference: "",
        },
        documents: [],
      },
      ...prev,
    ]);
    setRequestedCases((prev) => prev.filter((item) => item.id !== requestItem.id));
    setExpandedRequestById((prev) => {
      if (!prev[requestItem.id]) return prev;
      const next = { ...prev };
      delete next[requestItem.id];
      return next;
    });
  };

  const rejectRequestedCase = (requestId) => {
    setRequestedCases((prev) => prev.filter((item) => item.id !== requestId));
    setExpandedRequestById((prev) => {
      if (!prev[requestId]) return prev;
      const next = { ...prev };
      delete next[requestId];
      return next;
    });
  };

  const generateCaseBill = (caseId) => {
    const draft = billDrafts[caseId] || {};
    const purpose = String(draft.purpose || "").trim() || "Case handling fee";
    const amountRaw = Number(draft.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0
      ? Math.round(amountRaw)
      : LAWYER_DEFAULT_BILL_AMOUNT;

    setMyCases((prev) =>
      prev.map((entry) =>
        entry.id === caseId
          ? {
              ...entry,
              bill: {
                generated: true,
                amount,
                purpose,
                status: entry.bill?.status === "Paid" ? "Paid" : "Pending",
                reference:
                  entry.bill?.reference ||
                  `LBILL-${String(entry.id).replace(/[^0-9]/g, "").slice(-4) || Date.now()}`,
              },
            }
          : entry
      )
    );
  };

  useEffect(() => {
    setMyCases((prev) => mergeCaseBillsFromLedger(prev));
  }, []);

  useEffect(() => {
    myCases.forEach((item) => {
      const ref = item.bill?.reference;
      if (!ref) return;
      upsertBillLedger(ref, {
        generated: Boolean(item.bill?.generated),
        amount: item.bill?.amount || LAWYER_DEFAULT_BILL_AMOUNT,
        purpose: item.bill?.purpose || "Case handling fee",
        status:
          item.bill?.status || (item.bill?.generated ? "Pending" : "Not Generated"),
      });
    });
  }, [myCases]);

  return (
    <section className="dashboard-role-shell">
      <div className="dashboard-profile-row">
        <DashboardProfileCard
          currentUser={currentUser}
          subtitle="Manage leads, schedule, and verification workflow."
        />
      </div>
      <div className="dashboard-role-layout">
        <aside className="dashboard-side-menu">
          <h4>Lawyer Menu</h4>
          <div className="dashboard-side-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSection === item.id ? "is-active" : ""}
                onClick={() => setActiveSection(item.id)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <DashboardServiceAccess
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        </aside>

        <div className="dashboard-role-main">
          {activeSection === "overview" && (
            <>
              <section className="dashboard-panel">
                <h3>Overview</h3>
                <div className="dashboard-kpi-grid">
                  <article className="dashboard-kpi-card">
                    <span>Incoming Leads</span>
                    <strong>{LAWYER_DEMO_DATA.leads.length}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Today&apos;s Slots</span>
                    <strong>{LAWYER_DEMO_DATA.calendar.length}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Verification Checks</span>
                    <strong>{LAWYER_DEMO_DATA.checks.length}</strong>
                  </article>
                </div>
              </section>

              <div className="dashboard-content-grid">
                <section className="dashboard-panel">
                  <h3>Client Leads</h3>
                  <div className="dashboard-list">
                    {LAWYER_DEMO_DATA.leads.map((item) => (
                      <article key={`${item.client}-${item.case}`} className="dashboard-list-item">
                        <div>
                          <strong>{item.client}</strong>
                          <p>{item.case}</p>
                        </div>
                        <span>{item.priority}</span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="dashboard-panel">
                  <h3>Calendar</h3>
                  <div className="dashboard-list">
                    {LAWYER_DEMO_DATA.calendar.map((item) => (
                      <article key={`${item.slot}-${item.subject}`} className="dashboard-list-item">
                        <div>
                          <strong>{item.slot}</strong>
                          <p>{item.subject}</p>
                        </div>
                        <span>{item.date}</span>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {activeSection === "leads" && (
            <section className="dashboard-panel">
              <h3>Client Leads</h3>
              <div className="dashboard-list">
                {LAWYER_DEMO_DATA.leads.map((item) => (
                  <article key={`${item.client}-${item.case}`} className="dashboard-list-item">
                    <div>
                      <strong>{item.client}</strong>
                      <p>{item.case}</p>
                    </div>
                    <span>{item.priority}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "requested" && (
            <section className="dashboard-panel dashboard-panel-requested">
              <h3>New / Requested Cases</h3>
              <div className="dashboard-list dashboard-case-feed">
                {requestedCases.map((item) => (
                  <article
                    key={item.id}
                    className="dashboard-list-item dashboard-case-item dashboard-case-card dashboard-requested-card"
                  >
                    <div className="dashboard-case-head dashboard-requested-head">
                      <div className="dashboard-requested-summary">
                        <strong>
                          {item.client} • {item.type}
                        </strong>
                        <div className="dashboard-requested-meta">
                          <span>Requested On: {item.requestedOn}</span>
                        </div>
                        <div className="dashboard-inline-actions dashboard-requested-actions">
                          <button
                            type="button"
                            className="dashboard-action-btn dashboard-requested-view-btn"
                            onClick={() =>
                              setExpandedRequestById((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }))
                            }
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            className="dashboard-action-btn"
                            onClick={() => acceptRequestedCase(item)}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="dashboard-danger-btn"
                            onClick={() => rejectRequestedCase(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {expandedRequestById[item.id] && (
                      <div className="dashboard-doc-section">
                        <p>Request Details</p>
                        <div className="dashboard-doc-list">
                          <div className="dashboard-doc-item">
                            <span>Summary: {item.summary || "Not provided"}</span>
                          </div>
                          <div className="dashboard-doc-item">
                            <span>Location: {item.location || "Not provided"}</span>
                          </div>
                          <div className="dashboard-doc-item">
                            <span>
                              Preferred Contact: {item.preferredContact || "Not provided"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
                {requestedCases.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No pending requests</strong>
                      <p>All incoming case requests are processed.</p>
                    </div>
                    <span>Clear</span>
                  </article>
                )}
              </div>
            </section>
          )}

          {activeSection === "calendar" && (
            <section className="dashboard-panel">
              <h3>Calendar</h3>
              <div className="dashboard-list">
                {LAWYER_DEMO_DATA.calendar.map((item) => (
                  <article key={`${item.slot}-${item.subject}`} className="dashboard-list-item">
                    <div>
                      <strong>{item.slot}</strong>
                      <p>{item.subject}</p>
                    </div>
                    <span>{item.date}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "checks" && (
            <section className="dashboard-panel">
              <h3>Verification Checks</h3>
              <div className="dashboard-list">
                {LAWYER_DEMO_DATA.checks.map((item) => (
                  <article key={item} className="dashboard-list-item">
                    <div>
                      <strong>{item}</strong>
                      <p>Compliance record is active</p>
                    </div>
                    <span>Verified</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "billing" && (
            <section className="dashboard-panel dashboard-panel-billing">
              <h3>Generate Bills</h3>
              <div className="dashboard-list dashboard-bill-feed">
                {myCases.map((item) => (
                  <article key={`bill-${item.id}`} className="dashboard-list-item dashboard-bill-card">
                    <div>
                      <strong>
                        {item.id} • {item.client}
                      </strong>
                      <p>Stage: {item.stage}</p>
                      <p>Payment Status: {item.bill?.status || "Not Generated"}</p>
                      <div className="dashboard-inline-form dashboard-bill-inline-form">
                        <input
                          type="text"
                          placeholder="Bill purpose"
                          value={billDrafts[item.id]?.purpose || item.bill?.purpose || ""}
                          onChange={(event) =>
                            updateBillDraft(item.id, { purpose: event.target.value })
                          }
                        />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Amount"
                          value={billDrafts[item.id]?.amount || String(item.bill?.amount || LAWYER_DEFAULT_BILL_AMOUNT)}
                          onChange={(event) =>
                            updateBillDraft(item.id, { amount: event.target.value })
                          }
                        />
                      </div>
                      <p>
                        Bill Amount: Rs.{" "}
                        {(item.bill?.amount || LAWYER_DEFAULT_BILL_AMOUNT).toLocaleString("en-IN")}
                      </p>
                      <p>Purpose: {item.bill?.purpose || "Case handling fee"}</p>
                      <p>
                        Status:{" "}
                        {item.bill?.status ||
                          (item.bill?.generated ? "Pending" : "Not Generated")}
                      </p>
                    </div>
                    <div className="dashboard-item-actions">
                      {item.bill?.reference && <span>{item.bill.reference}</span>}
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => generateCaseBill(item.id)}
                        disabled={item.bill?.generated}
                      >
                        Generate Bill
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "cases" && (
            <section className="dashboard-panel dashboard-panel-my-cases">
              <h3>My Cases</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Case ID (optional)"
                  value={caseDraft.id}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, id: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Client name"
                  value={caseDraft.client}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, client: event.target.value }))
                  }
                />
                <select
                  value={caseDraft.stage}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, stage: event.target.value }))
                  }
                >
                  {LAWYER_CASE_STAGE_OPTIONS.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Next date"
                  value={caseDraft.nextDate}
                  onChange={(event) =>
                    setCaseDraft((prev) => ({ ...prev, nextDate: event.target.value }))
                  }
                />
                <button type="button" className="dashboard-action-btn" onClick={addCase}>
                  Add Case
                </button>
              </div>

              <div className="dashboard-list dashboard-case-feed">
                {myCases.map((item) => (
                  <article
                    key={item.id}
                    className="dashboard-list-item dashboard-case-item dashboard-case-card dashboard-lawyer-case-card"
                  >
                    <div className="dashboard-case-head">
                      <div>
                        <strong>{item.id}</strong>
                        <p>
                          Client: {item.client} • Stage: {item.stage}
                        </p>
                        <p>Next Date: {item.nextDate}</p>
                      </div>
                      <div className="dashboard-item-actions">
                        <select
                          value={item.stage}
                          onChange={(event) =>
                            setMyCases((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? { ...entry, stage: event.target.value }
                                  : entry
                              )
                            )
                          }
                        >
                          {LAWYER_CASE_STAGE_OPTIONS.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="dashboard-doc-section">
                      <p>My Documents</p>
                      <div className="dashboard-doc-list">
                        {(Array.isArray(item.documents) ? item.documents : []).map((doc) => (
                          <div key={doc.id} className="dashboard-doc-item">
                            <span>
                              {doc.name} ({doc.type}) - {doc.updatedOn || doc.uploadedOn}
                            </span>
                            <button
                              type="button"
                              className="dashboard-danger-btn"
                              onClick={() =>
                                setMyCases((prev) =>
                                  prev.map((entry) =>
                                    entry.id === item.id
                                      ? {
                                          ...entry,
                                          documents: (entry.documents || []).filter(
                                            (docItem) => docItem.id !== doc.id
                                          ),
                                        }
                                      : entry
                                  )
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="dashboard-inline-form">
                        <input
                          type="text"
                          placeholder="File name"
                          value={docDrafts[item.id]?.name || ""}
                          onChange={(event) =>
                            updateDocDraft(item.id, { name: event.target.value })
                          }
                        />
                        <select
                          value={docDrafts[item.id]?.type || "text"}
                          onChange={(event) =>
                            updateDocDraft(item.id, { type: event.target.value })
                          }
                        >
                          {FILE_KIND_OPTIONS.map((kind) => (
                            <option key={kind} value={kind}>
                              {kind}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="dashboard-action-btn"
                          onClick={() => {
                            const draft = docDrafts[item.id] || { name: "", type: "text" };
                            const name = String(draft.name || "").trim();
                            if (!name) return;
                            setMyCases((prev) =>
                              prev.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      documents: [
                                        {
                                          id: `DOC-${Date.now()}`,
                                          name,
                                          type: draft.type || "text",
                                          updatedOn: formatToday(),
                                        },
                                        ...(entry.documents || []),
                                      ],
                                    }
                                  : entry
                              )
                            );
                            updateDocDraft(item.id, { name: "", type: "text" });
                          }}
                        >
                          Add File
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminDashboard({
  currentUser,
  onOpenLegalAssistant,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState(() => readArrayFromStorage(USERS_STORAGE_KEY));
  const [lawyers, setLawyers] = useState(() => readArrayFromStorage(LAWYERS_STORAGE_KEY));
  const [reports, setReports] = useState(() => {
    const stored = readArrayFromStorage(ADMIN_REPORTS_STORAGE_KEY);
    if (stored.length === 0) return createSeedAdminReports();
    return stored.map((item, index) => normalizeAdminReport(item, index));
  });
  const [tickets, setTickets] = useState(() =>
    readArrayFromStorage(ADMIN_TICKETS_STORAGE_KEY).map((item, index) =>
      normalizeAdminTicket(item, index)
    )
  );
  const [verificationQueue, setVerificationQueue] = useState(() =>
    syncVerificationQueueWithLawyers(
      readArrayFromStorage(ADMIN_VERIFICATION_QUEUE_STORAGE_KEY).map((item, index) =>
        normalizeVerificationQueueEntry(item, index)
      ),
      readArrayFromStorage(LAWYERS_STORAGE_KEY)
    )
  );
  const [auditLogs, setAuditLogs] = useState(() =>
    readArrayFromStorage(ADMIN_AUDIT_LOGS_STORAGE_KEY).map((item, index) =>
      normalizeAuditLog(item, index)
    )
  );
  const [riskProfiles, setRiskProfiles] = useState(() =>
    syncRiskProfiles(
      readArrayFromStorage(ADMIN_RISK_FLAGS_STORAGE_KEY),
      readArrayFromStorage(USERS_STORAGE_KEY),
      readArrayFromStorage(ADMIN_TICKETS_STORAGE_KEY)
    )
  );
  const [announcements, setAnnouncements] = useState(() =>
    readArrayFromStorage(ADMIN_ANNOUNCEMENTS_STORAGE_KEY).map((item, index) =>
      normalizeAnnouncement(item, index)
    )
  );
  const [policyVersions, setPolicyVersions] = useState([]);
  const [policyAuditLogs, setPolicyAuditLogs] = useState([]);
  const [activePolicyVersionId, setActivePolicyVersionId] = useState("");
  const [policyDraft, setPolicyDraft] = useState(() => createPolicyDraft());
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policySuccess, setPolicySuccess] = useState("");
  const [policyActivationNote, setPolicyActivationNote] = useState("");
  const [reportDraft, setReportDraft] = useState({
    item: "",
    value: "1",
    note: "",
  });
  const [ticketDraft, setTicketDraft] = useState({
    title: "",
    description: "",
    severity: "Medium",
    reportedUser: "",
    assignee: "",
    dueDate: addDaysIso(2),
  });
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: "",
    message: "",
    audience: "All",
    severity: "Info",
  });
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRoleFilter, setAccountRoleFilter] = useState("all");
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [riskSearch, setRiskSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  const toTimestamp = (value) => {
    if (typeof value === "number") return value;
    const parsed = new Date(value || "").getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    setUsers((prev) => {
      const next = prev.map((user) =>
        user?.role === "admin"
          ? {
              ...user,
              adminTier: normalizeAdminTier(user),
            }
          : { ...user, adminTier: "" }
      );
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(LAWYERS_STORAGE_KEY, JSON.stringify(lawyers));
  }, [lawyers]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_REPORTS_STORAGE_KEY,
      JSON.stringify(reports.map((item, index) => normalizeAdminReport(item, index)))
    );
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_TICKETS_STORAGE_KEY,
      JSON.stringify(tickets.map((item, index) => normalizeAdminTicket(item, index)))
    );
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_VERIFICATION_QUEUE_STORAGE_KEY,
      JSON.stringify(
        verificationQueue.map((item, index) =>
          normalizeVerificationQueueEntry(item, index)
        )
      )
    );
  }, [verificationQueue]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_AUDIT_LOGS_STORAGE_KEY,
      JSON.stringify(auditLogs.map((item, index) => normalizeAuditLog(item, index)))
    );
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(ADMIN_RISK_FLAGS_STORAGE_KEY, JSON.stringify(riskProfiles));
  }, [riskProfiles]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify(
        announcements.map((item, index) => normalizeAnnouncement(item, index))
      )
    );
  }, [announcements]);

  useEffect(() => {
    setVerificationQueue((prev) => {
      const next = syncVerificationQueueWithLawyers(prev, lawyers);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [lawyers]);

  useEffect(() => {
    setRiskProfiles((prev) => {
      const next = syncRiskProfiles(prev, users, tickets);
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [users, tickets]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === USERS_STORAGE_KEY) {
        setUsers(readArrayFromStorage(USERS_STORAGE_KEY));
      }
      if (event.key === LAWYERS_STORAGE_KEY) {
        setLawyers(readArrayFromStorage(LAWYERS_STORAGE_KEY));
      }
      if (event.key === ADMIN_REPORTS_STORAGE_KEY) {
        const stored = readArrayFromStorage(ADMIN_REPORTS_STORAGE_KEY);
        setReports(
          stored.length > 0
            ? stored.map((item, index) => normalizeAdminReport(item, index))
            : createSeedAdminReports()
        );
      }
      if (event.key === ADMIN_TICKETS_STORAGE_KEY) {
        setTickets(
          readArrayFromStorage(ADMIN_TICKETS_STORAGE_KEY).map((item, index) =>
            normalizeAdminTicket(item, index)
          )
        );
      }
      if (event.key === ADMIN_VERIFICATION_QUEUE_STORAGE_KEY) {
        setVerificationQueue(
          readArrayFromStorage(ADMIN_VERIFICATION_QUEUE_STORAGE_KEY).map((item, index) =>
            normalizeVerificationQueueEntry(item, index)
          )
        );
      }
      if (event.key === ADMIN_AUDIT_LOGS_STORAGE_KEY) {
        setAuditLogs(
          readArrayFromStorage(ADMIN_AUDIT_LOGS_STORAGE_KEY).map((item, index) =>
            normalizeAuditLog(item, index)
          )
        );
      }
      if (event.key === ADMIN_RISK_FLAGS_STORAGE_KEY) {
        setRiskProfiles(readArrayFromStorage(ADMIN_RISK_FLAGS_STORAGE_KEY));
      }
      if (event.key === ADMIN_ANNOUNCEMENTS_STORAGE_KEY) {
        setAnnouncements(
          readArrayFromStorage(ADMIN_ANNOUNCEMENTS_STORAGE_KEY).map((item, index) =>
            normalizeAnnouncement(item, index)
          )
        );
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentIdentifier = getUserIdentifier(currentUser);
  const currentAdminUser = useMemo(() => {
    const found = users.find((item) => getUserIdentifier(item) === currentIdentifier);
    if (found) return found;
    return {
      ...currentUser,
      role: "admin",
      adminTier: normalizeAdminTier({ ...currentUser, role: "admin" }),
    };
  }, [currentIdentifier, currentUser, users]);
  const currentAdminTier = normalizeAdminTier(currentAdminUser);
  const permissionSet = useMemo(
    () => new Set(ADMIN_PERMISSION_MATRIX[currentAdminTier] || []),
    [currentAdminTier]
  );
  const canViewPolicyManager = permissionSet.has("view_audit");
  const hasPermission = (permission) => permissionSet.has(permission);
  const requirePermission = (permission) => {
    if (hasPermission(permission)) return true;
    window.alert(
      `This action requires permission: ${permission}. Current admin tier: ${currentAdminTier}.`
    );
    return false;
  };

  const logAudit = (action, target, details = "") => {
    setAuditLogs((prev) => [
      normalizeAuditLog(
        {
          id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: getNowIso(),
          actor: currentUser?.displayName || currentUser?.username || "Admin",
          action,
          target,
          details,
        },
        0
      ),
      ...prev,
    ].slice(0, 500));
  };

  const syncPolicyManager = useCallback(
    async ({ resetDraft = false } = {}) => {
      setPolicyLoading(true);
      setPolicyError("");
      try {
        const response = await fetchAdminPolicyManager();
        const versions = Array.isArray(response?.versions) ? response.versions : [];
        const audit = Array.isArray(response?.audit) ? response.audit : [];
        const activeId = String(response?.activeVersionId || "").trim();
        const activeVersion =
          versions.find((item) => item.id === activeId) || versions[0] || null;

        setPolicyVersions(versions);
        setPolicyAuditLogs(audit);
        setActivePolicyVersionId(activeVersion?.id || activeId || "");

        if (resetDraft) {
          setPolicyDraft(createPolicyDraftFromVersion(activeVersion));
        }
      } catch {
        setPolicyError("Could not load policy manager right now.");
      } finally {
        setPolicyLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!canViewPolicyManager) return;
    void syncPolicyManager({ resetDraft: true });
  }, [canViewPolicyManager, currentIdentifier, currentAdminTier, syncPolicyManager]);

  const applyCurrentUserUpdate = (updatedUser) => {
    if (!updatedUser) return;
    const updatedIdentifier = getUserIdentifier(updatedUser);
    if (!updatedIdentifier || updatedIdentifier !== currentIdentifier) return;

    try {
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          email: updatedUser.email,
          role: updatedUser.role || "user",
          adminTier: normalizeAdminTier(updatedUser),
        })
      );
      window.dispatchEvent(new Event("auth-updated"));
    } catch {
      // Best-effort sync only.
    }
  };

  const setLawyerVerificationState = (lawyerId, nextVerified, source = "Admin Verification") => {
    const normalizedLawyerId = String(lawyerId || "").trim();
    if (!normalizedLawyerId) return;
    const targetLawyer = lawyers.find(
      (entry) => getLawyerIdentifier(entry) === normalizedLawyerId
    );
    if (!targetLawyer) return;

    const nextLawyers = lawyers.map((entry) => {
      if (getLawyerIdentifier(entry) !== normalizedLawyerId) return entry;
      return {
        ...entry,
        docsVerified: nextVerified,
        verificationChecks: {
          ...(entry.verificationChecks || {}),
          enrollmentVerified: nextVerified
            ? true
            : Boolean(entry.verificationChecks?.enrollmentVerified),
          ecourtsVerified: nextVerified
            ? true
            : Boolean(entry.verificationChecks?.ecourtsVerified),
          officeVerified: nextVerified
            ? true
            : Boolean(entry.verificationChecks?.officeVerified),
          reputationVerified: nextVerified
            ? true
            : Boolean(entry.verificationChecks?.reputationVerified),
          redFlagsCleared: nextVerified
            ? true
            : Boolean(entry.verificationChecks?.redFlagsCleared),
        },
        verificationSource: nextVerified ? source : entry.verificationSource || "",
        lastVerifiedOn: getTodayIso(),
      };
    });
    setLawyers(nextLawyers);

    if (nextVerified) {
      const targetIdentifier = normalizeEmailOrUsername(targetLawyer.email);
      if (targetIdentifier) {
        let updatedSessionUser = null;
        setUsers((prev) =>
          prev.map((entry) => {
            const entryIdentifier = getUserIdentifier(entry);
            if (entryIdentifier !== targetIdentifier) return entry;
            updatedSessionUser = { ...entry, role: "lawyer", adminTier: "" };
            return updatedSessionUser;
          })
        );
        applyCurrentUserUpdate(updatedSessionUser);
      }
    }
  };

  const addReport = () => {
    if (!requirePermission("manage_reports")) return;
    const item = reportDraft.item.trim();
    const note = reportDraft.note.trim();
    const value = Number(reportDraft.value);
    if (!item) {
      window.alert("Enter report title.");
      return;
    }
    if (!Number.isFinite(value) || value < 0) {
      window.alert("Enter a valid report count.");
      return;
    }

    const report = normalizeAdminReport(
      {
        id: `REPORT-${Date.now()}`,
        item,
        value: Math.round(value),
        note,
        status: "Open",
        createdOn: getNowIso(),
        updatedOn: getNowIso(),
      },
      0
    );
    setReports((prev) => [report, ...prev]);
    setReportDraft({
      item: "",
      value: "1",
      note: "",
    });
    logAudit("Created report", report.item, `Count ${report.value}`);
  };

  const updateReportStatus = (reportId, nextStatus) => {
    if (!requirePermission("manage_reports")) return;
    const normalizedStatus = nextStatus === "Resolved" ? "Resolved" : "Open";
    let target = "";
    setReports((prev) =>
      prev.map((entry) => {
        if (entry.id !== reportId) return entry;
        target = entry.item;
        return {
          ...entry,
          status: normalizedStatus,
          updatedOn: getNowIso(),
        };
      })
    );
    if (target) {
      logAudit("Updated report status", target, normalizedStatus);
    }
  };

  const deleteReport = (reportId) => {
    if (!requirePermission("manage_reports")) return;
    const target = reports.find((entry) => entry.id === reportId);
    setReports((prev) => prev.filter((entry) => entry.id !== reportId));
    if (target) {
      logAudit("Deleted report", target.item, `Report ID ${target.id}`);
    }
  };

  const createTicketFromReport = (report) => {
    if (!requirePermission("manage_tickets")) return;
    const created = normalizeAdminTicket(
      {
        id: `TICKET-${Date.now()}`,
        title: `Review: ${report.item}`,
        description: report.note || "Created from platform report.",
        severity: report.value >= 15 ? "High" : report.value >= 8 ? "Medium" : "Low",
        status: "Open",
        sourceReportId: report.id,
        dueDate: addDaysIso(2),
        createdAt: getNowIso(),
        updatedAt: getNowIso(),
      },
      0
    );
    setTickets((prev) => [created, ...prev]);
    logAudit("Created ticket from report", report.item, `Ticket ${created.id}`);
  };

  const addTicket = () => {
    if (!requirePermission("manage_tickets")) return;
    const title = ticketDraft.title.trim();
    if (!title) {
      window.alert("Enter ticket title.");
      return;
    }

    const nextTicket = normalizeAdminTicket(
      {
        id: `TICKET-${Date.now()}`,
        title,
        description: ticketDraft.description,
        severity: ticketDraft.severity,
        status: "Open",
        reportedUser: ticketDraft.reportedUser,
        assignee: ticketDraft.assignee,
        dueDate: ticketDraft.dueDate || addDaysIso(2),
        createdAt: getNowIso(),
        updatedAt: getNowIso(),
      },
      0
    );
    setTickets((prev) => [nextTicket, ...prev]);
    setTicketDraft({
      title: "",
      description: "",
      severity: "Medium",
      reportedUser: "",
      assignee: "",
      dueDate: addDaysIso(2),
    });
    logAudit("Created ticket", nextTicket.title, nextTicket.severity);
  };

  const updateTicket = (ticketId, patch) => {
    if (!requirePermission("manage_tickets")) return;
    let changedTicket = null;
    setTickets((prev) =>
      prev.map((entry) => {
        if (entry.id !== ticketId) return entry;
        changedTicket = normalizeAdminTicket(
          {
            ...entry,
            ...patch,
            updatedAt: getNowIso(),
          },
          0
        );
        return changedTicket;
      })
    );

    if (changedTicket?.status === "Resolved" && changedTicket.sourceReportId) {
      updateReportStatus(changedTicket.sourceReportId, "Resolved");
    }

    if (changedTicket) {
      logAudit("Updated ticket", changedTicket.title, changedTicket.status);
    }
  };

  const deleteTicket = (ticketId) => {
    if (!requirePermission("manage_tickets")) return;
    const target = tickets.find((entry) => entry.id === ticketId);
    setTickets((prev) => prev.filter((entry) => entry.id !== ticketId));
    if (target) {
      logAudit("Deleted ticket", target.title, target.id);
    }
  };

  const updateVerificationQueue = (queueId, patch) => {
    if (!requirePermission("manage_verification")) return;
    let changed = null;
    setVerificationQueue((prev) =>
      prev.map((entry) => {
        if (entry.id !== queueId) return entry;
        changed = normalizeVerificationQueueEntry(
          {
            ...entry,
            ...patch,
            updatedAt: getNowIso(),
          },
          0
        );
        return changed;
      })
    );
    if (changed) {
      logAudit("Updated verification queue", changed.lawyerName, changed.status);
    }
  };

  const changeQueueStatus = (queueItem, nextStatus) => {
    if (!requirePermission("manage_verification")) return;
    const normalizedStatus = VERIFICATION_STATUS_OPTIONS.includes(nextStatus)
      ? nextStatus
      : "Pending";
    updateVerificationQueue(queueItem.id, { status: normalizedStatus });
    if (normalizedStatus === "Approved") {
      setLawyerVerificationState(queueItem.lawyerId, true);
    }
    if (normalizedStatus === "Rejected") {
      setLawyerVerificationState(queueItem.lawyerId, false, "Rejected by Admin");
    }
  };

  const toggleLawyerVerification = (targetLawyer) => {
    if (!requirePermission("manage_lawyers")) return;
    if (!targetLawyer) return;
    const lawyerId = getLawyerIdentifier(targetLawyer);
    const nextVerified = !targetLawyer?.docsVerified;
    setLawyerVerificationState(lawyerId, nextVerified);

    setVerificationQueue((prev) =>
      prev.map((entry) =>
        entry.lawyerId === lawyerId
          ? normalizeVerificationQueueEntry(
              {
                ...entry,
                status: nextVerified ? "Approved" : "Pending",
                escalated: false,
                updatedAt: getNowIso(),
              },
              0
            )
          : entry
      )
    );

    logAudit(
      nextVerified ? "Verified lawyer profile" : "Marked lawyer pending",
      targetLawyer?.name || "Lawyer",
      lawyerId
    );
  };

  const deleteLawyer = (targetLawyer) => {
    if (!requirePermission("manage_lawyers")) return;
    if (!targetLawyer) return;
    const lawyerId = getLawyerIdentifier(targetLawyer);
    setLawyers((prev) => prev.filter((entry) => getLawyerIdentifier(entry) !== lawyerId));
    setVerificationQueue((prev) => prev.filter((entry) => entry.lawyerId !== lawyerId));
    logAudit("Deleted lawyer entry", targetLawyer?.name || "Lawyer", lawyerId);
  };

  const changeUserRole = (targetUser, nextRole) => {
    if (!requirePermission("manage_accounts")) return;
    if (!targetUser || !nextRole) return;
    const targetIdentifier = getUserIdentifier(targetUser);
    const targetCurrentRole = targetUser.role || "user";
    if (!targetIdentifier || targetCurrentRole === nextRole) return;

    const adminUsers = users.filter((item) => item?.role === "admin");
    const superAdmins = adminUsers.filter(
      (item) => normalizeAdminTier(item) === "super_admin"
    );

    if (targetIdentifier === currentIdentifier && nextRole !== "admin") {
      window.alert("You cannot remove admin role from your own active account.");
      return;
    }
    if (targetCurrentRole === "admin" && nextRole !== "admin" && adminUsers.length <= 1) {
      window.alert("At least one admin account must remain.");
      return;
    }
    if (
      targetCurrentRole === "admin" &&
      normalizeAdminTier(targetUser) === "super_admin" &&
      nextRole !== "admin" &&
      superAdmins.length <= 1
    ) {
      window.alert("At least one super admin must remain.");
      return;
    }

    let updatedUser = null;
    setUsers((prev) =>
      prev.map((entry) => {
        if (getUserIdentifier(entry) !== targetIdentifier) return entry;
        updatedUser = {
          ...entry,
          role: nextRole,
          adminTier:
            nextRole === "admin"
              ? normalizeAdminTier({ ...entry, role: "admin" })
              : "",
        };
        return updatedUser;
      })
    );
    applyCurrentUserUpdate(updatedUser);
    if (updatedUser) {
      logAudit("Changed user role", updatedUser.email || updatedUser.username, nextRole);
    }
  };

  const updateAdminTier = (targetUser, nextTier) => {
    if (!requirePermission("manage_roles")) return;
    if (!targetUser || targetUser.role !== "admin") return;
    if (!ADMIN_TIER_OPTIONS.includes(nextTier)) return;
    const targetIdentifier = getUserIdentifier(targetUser);
    const currentTier = normalizeAdminTier(targetUser);
    if (currentTier === nextTier) return;

    const superAdmins = users.filter(
      (item) => item?.role === "admin" && normalizeAdminTier(item) === "super_admin"
    );
    if (currentTier === "super_admin" && nextTier !== "super_admin" && superAdmins.length <= 1) {
      window.alert("At least one super admin must remain.");
      return;
    }

    let updatedUser = null;
    setUsers((prev) =>
      prev.map((entry) => {
        if (getUserIdentifier(entry) !== targetIdentifier) return entry;
        updatedUser = { ...entry, adminTier: nextTier };
        return updatedUser;
      })
    );
    applyCurrentUserUpdate(updatedUser);
    if (updatedUser) {
      logAudit("Updated admin tier", updatedUser.email || updatedUser.username, nextTier);
    }
  };

  const deleteUser = (targetUser) => {
    if (!requirePermission("manage_accounts")) return;
    if (!targetUser) return;
    const targetIdentifier = getUserIdentifier(targetUser);
    if (!targetIdentifier) return;
    if (targetIdentifier === currentIdentifier) {
      window.alert("You cannot delete your own active account.");
      return;
    }

    const adminUsers = users.filter((item) => item?.role === "admin");
    const superAdmins = adminUsers.filter(
      (item) => normalizeAdminTier(item) === "super_admin"
    );
    if (targetUser.role === "admin" && adminUsers.length <= 1) {
      window.alert("At least one admin account must remain.");
      return;
    }
    if (
      targetUser.role === "admin" &&
      normalizeAdminTier(targetUser) === "super_admin" &&
      superAdmins.length <= 1
    ) {
      window.alert("At least one super admin must remain.");
      return;
    }

    setUsers((prev) => prev.filter((entry) => getUserIdentifier(entry) !== targetIdentifier));
    setRiskProfiles((prev) =>
      prev.filter((entry) => normalizeEmailOrUsername(entry.userIdentifier) !== targetIdentifier)
    );
    logAudit("Deleted user account", targetUser.email || targetUser.username, targetIdentifier);
  };

  const recordRiskEvent = (identifier, eventType) => {
    if (!requirePermission("manage_risk")) return;
    const normalizedIdentifier = normalizeEmailOrUsername(identifier);
    if (!normalizedIdentifier) return;
    setRiskProfiles((prev) =>
      prev.map((entry) => {
        if (normalizeEmailOrUsername(entry.userIdentifier) !== normalizedIdentifier) return entry;
        const next = { ...entry };
        if (eventType === "failed_login") {
          next.failedLogins = Number(next.failedLogins || 0) + 1;
        }
        if (eventType === "spam_report") {
          next.spamReports = Number(next.spamReports || 0) + 1;
        }
        if (eventType === "profile_edit") {
          next.profileEdits = Number(next.profileEdits || 0) + 1;
        }
        const nextScore = computeRiskScore({
          failedLogins: next.failedLogins,
          spamReports: next.spamReports,
          profileEdits: next.profileEdits,
          openHighSeverityTickets: next.openHighSeverityTickets,
        });
        next.riskScore = nextScore;
        next.riskLevel = getRiskLevel(nextScore);
        next.flagged = next.riskLevel === "High";
        next.updatedAt = getNowIso();
        return next;
      })
    );
    logAudit("Recorded risk event", normalizedIdentifier, eventType);
  };

  const resetRiskProfile = (identifier) => {
    if (!requirePermission("manage_risk")) return;
    const normalizedIdentifier = normalizeEmailOrUsername(identifier);
    if (!normalizedIdentifier) return;
    setRiskProfiles((prev) =>
      prev.map((entry) => {
        if (normalizeEmailOrUsername(entry.userIdentifier) !== normalizedIdentifier) return entry;
        const nextScore = computeRiskScore({
          failedLogins: 0,
          spamReports: 0,
          profileEdits: 0,
          openHighSeverityTickets: entry.openHighSeverityTickets,
        });
        return {
          ...entry,
          failedLogins: 0,
          spamReports: 0,
          profileEdits: 0,
          riskScore: nextScore,
          riskLevel: getRiskLevel(nextScore),
          flagged: getRiskLevel(nextScore) === "High",
          updatedAt: getNowIso(),
        };
      })
    );
    logAudit("Reset risk profile", normalizedIdentifier, "Counters reset to zero");
  };

  const addAnnouncement = () => {
    if (!requirePermission("manage_announcements")) return;
    const title = announcementDraft.title.trim();
    const message = announcementDraft.message.trim();
    if (!title || !message) {
      window.alert("Enter announcement title and message.");
      return;
    }
    const nextAnnouncement = normalizeAnnouncement(
      {
        id: `ANNOUNCE-${Date.now()}`,
        title,
        message,
        audience: announcementDraft.audience,
        severity: announcementDraft.severity,
        status: "Draft",
        createdAt: getNowIso(),
        updatedAt: getNowIso(),
      },
      0
    );
    setAnnouncements((prev) => [nextAnnouncement, ...prev]);
    setAnnouncementDraft({
      title: "",
      message: "",
      audience: "All",
      severity: "Info",
    });
    logAudit("Created announcement", nextAnnouncement.title, nextAnnouncement.audience);
  };

  const updateAnnouncementStatus = (announcementId, nextStatus) => {
    if (!requirePermission("manage_announcements")) return;
    if (!ANNOUNCEMENT_STATUS_OPTIONS.includes(nextStatus)) return;
    let changed = null;
    setAnnouncements((prev) =>
      prev.map((entry) => {
        if (entry.id !== announcementId) return entry;
        changed = normalizeAnnouncement(
          {
            ...entry,
            status: nextStatus,
            updatedAt: getNowIso(),
          },
          0
        );
        return changed;
      })
    );
    if (changed) {
      logAudit("Updated announcement", changed.title, nextStatus);
    }
  };

  const deleteAnnouncement = (announcementId) => {
    if (!requirePermission("manage_announcements")) return;
    const target = announcements.find((entry) => entry.id === announcementId);
    setAnnouncements((prev) => prev.filter((entry) => entry.id !== announcementId));
    if (target) {
      logAudit("Deleted announcement", target.title, announcementId);
    }
  };

  const submitPolicyVersion = async () => {
    if (!requirePermission("manage_policies")) return;
    const terms = splitPolicyLines(policyDraft.termsText);
    const privacy = splitPolicyLines(policyDraft.privacyText);
    const retention = splitPolicyLines(policyDraft.retentionText);
    if (terms.length === 0 || privacy.length === 0 || retention.length === 0) {
      setPolicyError("Terms, Privacy, and Retention text are required before publish.");
      setPolicySuccess("");
      return;
    }

    setPolicyLoading(true);
    setPolicyError("");
    setPolicySuccess("");
    try {
      const response = await publishAdminPolicyVersion({
        versionLabel: policyDraft.versionLabel.trim(),
        effectiveFrom: policyDraft.effectiveFrom,
        note: policyDraft.note.trim(),
        terms,
        privacy,
        retention,
      });
      const version = response?.version || null;
      setPolicyAuditLogs(Array.isArray(response?.audit) ? response.audit : []);
      await syncPolicyManager({ resetDraft: true });
      setPolicySuccess(
        `Policy version ${version?.versionLabel || "updated"} published and set active.`
      );
      logAudit(
        "Published policy version",
        version?.versionLabel || "Policy",
        version?.effectiveFrom || getTodayIso()
      );
    } catch (error) {
      setPolicyError(String(error?.message || "Could not publish policy version."));
    } finally {
      setPolicyLoading(false);
    }
  };

  const activatePolicy = async (versionId) => {
    if (!requirePermission("manage_policies")) return;
    const target = policyVersions.find((entry) => entry.id === versionId);
    if (!target || target.id === activePolicyVersionId) return;
    setPolicyLoading(true);
    setPolicyError("");
    setPolicySuccess("");
    try {
      const response = await activateAdminPolicyVersion(versionId, policyActivationNote.trim());
      setPolicyAuditLogs(Array.isArray(response?.audit) ? response.audit : []);
      await syncPolicyManager({ resetDraft: false });
      setPolicyActivationNote("");
      setPolicySuccess(
        `Activated policy version ${target.versionLabel || target.id}.`
      );
      logAudit(
        "Activated policy version",
        target.versionLabel || target.id,
        policyActivationNote.trim() || "Activated from dashboard"
      );
    } catch (error) {
      setPolicyError(String(error?.message || "Could not activate policy version."));
    } finally {
      setPolicyLoading(false);
    }
  };

  const exportJsonBackup = () => {
    if (!requirePermission("export_data")) return;
    const payload = {
      exportedAt: getNowIso(),
      users,
      lawyers,
      reports,
      tickets,
      verificationQueue,
      riskProfiles,
      announcements,
      auditLogs,
    };
    downloadTextFile(
      `nayay-setu-admin-backup-${getTodayIso()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8"
    );
    logAudit("Exported JSON backup", "Admin backup", "Full snapshot");
  };

  const exportCsvDataset = (dataset) => {
    if (!requirePermission("export_data")) return;
    const map = {
      users: users.map((item) => ({
        username: item.username,
        displayName: item.displayName,
        email: item.email,
        role: item.role,
        adminTier: item.adminTier || "",
        createdAt: item.createdAt || "",
      })),
      lawyers: lawyers.map((item) => ({
        id: item.id,
        name: item.name,
        field: item.field,
        email: item.email,
        city: item.city || item.district || "",
        docsVerified: item.docsVerified,
      })),
      reports: reports.map((item) => ({
        id: item.id,
        item: item.item,
        value: item.value,
        status: item.status,
        updatedOn: item.updatedOn,
      })),
      tickets: tickets.map((item) => ({
        id: item.id,
        title: item.title,
        severity: item.severity,
        status: item.status,
        dueDate: item.dueDate,
        reportedUser: item.reportedUser,
      })),
      verification: verificationQueue.map((item) => ({
        id: item.id,
        lawyerName: item.lawyerName,
        email: item.email,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
        escalated: item.escalated,
      })),
      announcements: announcements.map((item) => ({
        id: item.id,
        title: item.title,
        audience: item.audience,
        severity: item.severity,
        status: item.status,
      })),
    };
    const rows = map[dataset] || [];
    if (rows.length === 0) {
      window.alert(`No data available for ${dataset} export.`);
      return;
    }
    downloadTextFile(
      `nayay-setu-${dataset}-${getTodayIso()}.csv`,
      toCsv(rows),
      "text/csv;charset=utf-8"
    );
    logAudit("Exported CSV", dataset, `${rows.length} rows`);
  };

  const counts = useMemo(() => {
    const roles = users.reduce(
      (acc, user) => {
        const role = user?.role || "user";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { user: 0, lawyer: 0, admin: 0 }
    );
    const pendingVerification = verificationQueue.filter((item) =>
      ["Pending", "In Review"].includes(item.status)
    );
    const todayValue = new Date(getTodayIso()).getTime();
    const slaBreaches = pendingVerification.filter((item) => {
      const dueTime = new Date(item.dueDate || "").getTime();
      return dueTime > 0 && dueTime < todayValue;
    }).length;

    return {
      totalUsers: users.length,
      lawyerAccounts: roles.lawyer,
      adminAccounts: roles.admin,
      manualLawyerEntries: lawyers.length,
      pendingLawyerChecks: lawyers.filter((item) => !item?.docsVerified).length,
      openReports: reports.filter((item) => item.status !== "Resolved").length,
      openTickets: tickets.filter((item) => item.status !== "Resolved").length,
      highRiskUsers: riskProfiles.filter((item) => item.flagged).length,
      publishedAnnouncements: announcements.filter(
        (item) => item.status === "Published"
      ).length,
      slaBreaches,
    };
  }, [announcements, lawyers, reports, riskProfiles, tickets, users, verificationQueue]);

  const analytics = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const signupsThisWeek = users.filter((item) => {
      const createdAt = toTimestamp(item.createdAt || item.createdOn || item.updatedAt);
      return createdAt >= weekAgo;
    }).length;
    const lawyerApprovalsThisWeek = verificationQueue.filter((item) => {
      if (item.status !== "Approved") return false;
      return toTimestamp(item.updatedAt) >= weekAgo;
    }).length;
    const newTicketsThisWeek = tickets.filter(
      (item) => toTimestamp(item.createdAt) >= weekAgo
    ).length;

    const resolvedReportTickets = tickets.filter(
      (item) => item.sourceReportId && item.status === "Resolved"
    );
    const reportResolutionHours = resolvedReportTickets
      .map((item) => (toTimestamp(item.updatedAt) - toTimestamp(item.createdAt)) / 3600000)
      .filter((value) => Number.isFinite(value) && value >= 0);
    const avgReportResolutionHours =
      reportResolutionHours.length > 0
        ? reportResolutionHours.reduce((sum, value) => sum + value, 0) /
          reportResolutionHours.length
        : 0;

    return {
      signupsThisWeek,
      lawyerApprovalsThisWeek,
      newTicketsThisWeek,
      avgReportResolutionHours,
    };
  }, [tickets, users, verificationQueue]);

  const visibleUsers = useMemo(() => {
    const query = accountSearch.trim().toLowerCase();
    return users.filter((user) => {
      const role = user?.role || "user";
      const roleMatch = accountRoleFilter === "all" || role === accountRoleFilter;
      if (!roleMatch) return false;
      if (!query) return true;

      const name = String(user?.displayName || "").toLowerCase();
      const username = String(user?.username || "").toLowerCase();
      const email = String(user?.email || "").toLowerCase();
      return name.includes(query) || username.includes(query) || email.includes(query);
    });
  }, [accountRoleFilter, accountSearch, users]);

  const visibleLawyers = useMemo(() => {
    const query = lawyerSearch.trim().toLowerCase();
    if (!query) return lawyers;
    return lawyers.filter((lawyer) => {
      const name = String(lawyer?.name || "").toLowerCase();
      const email = String(lawyer?.email || "").toLowerCase();
      const field = String(lawyer?.field || "").toLowerCase();
      const city = String(lawyer?.city || lawyer?.district || "").toLowerCase();
      return name.includes(query) || email.includes(query) || field.includes(query) || city.includes(query);
    });
  }, [lawyerSearch, lawyers]);

  const visibleQueue = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();
    if (!query) return verificationQueue;
    return verificationQueue.filter((entry) => {
      const name = String(entry?.lawyerName || "").toLowerCase();
      const email = String(entry?.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [queueSearch, verificationQueue]);

  const visibleTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((entry) => {
      const title = String(entry?.title || "").toLowerCase();
      const status = String(entry?.status || "").toLowerCase();
      const reported = String(entry?.reportedUser || "").toLowerCase();
      return title.includes(query) || status.includes(query) || reported.includes(query);
    });
  }, [ticketSearch, tickets]);

  const visibleRiskProfiles = useMemo(() => {
    const query = riskSearch.trim().toLowerCase();
    if (!query) return riskProfiles;
    return riskProfiles.filter((entry) => {
      const name = String(entry?.displayName || "").toLowerCase();
      const email = String(entry?.email || "").toLowerCase();
      const level = String(entry?.riskLevel || "").toLowerCase();
      return name.includes(query) || email.includes(query) || level.includes(query);
    });
  }, [riskProfiles, riskSearch]);

  const visibleAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    if (!query) return auditLogs;
    return auditLogs.filter((entry) => {
      const actor = String(entry?.actor || "").toLowerCase();
      const action = String(entry?.action || "").toLowerCase();
      const target = String(entry?.target || "").toLowerCase();
      const details = String(entry?.details || "").toLowerCase();
      return (
        actor.includes(query) ||
        action.includes(query) ||
        target.includes(query) ||
        details.includes(query)
      );
    });
  }, [auditLogs, auditSearch]);

  const menuItems = [
    { id: "overview", label: "Overview", count: 1 },
    { id: "reports", label: "Reports", count: reports.length },
    { id: "tickets", label: "Tickets", count: counts.openTickets },
    { id: "verification", label: "Verification Queue", count: counts.pendingLawyerChecks },
    { id: "accounts", label: "Accounts", count: users.length },
    { id: "lawyers", label: "Lawyers", count: lawyers.length },
    { id: "risk", label: "Risk Flags", count: counts.highRiskUsers },
    { id: "announcements", label: "Announcements", count: announcements.length },
    { id: "policies", label: "Policy Versions", count: policyVersions.length },
    { id: "permissions", label: "RBAC", count: 3 },
    { id: "audit", label: "Audit Log", count: auditLogs.length },
    { id: "analytics", label: "Analytics", count: 4 },
    { id: "backup", label: "Export & Backup", count: 6 },
  ];

  const adminUsers = users.filter((entry) => entry?.role === "admin");

  return (
    <section className="dashboard-role-shell">
      <div className="dashboard-profile-row">
        <DashboardProfileCard
          currentUser={currentUser}
          subtitle={`Tier: ${currentAdminTier.replace(/_/g, " ")}. Monitor platform quality, moderation, and operations.`}
        />
      </div>
      <div className="dashboard-role-layout">
        <aside className="dashboard-side-menu">
          <h4>Admin Menu</h4>
          <div className="dashboard-side-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeSection === item.id ? "is-active" : ""}
                onClick={() => setActiveSection(item.id)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
          <DashboardServiceAccess
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        </aside>

        <div className="dashboard-role-main">
          {activeSection === "overview" && (
            <>
              <section className="dashboard-panel">
                <h3>Overview</h3>
                <div className="dashboard-kpi-grid">
                  <article className="dashboard-kpi-card">
                    <span>Total Accounts</span>
                    <strong>{counts.totalUsers}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Open Reports</span>
                    <strong>{counts.openReports}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Open Tickets</span>
                    <strong>{counts.openTickets}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>Pending Verification</span>
                    <strong>{counts.pendingLawyerChecks}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>SLA Breaches</span>
                    <strong>{counts.slaBreaches}</strong>
                  </article>
                  <article className="dashboard-kpi-card">
                    <span>High Risk Users</span>
                    <strong>{counts.highRiskUsers}</strong>
                  </article>
                </div>
              </section>
              <div className="dashboard-content-grid">
                <section className="dashboard-panel">
                  <h3>Recent Audit Actions</h3>
                  <div className="dashboard-list">
                    {auditLogs.slice(0, 5).map((entry) => (
                      <article key={entry.id} className="dashboard-list-item">
                        <div>
                          <strong>{entry.action}</strong>
                          <p>
                            {entry.actor} • {entry.target}
                          </p>
                          {entry.details && <p>{entry.details}</p>}
                        </div>
                        <span>{toDateTimeLabel(entry.at)}</span>
                      </article>
                    ))}
                    {auditLogs.length === 0 && (
                      <article className="dashboard-list-item">
                        <div>
                          <strong>No admin actions yet</strong>
                          <p>Actions appear here automatically.</p>
                        </div>
                        <span>Empty</span>
                      </article>
                    )}
                  </div>
                </section>
                <section className="dashboard-panel">
                  <h3>Weekly Metrics</h3>
                  <div className="dashboard-list">
                    <article className="dashboard-list-item">
                      <div>
                        <strong>New Signups (7d)</strong>
                        <p>User registrations in last 7 days</p>
                      </div>
                      <span>{analytics.signupsThisWeek}</span>
                    </article>
                    <article className="dashboard-list-item">
                      <div>
                        <strong>Lawyer Approvals (7d)</strong>
                        <p>Verification queue approvals</p>
                      </div>
                      <span>{analytics.lawyerApprovalsThisWeek}</span>
                    </article>
                    <article className="dashboard-list-item">
                      <div>
                        <strong>Ticket Intake (7d)</strong>
                        <p>Fresh complaints and reports</p>
                      </div>
                      <span>{analytics.newTicketsThisWeek}</span>
                    </article>
                    <article className="dashboard-list-item">
                      <div>
                        <strong>Avg Report Resolution</strong>
                        <p>Hours to resolve report-linked tickets</p>
                      </div>
                      <span>{analytics.avgReportResolutionHours.toFixed(1)}h</span>
                    </article>
                  </div>
                </section>
              </div>
            </>
          )}

          {activeSection === "reports" && (
            <section className="dashboard-panel">
              <h3>Platform Reports</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Report title"
                  value={reportDraft.item}
                  onChange={(event) =>
                    setReportDraft((prev) => ({ ...prev, item: event.target.value }))
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Count"
                  value={reportDraft.value}
                  onChange={(event) =>
                    setReportDraft((prev) => ({ ...prev, value: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Report note"
                  value={reportDraft.note}
                  onChange={(event) =>
                    setReportDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
                <button type="button" className="dashboard-action-btn" onClick={addReport}>
                  Add Report
                </button>
              </div>
              <div className="dashboard-list">
                {reports.map((report) => (
                  <article key={report.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{report.item}</strong>
                      <p>Count: {report.value}</p>
                      <p>
                        Status: {report.status} • Updated: {toDateTimeLabel(report.updatedOn)}
                      </p>
                      {report.note && <p>Note: {report.note}</p>}
                    </div>
                    <div className="dashboard-inline-actions">
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() =>
                          updateReportStatus(
                            report.id,
                            report.status === "Resolved" ? "Open" : "Resolved"
                          )
                        }
                      >
                        {report.status === "Resolved" ? "Reopen" : "Resolve"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => createTicketFromReport(report)}
                      >
                        Create Ticket
                      </button>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => deleteReport(report.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "tickets" && (
            <section className="dashboard-panel">
              <h3>Ticket / Complaint System</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Ticket title"
                  value={ticketDraft.title}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
                <select
                  value={ticketDraft.severity}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, severity: event.target.value }))
                  }
                >
                  {TICKET_SEVERITY_OPTIONS.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
                <select
                  value={ticketDraft.reportedUser}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, reportedUser: event.target.value }))
                  }
                >
                  <option value="">Reported User (optional)</option>
                  {users.map((entry) => (
                    <option
                      key={entry.email || entry.username}
                      value={entry.email || entry.username}
                    >
                      {entry.displayName || entry.username} ({entry.email || "No email"})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={ticketDraft.dueDate}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Assign to (optional)"
                  value={ticketDraft.assignee}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, assignee: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={ticketDraft.description}
                  onChange={(event) =>
                    setTicketDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
                <button type="button" className="dashboard-action-btn" onClick={addTicket}>
                  Add Ticket
                </button>
                <input
                  type="text"
                  placeholder="Search tickets"
                  value={ticketSearch}
                  onChange={(event) => setTicketSearch(event.target.value)}
                />
              </div>
              <div className="dashboard-list">
                {visibleTickets.map((ticket) => (
                  <article key={ticket.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{ticket.title}</strong>
                      <p>
                        Severity: {ticket.severity} • Due: {toDateLabel(ticket.dueDate)}
                      </p>
                      <p>
                        Status: {ticket.status} • Reported User:{" "}
                        {ticket.reportedUser || "Not linked"}
                      </p>
                      {ticket.description && <p>{ticket.description}</p>}
                    </div>
                    <div className="dashboard-item-actions">
                      <select
                        value={ticket.status}
                        onChange={(event) =>
                          updateTicket(ticket.id, { status: event.target.value })
                        }
                      >
                        {TICKET_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => deleteTicket(ticket.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {visibleTickets.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No tickets found</strong>
                      <p>Create a ticket or clear search filters.</p>
                    </div>
                    <span>0</span>
                  </article>
                )}
              </div>
            </section>
          )}

          {activeSection === "verification" && (
            <section className="dashboard-panel">
              <h3>Verification Queue with SLA</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Search queue by name/email"
                  value={queueSearch}
                  onChange={(event) => setQueueSearch(event.target.value)}
                />
              </div>
              <div className="dashboard-list">
                {visibleQueue.map((item) => {
                  const dueTime = new Date(item.dueDate || "").getTime();
                  const isOverdue =
                    ["Pending", "In Review"].includes(item.status) &&
                    Number.isFinite(dueTime) &&
                    dueTime < new Date(getTodayIso()).getTime();

                  return (
                    <article key={item.id} className="dashboard-list-item dashboard-case-item">
                      <div>
                        <strong>{item.lawyerName}</strong>
                        <p>{item.email || "No email"}</p>
                        <p>
                          Status: {item.status} • Priority: {item.priority}
                        </p>
                        <p>
                          Due: {toDateLabel(item.dueDate)} •{" "}
                          {isOverdue ? "SLA Breached" : "Within SLA"}
                        </p>
                        {item.notes && <p>Notes: {item.notes}</p>}
                      </div>
                      <div className="dashboard-item-actions">
                        <select
                          value={item.priority}
                          onChange={(event) =>
                            updateVerificationQueue(item.id, {
                              priority: event.target.value,
                            })
                          }
                        >
                          {VERIFICATION_PRIORITY_OPTIONS.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(event) =>
                            updateVerificationQueue(item.id, {
                              dueDate: event.target.value,
                            })
                          }
                        />
                        <select
                          value={item.status}
                          onChange={(event) =>
                            changeQueueStatus(item, event.target.value)
                          }
                        >
                          {VERIFICATION_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="dashboard-action-btn"
                          onClick={() =>
                            updateVerificationQueue(item.id, {
                              escalated: !item.escalated,
                            })
                          }
                        >
                          {item.escalated ? "Remove Escalation" : "Escalate"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeSection === "accounts" && (
            <section className="dashboard-panel">
              <h3>Manage Accounts</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Search by name, username, email"
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                />
                <select
                  value={accountRoleFilter}
                  onChange={(event) => setAccountRoleFilter(event.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="dashboard-list">
                {visibleUsers.map((entry, index) => (
                  <article
                    key={`${entry.email || entry.username || "user"}-${index}`}
                    className="dashboard-list-item dashboard-case-item"
                  >
                    <div>
                      <strong>{entry.displayName || entry.username || "Unnamed user"}</strong>
                      <p>@{entry.username || "member"}</p>
                      <p>{entry.email || "No email"}</p>
                      <p>
                        Role: {(entry.role || "user").toUpperCase()}
                        {entry.role === "admin" && ` • ${normalizeAdminTier(entry)}`}
                      </p>
                    </div>
                    <div className="dashboard-item-actions">
                      <select
                        value={entry.role || "user"}
                        onChange={(event) => changeUserRole(entry, event.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="lawyer">Lawyer</option>
                        <option value="admin">Admin</option>
                      </select>
                      {entry.role === "admin" && (
                        <select
                          value={normalizeAdminTier(entry)}
                          onChange={(event) => updateAdminTier(entry, event.target.value)}
                        >
                          {ADMIN_TIER_OPTIONS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => deleteUser(entry)}
                      >
                        Delete User
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "lawyers" && (
            <section className="dashboard-panel">
              <h3>Manage Lawyer Entries</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Search by lawyer name, field, city, email"
                  value={lawyerSearch}
                  onChange={(event) => setLawyerSearch(event.target.value)}
                />
              </div>
              <div className="dashboard-list">
                {visibleLawyers.map((entry, index) => (
                  <article
                    key={`${entry.id || entry.email || entry.phone || "lawyer"}-${index}`}
                    className="dashboard-list-item dashboard-case-item"
                  >
                    <div>
                      <strong>{entry.name || "Advocate"}</strong>
                      <p>
                        {entry.field || "General"} •{" "}
                        {entry.city || entry.district || "City not set"}
                      </p>
                      <p>{entry.email || "No email"}</p>
                      <p>
                        Verification: {entry.docsVerified ? "Verified" : "Pending"}
                      </p>
                    </div>
                    <div className="dashboard-inline-actions">
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => toggleLawyerVerification(entry)}
                      >
                        {entry.docsVerified ? "Mark Pending" : "Verify"}
                      </button>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => deleteLawyer(entry)}
                      >
                        Delete Entry
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "risk" && (
            <section className="dashboard-panel">
              <h3>User Risk Flags</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Search risk profiles"
                  value={riskSearch}
                  onChange={(event) => setRiskSearch(event.target.value)}
                />
              </div>
              <div className="dashboard-list">
                {visibleRiskProfiles.map((profile) => (
                  <article key={profile.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{profile.displayName}</strong>
                      <p>{profile.email || profile.userIdentifier}</p>
                      <p>
                        Score: {profile.riskScore} • Level: {profile.riskLevel}
                      </p>
                      <p>
                        Failed Logins: {profile.failedLogins} • Spam Reports: {profile.spamReports}
                      </p>
                      <p>
                        Profile Edits: {profile.profileEdits} • High Severity Tickets:{" "}
                        {profile.openHighSeverityTickets}
                      </p>
                    </div>
                    <div className="dashboard-inline-actions">
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => recordRiskEvent(profile.userIdentifier, "failed_login")}
                      >
                        + Failed Login
                      </button>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => recordRiskEvent(profile.userIdentifier, "spam_report")}
                      >
                        + Spam Report
                      </button>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => recordRiskEvent(profile.userIdentifier, "profile_edit")}
                      >
                        + Profile Edit
                      </button>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => resetRiskProfile(profile.userIdentifier)}
                      >
                        Reset
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "announcements" && (
            <section className="dashboard-panel">
              <h3>Broadcast Announcements</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Announcement title"
                  value={announcementDraft.title}
                  onChange={(event) =>
                    setAnnouncementDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
                <select
                  value={announcementDraft.audience}
                  onChange={(event) =>
                    setAnnouncementDraft((prev) => ({
                      ...prev,
                      audience: event.target.value,
                    }))
                  }
                >
                  {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((audience) => (
                    <option key={audience} value={audience}>
                      {audience}
                    </option>
                  ))}
                </select>
                <select
                  value={announcementDraft.severity}
                  onChange={(event) =>
                    setAnnouncementDraft((prev) => ({
                      ...prev,
                      severity: event.target.value,
                    }))
                  }
                >
                  {ANNOUNCEMENT_SEVERITY_OPTIONS.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Message"
                  value={announcementDraft.message}
                  onChange={(event) =>
                    setAnnouncementDraft((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={addAnnouncement}
                >
                  Create
                </button>
              </div>
              <div className="dashboard-list">
                {announcements.map((item) => (
                  <article key={item.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        Audience: {item.audience} • Severity: {item.severity}
                      </p>
                      <p>Status: {item.status}</p>
                      <p>{item.message}</p>
                    </div>
                    <div className="dashboard-inline-actions">
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => updateAnnouncementStatus(item.id, "Published")}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => updateAnnouncementStatus(item.id, "Archived")}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="dashboard-danger-btn"
                        onClick={() => deleteAnnouncement(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
                {announcements.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No announcements</strong>
                      <p>Create and publish announcements for users/lawyers.</p>
                    </div>
                    <span>0</span>
                  </article>
                )}
              </div>
            </section>
          )}

          {activeSection === "policies" && (
            <section className="dashboard-panel">
              <h3>Legal Policy Versioning</h3>
              <p className="dashboard-policy-note">
                Publish Terms, Privacy, and Data Retention versions with audit visibility.
              </p>
              <div className="dashboard-inline-form dashboard-policy-meta-form">
                <input
                  type="text"
                  placeholder="Version label (example: v1.1.0)"
                  value={policyDraft.versionLabel}
                  onChange={(event) =>
                    setPolicyDraft((prev) => ({ ...prev, versionLabel: event.target.value }))
                  }
                />
                <input
                  type="date"
                  value={policyDraft.effectiveFrom}
                  onChange={(event) =>
                    setPolicyDraft((prev) => ({ ...prev, effectiveFrom: event.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="Release note"
                  value={policyDraft.note}
                  onChange={(event) =>
                    setPolicyDraft((prev) => ({ ...prev, note: event.target.value }))
                  }
                />
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => void submitPolicyVersion()}
                  disabled={policyLoading}
                >
                  {policyLoading ? "Saving..." : "Publish Version"}
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => void syncPolicyManager({ resetDraft: false })}
                  disabled={policyLoading}
                >
                  Reload
                </button>
              </div>

              <div className="dashboard-policy-edit-grid">
                <label>
                  Terms of Use
                  <textarea
                    rows={8}
                    value={policyDraft.termsText}
                    onChange={(event) =>
                      setPolicyDraft((prev) => ({ ...prev, termsText: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Privacy Policy
                  <textarea
                    rows={8}
                    value={policyDraft.privacyText}
                    onChange={(event) =>
                      setPolicyDraft((prev) => ({ ...prev, privacyText: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Data Retention & Deletion
                  <textarea
                    rows={8}
                    value={policyDraft.retentionText}
                    onChange={(event) =>
                      setPolicyDraft((prev) => ({ ...prev, retentionText: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="dashboard-inline-form dashboard-policy-meta-form">
                <input
                  type="text"
                  placeholder="Activation note for rollback action"
                  value={policyActivationNote}
                  onChange={(event) => setPolicyActivationNote(event.target.value)}
                />
                <span className="dashboard-policy-current">
                  Active Version:{" "}
                  {policyVersions.find((entry) => entry.id === activePolicyVersionId)
                    ?.versionLabel || "N/A"}
                </span>
              </div>

              {policyError && <p className="dashboard-policy-error">{policyError}</p>}
              {policySuccess && <p className="dashboard-policy-success">{policySuccess}</p>}

              <div className="dashboard-list">
                {policyVersions.map((item) => (
                  <article key={item.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{item.versionLabel || item.id}</strong>
                      <p>
                        Status: {item.status} • Effective: {toDateLabel(item.effectiveFrom)}
                      </p>
                      <p>
                        By {item.createdBy || "Admin"} • Created: {toDateTimeLabel(item.createdAt)}
                      </p>
                      {item.note && <p>{item.note}</p>}
                    </div>
                    <div className="dashboard-inline-actions">
                      <span>{item.id === activePolicyVersionId ? "Active" : "Archived"}</span>
                      {item.id !== activePolicyVersionId && (
                        <button
                          type="button"
                          className="dashboard-action-btn"
                          onClick={() => void activatePolicy(item.id)}
                          disabled={policyLoading}
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {policyVersions.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No policy versions</strong>
                      <p>Publish your first production policy version.</p>
                    </div>
                    <span>0</span>
                  </article>
                )}
              </div>

              <h4 className="dashboard-policy-audit-heading">Policy Audit Trail</h4>
              <div className="dashboard-list">
                {policyAuditLogs.slice(0, 12).map((entry) => (
                  <article key={entry.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{entry.action}</strong>
                      <p>
                        {entry.actor} • {entry.target}
                      </p>
                      {entry.details && <p>{entry.details}</p>}
                    </div>
                    <span>{toDateTimeLabel(entry.at)}</span>
                  </article>
                ))}
                {policyAuditLogs.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No policy audit entries</strong>
                      <p>Publish or activate a version to create audit records.</p>
                    </div>
                    <span>0</span>
                  </article>
                )}
              </div>
            </section>
          )}

          {activeSection === "permissions" && (
            <section className="dashboard-panel">
              <h3>Role Permissions (RBAC)</h3>
              <div className="dashboard-list">
                {ADMIN_TIER_OPTIONS.map((tier) => (
                  <article key={tier} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{tier.replace(/_/g, " ")}</strong>
                      <p>
                        {ADMIN_PERMISSION_MATRIX[tier]
                          .map((item) => item.replace(/_/g, " "))
                          .join(", ")}
                      </p>
                    </div>
                    <span>
                      {adminUsers.filter((entry) => normalizeAdminTier(entry) === tier).length}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "audit" && (
            <section className="dashboard-panel">
              <h3>Audit Log</h3>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  placeholder="Search actor, action, target"
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                />
                <button
                  type="button"
                  className="dashboard-danger-btn"
                  onClick={() => {
                    if (!requirePermission("view_audit")) return;
                    setAuditLogs([]);
                    logAudit("Cleared audit log", "Audit Log", "Manual purge");
                  }}
                >
                  Clear Log
                </button>
              </div>
              <div className="dashboard-list">
                {visibleAuditLogs.map((entry) => (
                  <article key={entry.id} className="dashboard-list-item dashboard-case-item">
                    <div>
                      <strong>{entry.action}</strong>
                      <p>
                        {entry.actor} • {entry.target}
                      </p>
                      {entry.details && <p>{entry.details}</p>}
                    </div>
                    <span>{toDateTimeLabel(entry.at)}</span>
                  </article>
                ))}
                {visibleAuditLogs.length === 0 && (
                  <article className="dashboard-list-item">
                    <div>
                      <strong>No audit entries</strong>
                      <p>Actions will appear when admin changes data.</p>
                    </div>
                    <span>0</span>
                  </article>
                )}
              </div>
            </section>
          )}

          {activeSection === "analytics" && (
            <section className="dashboard-panel">
              <h3>Analytics Dashboard</h3>
              <div className="dashboard-kpi-grid">
                <article className="dashboard-kpi-card">
                  <span>Signups (7 days)</span>
                  <strong>{analytics.signupsThisWeek}</strong>
                </article>
                <article className="dashboard-kpi-card">
                  <span>Lawyer Approvals (7 days)</span>
                  <strong>{analytics.lawyerApprovalsThisWeek}</strong>
                </article>
                <article className="dashboard-kpi-card">
                  <span>Ticket Intake (7 days)</span>
                  <strong>{analytics.newTicketsThisWeek}</strong>
                </article>
                <article className="dashboard-kpi-card">
                  <span>Avg Report Resolution</span>
                  <strong>{analytics.avgReportResolutionHours.toFixed(1)}h</strong>
                </article>
              </div>
            </section>
          )}

          {activeSection === "backup" && (
            <section className="dashboard-panel">
              <h3>Export & Backup</h3>
              <div className="dashboard-inline-actions">
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={exportJsonBackup}
                >
                  Export JSON Backup
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("users")}
                >
                  Export Users CSV
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("lawyers")}
                >
                  Export Lawyers CSV
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("reports")}
                >
                  Export Reports CSV
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("tickets")}
                >
                  Export Tickets CSV
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("verification")}
                >
                  Export Verification CSV
                </button>
                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => exportCsvDataset("announcements")}
                >
                  Export Announcements CSV
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardPage({
  currentUser,
  isLoggedIn,
  onRequireLogin,
  onBackHome,
  onOpenLegalAssistant,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  if (!isLoggedIn || !currentUser) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-shell">
          <section className="dashboard-gate">
            <h2>Login Required</h2>
            <p>
              Please login first to access your dashboard. You can still use AI,
              emergency support, and lawyer browsing without login.
            </p>
            <div className="dashboard-gate-actions">
              <button onClick={onRequireLogin}>Open Login</button>
              <button type="button" className="dashboard-ghost-btn" onClick={onBackHome}>
                Continue as Guest
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const role = currentUser.role || "user";

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        {role === "admin" && (
          <AdminDashboard
            currentUser={currentUser}
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        )}
        {role === "lawyer" && (
          <LawyerDashboard
            currentUser={currentUser}
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        )}
        {role !== "admin" && role !== "lawyer" && (
          <UserDashboard
            currentUser={currentUser}
            onOpenLegalAssistant={onOpenLegalAssistant}
            onOpenLawyerHub={onOpenLawyerHub}
            onOpenCommunityHub={onOpenCommunityHub}
            onOpenRightsHub={onOpenRightsHub}
            onOpenEmergencySupport={onOpenEmergencySupport}
            onOpenJusticeHub={onOpenJusticeHub}
          />
        )}
      </div>
    </main>
  );
}

export default DashboardPage;
