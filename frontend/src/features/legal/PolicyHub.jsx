import { useEffect, useState } from "react";
import { fetchCompliancePolicy } from "../../services/legalApi";
import "./PolicyHub.css";

const TABS = [
  { id: "terms", label: "Terms of Use" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "retention", label: "Data Retention" },
];

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

function normalizePolicyList(value, fallback = []) {
  const list = Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  return list.length > 0 ? list : fallback;
}

function PolicyHub({ onBackHome }) {
  const [activeTab, setActiveTab] = useState("terms");
  const [policyVersion, setPolicyVersion] = useState(null);
  const [policyContent, setPolicyContent] = useState(DEFAULT_POLICY_CONTENT);

  useEffect(() => {
    let cancelled = false;
    const loadPolicy = async () => {
      try {
        const response = await fetchCompliancePolicy();
        if (cancelled) return;
        const version = response?.policyVersion || null;
        setPolicyVersion(version);
        setPolicyContent({
          terms: normalizePolicyList(version?.terms, DEFAULT_POLICY_CONTENT.terms),
          privacy: normalizePolicyList(version?.privacy, DEFAULT_POLICY_CONTENT.privacy),
          retention: normalizePolicyList(version?.retention, DEFAULT_POLICY_CONTENT.retention),
        });
      } catch {
        if (cancelled) return;
        setPolicyVersion(null);
        setPolicyContent(DEFAULT_POLICY_CONTENT);
      }
    };

    void loadPolicy();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="policy-page">
      <div className="policy-shell">
        <header className="policy-header">
          <div>
            <h3>Legal & Compliance Policies</h3>
            <p>
              NAYAY-SETU is an independent legal-tech platform and not an official
              court portal.
            </p>
            {policyVersion?.versionLabel && (
              <p>
                Active version: {policyVersion.versionLabel}
                {policyVersion.effectiveFrom
                  ? ` (effective ${policyVersion.effectiveFrom})`
                  : ""}
              </p>
            )}
          </div>
          <button type="button" onClick={() => onBackHome?.()}>
            Back
          </button>
        </header>

        <nav className="policy-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeTab === item.id ? "is-active" : ""}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeTab === "terms" && (
          <article className="policy-card">
            <h4>Terms of Use</h4>
            <ul>
              {policyContent.terms.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        )}

        {activeTab === "privacy" && (
          <article className="policy-card">
            <h4>Privacy Policy</h4>
            <ul>
              {policyContent.privacy.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        )}

        {activeTab === "retention" && (
          <article className="policy-card">
            <h4>Data Retention & Deletion</h4>
            <ul>
              {policyContent.retention.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        )}

        <p className="policy-note">
          Compliance notice: Always verify official links (`*.ecourts.gov.in`,
          `doj.gov.in`, `nalsa.gov.in`) before sharing case information.
        </p>
      </div>
    </section>
  );
}

export default PolicyHub;
