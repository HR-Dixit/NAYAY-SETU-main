import { useMemo, useState } from "react";
import "./EmergencyHub.css";
import {
  EMERGENCY_CONTACTS_INDIA,
  QUICK_EMERGENCY_CONTACTS,
} from "../assistant/emergencyContacts";

const MENU_SECTIONS = [
  "Police & Safety",
  "Medical",
  "Women & Child",
  "Disaster & Fire",
  "Public Services",
  "Other Support",
];

const SECTION_META = {
  "All Contacts": { symbol: "☎️", hint: "Complete helpline directory" },
  "Police & Safety": { symbol: "🛡️", hint: "Police, traffic, accident response" },
  Medical: { symbol: "🏥", hint: "Ambulance and emergency health support" },
  "Women & Child": { symbol: "👩‍👧", hint: "Protection and abuse reporting lines" },
  "Disaster & Fire": { symbol: "🔥", hint: "Fire, disaster and relief hotlines" },
  "Public Services": { symbol: "🏛️", hint: "Government civic and utility helplines" },
  "Other Support": { symbol: "🧭", hint: "Additional support numbers" },
};

const IMMEDIATE_ACTIONS = [
  "⚡ Move to a safe location first and call the nearest helpline immediately.",
  "📍 Share your exact location landmark with responders and one trusted contact.",
  "🧾 Note call reference number, time, and officer/agent details for follow-up.",
  "📸 Preserve photos, videos, chat logs, receipts, and witness contacts as evidence.",
];

const CRITICAL_DOCUMENTS = [
  "🪪 Identity proof and phone number used to report",
  "🧾 Medical slip/FIR/DD entry/case or ticket reference",
  "📱 Screenshots of threats, fraud transactions, or abusive messages",
  "📌 Incident timeline: where, when, what happened, who was present",
  "👥 Names and numbers of witnesses / nearby helpers",
];

const LEGAL_ESCALATION = [
  "1️⃣ If no response, call 112 and re-report with prior reference number.",
  "2️⃣ Escalate to district control room / superintendent office in writing.",
  "3️⃣ For rights-related urgency, ask AI Assistant for exact legal filing route.",
];

const sectionForContact = (contact) => {
  const text = String(contact.department || "").toLowerCase();

  if (
    text.includes("women") ||
    text.includes("child") ||
    text.includes("abuse")
  ) {
    return "Women & Child";
  }
  if (
    text.includes("ambulance") ||
    text.includes("health") ||
    text.includes("medical") ||
    text.includes("blood") ||
    text.includes("aids") ||
    text.includes("poison") ||
    text.includes("eye")
  ) {
    return "Medical";
  }
  if (
    text.includes("fire") ||
    text.includes("disaster") ||
    text.includes("earth-quake") ||
    text.includes("relief")
  ) {
    return "Disaster & Fire";
  }
  if (
    text.includes("police") ||
    text.includes("terror") ||
    text.includes("traffic") ||
    text.includes("accident") ||
    text.includes("railway") ||
    text.includes("highway")
  ) {
    return "Police & Safety";
  }
  if (
    text.includes("consumer") ||
    text.includes("aadhar") ||
    text.includes("election") ||
    text.includes("kisan") ||
    text.includes("directory") ||
    text.includes("telephone") ||
    text.includes("lpg")
  ) {
    return "Public Services";
  }
  return "Other Support";
};

const canDial = (value = "") => value.replace(/[^0-9]/g, "");

