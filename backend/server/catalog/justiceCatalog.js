const OFFICIAL_DOMAIN_ALLOWLIST = [
  "ecourts.gov.in",
  "services.ecourts.gov.in",
  "filing.ecourts.gov.in",
  "njdg.ecourts.gov.in",
  "ecommitteesci.gov.in",
  "doj.gov.in",
  "nalsa.gov.in",
  "tele-law.in",
  "indiacode.nic.in",
];

export const JUSTICE_SERVICE_CATALOG = [
  {
    id: "ecourts_case_status",
    title: "eCourts Services - Case Status & Orders",
    category: "case_tracking",
    description:
      "Track case status, hearing dates, orders, and judgments using CNR, party name, advocate, or case details.",
    url: "https://services.ecourts.gov.in/",
    officialBody: "eCommittee, Supreme Court of India",
    tags: ["case status", "hearing", "orders", "judgment", "cnr"],
  },
  {
    id: "ecourts_efiling",
    title: "eFiling - Online Case Filing",
    category: "case_filing",
    description:
      "Submit case filing workflows online with forms, uploads, e-sign, and payment flow where available.",
    url: "https://filing.ecourts.gov.in/",
    officialBody: "eCommittee, Supreme Court of India",
    tags: ["file case", "new case", "online filing", "documents", "payment"],
  },
  {
    id: "njdg_dashboard",
    title: "NJDG - National Judicial Data Grid",
    category: "judicial_data",
    description:
      "Explore official judicial pendency and disposal trends by state, district, court type, and case age.",
    url: "https://njdg.ecourts.gov.in/njdg_v3/",
    officialBody: "Department of Justice / eCourts",
    tags: ["pendency", "disposed", "district wise", "state wise", "judicial data"],
  },
  {
    id: "judgment_portal",
    title: "Judgment Search Portal",
    category: "legal_research",
    description:
      "Search and read judgments for legal research and precedent awareness across linked court systems.",
    url: "https://doj.gov.in/judgment-search-portal/",
    officialBody: "Department of Justice",
    tags: ["judgment search", "case law", "legal research"],
  },
  {
    id: "virtual_courts",
    title: "Virtual Courts / Online Fine Workflows",
    category: "court_services",
    description:
      "Access virtual court workflows where available for specified categories and online compliance flows.",
    url: "https://doj.gov.in/virtual-courts/",
    officialBody: "Department of Justice",
    tags: ["virtual court", "online court", "fine payment"],
  },
  {
    id: "nstep_tracking",
    title: "NSTEP - Process Service Tracking",
    category: "court_services",
    description:
      "Track service of summons/process where applicable in digital process tracking workflows.",
    url: "https://doj.gov.in/national-service-and-tracking-of-electronic-processes-nstep/",
    officialBody: "Department of Justice",
    tags: ["summons", "process", "tracking"],
  },
  {
    id: "esewa_kendra",
    title: "eSewa Kendra Support",
    category: "citizen_support",
    description:
      "Citizen facilitation centers that help with eCourts services, forms, and process navigation.",
    url: "https://doj.gov.in/esewa-kendra/",
    officialBody: "Department of Justice",
    tags: ["help center", "service support", "citizen help"],
  },
  {
    id: "nalsa_legal_aid",
    title: "NALSA - Legal Aid Services",
    category: "legal_aid",
    description:
      "Access legal aid pathways and guidance for eligible citizens under legal services authorities.",
    url: "https://nalsa.gov.in/legal-aid/",
    officialBody: "National Legal Services Authority",
    tags: ["legal aid", "free lawyer", "dlsa", "nalsa"],
  },
];

export const NJDG_INSIGHT_FACETS = [
  "Pendency vs Disposal trend",
  "State and district distribution",
  "Case age buckets",
  "Gender-linked filing views where available",
  "Court establishment-level drill-down",
];

export const LEGAL_AID_CHANNELS = [
  {
    id: "nalsa",
    title: "NALSA Legal Aid",
    description: "Primary legal aid authority guidance and eligibility pathways.",
    url: "https://nalsa.gov.in/legal-aid/",
  },
  {
    id: "tele_law",
    title: "Tele-Law Programme",
    description: "Remote legal advice access through official Tele-Law channels.",
    url: "https://www.tele-law.in/",
  },
  {
    id: "esewa",
    title: "eSewa Kendra",
    description: "On-ground citizen support for judiciary digital services.",
    url: "https://doj.gov.in/esewa-kendra/",
  },
];

export const COMPLIANCE_POLICY = {
  lastUpdated: "2026-02-16",
  positioning:
    "NAYAY-SETU is an independent legal-tech facilitation platform and not an official court portal.",
  legalNotice:
    "Guidance on this platform is general information and workflow assistance. It is not a substitute for legal advice from a qualified advocate.",
  dataHandling:
    "User-provided data must be processed with consent, minimum retention, secure storage, and deletion controls.",
  sourceRule:
    "Official judiciary links should be attributed and opened on original domains. Avoid misleading branding or imitation.",
  antiScrapeRule:
    "Prefer official API or permitted access mechanisms. Avoid unauthorized scraping or policy-violating data extraction.",
};

function normalizedHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

export function isOfficialServiceUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    const host = normalizedHost(parsed.hostname);
    return OFFICIAL_DOMAIN_ALLOWLIST.some((allowed) => {
      const cleanAllowed = normalizedHost(allowed);
      return host === cleanAllowed || host.endsWith(`.${cleanAllowed}`);
    });
  } catch {
    return false;
  }
}

