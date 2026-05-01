const RESPONSE_KEYS = [
  "immediate_advice",
  "next_steps",
  "documents_required",
  "relevant_authorities",
  "legal_information",
];

const ISSUE_PROFILES = [
  {
    matches: ["scam", "fraud", "upi", "online transaction", "cyber", "phishing"],
    response: {
      immediate_advice:
        "Stop any further payment immediately, keep screenshots of the transaction, and contact your bank or payment app without delay.",
      next_steps: [
        "Call the national cyber crime helpline 1930 as quickly as possible.",
        "Report the incident on the National Cyber Crime Reporting Portal.",
        "Inform your bank or wallet provider and ask them to freeze or review the transaction.",
        "If money loss is serious or the scammer is threatening you, file a complaint at the nearest police station.",
      ],
      documents_required: [
        "Transaction ID or UTR number",
        "Bank statement or payment screenshot",
        "Chat messages, call logs, or scam profile details",
        "Identity proof",
      ],
      relevant_authorities: [
        "National Cyber Crime Helpline - 1930",
        "National Cyber Crime Reporting Portal",
        "Your bank or payment service provider",
        "Local police station or cyber crime cell",
      ],
      legal_information:
        "Online payment scams in India can involve cheating, impersonation, and cyber crime offences. Fast reporting helps banks and authorities act before the money trail becomes harder to trace. For case-specific recovery or criminal strategy, consult a lawyer.",
    },
  },
  {
    matches: ["domestic violence", "abuse", "harassment", "husband", "wife", "dowry"],
    response: {
      immediate_advice:
        "If there is immediate danger, move to a safe place and call emergency help right away.",
      next_steps: [
        "Call 112 or the women helpline if the situation is unsafe.",
        "Keep photos, messages, medical records, and details of witnesses if available.",
        "Make a written complaint to the police or protection officer.",
        "Speak to a lawyer or legal aid service for protection, residence, maintenance, or other relief.",
      ],
      documents_required: [
        "Identity proof",
        "Medical records if injuries are involved",
        "Threatening messages, audio, photos, or videos",
        "Marriage-related documents if relevant",
      ],
      relevant_authorities: [
        "Emergency Response Support System - 112",
        "Women Helpline - 1091",
        "Nearest police station",
        "Protection Officer or District Legal Services Authority",
      ],
      legal_information:
        "Domestic violence complaints in India may involve protection under the Protection of Women from Domestic Violence Act and other criminal laws, depending on the facts. A lawyer can help you understand the safest legal option for your situation.",
    },
  },
  {
    matches: ["consumer", "refund", "seller", "product", "delivery", "defective"],
    response: {
      immediate_advice:
        "Keep the bill, payment proof, and all messages with the seller so the issue is properly documented.",
      next_steps: [
        "Send a clear written complaint to the seller or service provider.",
        "Keep screenshots of product details, promises, delivery date, and refusal to help.",
        "Use the consumer grievance process if the seller does not respond properly.",
        "Consult a lawyer if the value is high or the dispute becomes serious.",
      ],
      documents_required: [
        "Invoice or receipt",
        "Payment proof",
        "Order details or warranty terms",
        "Emails, chats, or complaint records",
      ],
      relevant_authorities: [
        "National Consumer Helpline",
        "Consumer Commission",
        "E-Daakhil platform where applicable",
      ],
      legal_information:
        "Consumer disputes in India are generally handled under consumer protection law. Written proof of payment, product condition, and complaint history is usually important if the matter goes to formal complaint or court.",
    },
  },
];

function cleanText(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}

function cleanList(value, fallback = []) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item, 300))
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|,|;|•|-/)
      .map((item) => cleanText(item, 300))
      .filter(Boolean)
      .slice(0, 8);
  }

  return fallback;
}

function ensureConsultLawyerNotice(text) {
  const content = cleanText(text, 1200);
  if (!content) {
    return "This is general legal information, not a final legal opinion. Consult a lawyer for advice specific to your case.";
  }
  if (/consult a lawyer|legal advice|general legal information/i.test(content)) {
    return content;
  }
  return `${content} This is general legal information. Consult a lawyer for advice specific to your case.`;
}

function pickIssueProfile(query) {
  const normalized = cleanText(query, 1200).toLowerCase();
  return (
    ISSUE_PROFILES.find((profile) =>
      profile.matches.some((term) => normalized.includes(term))
    ) || null
  );
}