function EmergencyHub({
  isLoggedIn,
  onRequireLogin,
  onOpenLegalAssistant,
  onBackHome,
}) {
  const [query, setQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("All Contacts");
  const [memberNotice, setMemberNotice] = useState("");

  const queryMatchedContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return EMERGENCY_CONTACTS_INDIA;

    return EMERGENCY_CONTACTS_INDIA.filter((item) => {
      const dept = String(item.department || "").toLowerCase();
      const number = String(item.number || "").toLowerCase();
      return dept.includes(normalized) || number.includes(normalized);
    });
  }, [query]);

  const sectionCounts = useMemo(() => {
    const counts = { "All Contacts": queryMatchedContacts.length };
    MENU_SECTIONS.forEach((section) => {
      counts[section] = queryMatchedContacts.filter(
        (item) => sectionForContact(item) === section
      ).length;
    });
    return counts;
  }, [queryMatchedContacts]);

  const visibleContacts = useMemo(() => {
    if (selectedSection === "All Contacts") return queryMatchedContacts;
    return queryMatchedContacts.filter(
      (item) => sectionForContact(item) === selectedSection
    );
  }, [queryMatchedContacts, selectedSection]);

  const quickContacts = useMemo(() => {
    const dialableSet = new Set(visibleContacts.map((item) => canDial(item.number)));
    return QUICK_EMERGENCY_CONTACTS.filter((item) =>
      dialableSet.has(canDial(item.number))
    );
  }, [visibleContacts]);

  const handleMemberAction = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    setMemberNotice(
      "Emergency plan saved. You can review your pinned contacts from dashboard."
    );
  };

  return (
    <section className="emergency-page">
      <div className="emergency-shell">
        <div className="emergency-header">
          <h3>Emergency Support</h3>
          <button
            type="button"
            className="emergency-close"
            aria-label="Close emergency support"
            onClick={onBackHome}
          >
            X
          </button>
        </div>

        <input
          className="emergency-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search emergency helplines..."
        />

        {!isLoggedIn && (
          <p className="emergency-preview-note">
            Preview mode is active. Login to save emergency plans and pinned
            contacts.
          </p>
        )}

        <div className="emergency-layout">
          <aside className="emergency-left-rail">
            <h4>Emergency Menu</h4>
            <div className="emergency-menu">
              <button
                type="button"
                className={selectedSection === "All Contacts" ? "is-active" : ""}
                onClick={() => setSelectedSection("All Contacts")}
              >
                <span className="emergency-menu-label">
                  <i>{SECTION_META["All Contacts"].symbol}</i>
                  <em>All Contacts</em>
                </span>
                <strong>{sectionCounts["All Contacts"] || 0}</strong>
              </button>
              {MENU_SECTIONS.map((section) => (
                <button
                  key={section}
                  type="button"
                  className={selectedSection === section ? "is-active" : ""}
                  onClick={() => setSelectedSection(section)}
                >
                  <span className="emergency-menu-label">
                    <i>{SECTION_META[section]?.symbol || "•"}</i>
                    <em>{section}</em>
                  </span>
                  <strong>{sectionCounts[section] || 0}</strong>
                </button>
              ))}
            </div>
            <p className="emergency-menu-hint">
              {SECTION_META[selectedSection]?.hint || "Select a category to narrow contacts."}
            </p>

            <div className="emergency-rail-actions">
              <button
                type="button"
                onClick={() => onOpenLegalAssistant?.("I need urgent legal help")}
              >
                Ask AI Assistant
              </button>
              <button type="button" onClick={handleMemberAction}>
                Save Emergency Plan
              </button>
            </div>
            {memberNotice && <p className="emergency-member-note">{memberNotice}</p>}
          </aside>

          <div className="emergency-main">
            <h4 className="emergency-section-title">
              <span>{SECTION_META[selectedSection]?.symbol || "📌"}</span>
              <span>{selectedSection}</span>
            </h4>

            {quickContacts.length > 0 && (
              <div className="emergency-quick-row">
                {quickContacts.map((item) => (
                  <a
                    key={`${item.number}-${item.department}`}
                    href={`tel:${canDial(item.number)}`}
                    className="emergency-quick-card"
                  >
                    <strong>{item.number}</strong>
                    <span>{item.department}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="emergency-list">
              {visibleContacts.map((item) => (
                <article
                  key={`${item.number}-${item.department}`}
                  className="emergency-item"
                >
                  <div>
                    <strong>{item.department}</strong>
                    <p>Helpline: {item.number}</p>
                  </div>
                  <a href={`tel:${canDial(item.number)}`}>Call Now</a>
                </article>
              ))}
            </div>

            {visibleContacts.length === 0 && (
              <p className="emergency-empty">
                No emergency contact found for this search/filter.
              </p>
            )}

            <div className="emergency-guides">
              <article className="emergency-guide-card">
                <h5>🚨 First 30 Minutes</h5>
                <ul>
                  {IMMEDIATE_ACTIONS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="emergency-guide-card">
                <h5>📂 Keep These Ready</h5>
                <ul>
                  {CRITICAL_DOCUMENTS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="emergency-guide-card">
                <h5>⚖️ Escalation Path</h5>
                <ul>
                  {LEGAL_ESCALATION.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmergencyHub;