function rankServiceMatch(service, terms) {
  if (!terms.length) return 0;
  const haystack = `${service.title} ${service.description} ${service.tags.join(" ")}`
    .toLowerCase();
  return terms.reduce((score, term) => {
    if (!term) return score;
    return haystack.includes(term) ? score + 1 : score;
  }, 0);
}

function inferProblemType({ problemType, query }) {
  const explicit = String(problemType || "").trim().toLowerCase();
  if (explicit) return explicit;
  const q = String(query || "").toLowerCase();
  if (/cnr|status|hearing|order|judgment/.test(q)) return "case_status";
  if (/file|filing|new case|petition/.test(q)) return "case_filing";
  if (/aid|free lawyer|nalsa|dlsa/.test(q)) return "legal_aid";
  if (/virtual|online court|fine/.test(q)) return "court_services";
  if (/pending|pendency|disposal|district data|state data|njdg/.test(q)) return "judicial_data";
  if (/women|domestic|child|violence|safety/.test(q)) return "women_child_safety";
  if (/cyber|fraud|upi|scam/.test(q)) return "cyber_fraud";
  return "general_guidance";
}

function recommendedServiceIds(problemType) {
  if (problemType === "case_status") {
    return ["ecourts_case_status", "esewa_kendra", "judgment_portal"];
  }
  if (problemType === "case_filing") {
    return ["ecourts_efiling", "esewa_kendra", "ecourts_case_status"];
  }
  if (problemType === "legal_aid") {
    return ["nalsa_legal_aid", "esewa_kendra", "ecourts_case_status"];
  }
  if (problemType === "court_services") {
    return ["virtual_courts", "nstep_tracking", "ecourts_case_status"];
  }
  if (problemType === "judicial_data") {
    return ["njdg_dashboard", "ecourts_case_status", "judgment_portal"];
  }
  if (problemType === "women_child_safety") {
    return ["nalsa_legal_aid", "ecourts_case_status", "esewa_kendra"];
  }
  if (problemType === "cyber_fraud") {
    return ["ecourts_case_status", "nalsa_legal_aid", "esewa_kendra"];
  }
  return ["ecourts_case_status", "ecourts_efiling", "nalsa_legal_aid"];
}

function buildChecklist(problemType, urgency) {
  const urgent = String(urgency || "").toLowerCase() === "high";
  const common = [
    "Use only official domains shown below.",
    "Keep identity proof and core case documents ready.",
    "Record every complaint number, filing reference, or acknowledgment.",
  ];

  if (problemType === "case_status") {
    return [
      "Collect CNR number or case number details.",
      "Check current stage, next date, and latest order.",
      "Set reminder 48 hours before next hearing.",
      ...common,
    ];
  }
  if (problemType === "case_filing") {
    return [
      "Confirm jurisdiction and filing court before submission.",
      "Prepare complaint/petition draft plus supporting documents.",
      "Use eFiling for upload, verification, and fee steps where available.",
      ...common,
    ];
  }
  if (problemType === "legal_aid") {
    return [
      "Check legal aid eligibility and nearest authority pathway.",
      "Prepare brief facts + income/supporting documents.",
      "Request assignment timeline and follow-up channel.",
      ...common,
    ];
  }
  if (problemType === "judicial_data") {
    return [
      "Use NJDG for aggregate trend analysis only.",
      "Avoid interpreting aggregate data as case-specific legal outcome.",
      "Cross-check with court records for any live matter.",
      ...common,
    ];
  }
  if (problemType === "women_child_safety") {
    return [
      urgent
        ? "If immediate danger exists, call emergency response first."
        : "Document threats/incidents with timestamped evidence.",
      "Start with legal aid or police complaint route as applicable.",
      "Preserve digital messages, call logs, and witness details.",
      ...common,
    ];
  }
  if (problemType === "cyber_fraud") {
    return [
      urgent
        ? "Report quickly through emergency fraud channels and your bank."
        : "Document transaction IDs, account details, and communication records.",
      "Preserve evidence before device reset or app uninstall.",
      "Use official complaint workflow and track FIR/acknowledgment.",
      ...common,
    ];
  }

  return [
    "Start with case status or legal aid path based on your issue.",
    "Use guided flow to avoid missing filing or evidence steps.",
    ...common,
  ];
}

export function buildJusticeRoute({
  query = "",
  problemType = "",
  urgency = "medium",
} = {}) {
  const normalizedType = inferProblemType({ problemType, query });
  const terms = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 12);

  const pinnedIds = recommendedServiceIds(normalizedType);
  const pinned = pinnedIds
    .map((id) => JUSTICE_SERVICE_CATALOG.find((item) => item.id === id))
    .filter(Boolean);

  const extraMatches = JUSTICE_SERVICE_CATALOG.filter(
    (service) => !pinnedIds.includes(service.id)
  )
    .map((service) => ({
      service,
      score: rankServiceMatch(service, terms),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((entry) => entry.service);

  const recommended = [...pinned, ...extraMatches].map((service) => ({
    ...service,
    isOfficialDomain: isOfficialServiceUrl(service.url),
  }));

  return {
    problemType: normalizedType,
    urgency: String(urgency || "medium").toLowerCase(),
    checklist: buildChecklist(normalizedType, urgency),
    services: recommended,
    legalNotice: COMPLIANCE_POLICY.legalNotice,
    sourceAttribution:
      "Service routes are mapped to official judiciary/legal-aid portals. Always verify final actions on official domain pages.",
  };
}

export function getOfficialDomainAllowlist() {
  return [...OFFICIAL_DOMAIN_ALLOWLIST];
}