export function buildLegalAssistantPrompt(query) {
  const systemPrompt = [
    "You are Nayay Setu's AI Legal Assistant for India.",
    "You help ordinary people understand legal situations in simple language.",
    "Do not use complex legal jargon unless absolutely necessary.",
    "Do not pretend to be a lawyer and do not promise outcomes.",
    "Always give India-specific guidance and mention official authorities or helplines where relevant.",
    "Always encourage consulting a lawyer when the issue is serious, urgent, criminal, or fact-specific.",
    "Return valid JSON only.",
    `Use exactly these keys: ${RESPONSE_KEYS.join(", ")}.`,
    "immediate_advice must be a short paragraph string.",
    "next_steps must be an array of short step-by-step strings.",
    "documents_required must be an array of likely documents.",
    "relevant_authorities must be an array of India-specific authorities, offices, portals, or helplines.",
    "legal_information must be a short and careful explanation of the law in simple language.",
  ].join(" ");

  const userPrompt = [
    `Citizen query: ${cleanText(query, 1200)}`,
    "Respond carefully for an Indian legal-tech platform.",
    "If facts are missing, give provisional guidance and say what details matter.",
    "If it is an emergency or safety issue, say to contact emergency help immediately.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function normalizeStructuredResponse(raw) {
  const immediateAdvice = cleanText(raw?.immediate_advice, 1500);
  const nextSteps = cleanList(raw?.next_steps);
  const documentsRequired = cleanList(raw?.documents_required);
  const relevantAuthorities = cleanList(raw?.relevant_authorities);
  const legalInformation = ensureConsultLawyerNotice(raw?.legal_information);

  return {
    immediate_advice:
      immediateAdvice ||
      "Based on the information shared, act quickly, preserve all proof, and avoid deleting messages or documents.",
    next_steps:
      nextSteps.length > 0
        ? nextSteps
        : [
            "Write down what happened in time order.",
            "Preserve messages, receipts, screenshots, and IDs related to the issue.",
            "Approach the correct authority or legal support channel as early as possible.",
          ],
    documents_required:
      documentsRequired.length > 0
        ? documentsRequired
        : ["Identity proof", "Messages or notices", "Timeline of events", "Payment or case-related records"],
    relevant_authorities:
      relevantAuthorities.length > 0
        ? relevantAuthorities
        : ["Nearest police station", "Relevant district authority", "District Legal Services Authority"],
    legal_information: legalInformation,
  };
}

export function buildFallbackLegalAssistantResponse(query) {
  const profile = pickIssueProfile(query);
  if (profile) {
    return normalizeStructuredResponse(profile.response);
  }

  return normalizeStructuredResponse({
    immediate_advice:
      "Do not ignore the issue. Write down what happened, preserve proof, and avoid signing or agreeing to anything you do not understand.",
    next_steps: [
      "Prepare a short timeline of the problem in simple language.",
      "Collect messages, notices, photos, payment records, or identity papers linked to the issue.",
      "Approach the authority connected to the issue, such as police, consumer forum, labour office, or local court support services.",
      "Consult a lawyer if the matter is urgent, criminal, or involves major money, safety, or family conflict.",
    ],
    documents_required: [
      "Identity proof",
      "Written timeline of events",
      "Any notices, messages, screenshots, or emails",
      "Receipts, payment proof, or supporting records",
    ],
    relevant_authorities: [
      "Nearest police station if there is a crime or threat",
      "District Legal Services Authority for legal aid",
      "Relevant department or forum connected to the issue",
    ],
    legal_information:
      "The exact law depends on the facts, documents, and location. The safest first step is to preserve evidence and get help from the correct authority or a qualified lawyer.",
  });
}

async function callOpenAI({ apiKey, model, query }) {
  const { systemPrompt, userPrompt } = buildLegalAssistantPrompt(query);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
    throw new Error("OpenAI returned empty content.");
  }

  return normalizeStructuredResponse(JSON.parse(content));
}

export async function createLegalAssistantResponse({ query, apiKey, model }) {
  const safeQuery = cleanText(query, 1200);
  if (!safeQuery) {
    throw new Error("Query is required.");
  }

  if (!apiKey) {
    return {
      mode: "fallback-no-openai-key",
      data: buildFallbackLegalAssistantResponse(safeQuery),
    };
  }

  try {
    const data = await callOpenAI({
      apiKey,
      model: model || "gpt-4o-mini",
      query: safeQuery,
    });
    return {
      mode: "openai",
      data,
    };
  } catch (error) {
    return {
      mode: "fallback-openai-error",
      error: String(error?.message || "Could not generate legal assistant response."),
      data: buildFallbackLegalAssistantResponse(safeQuery),
    };
  }
}
