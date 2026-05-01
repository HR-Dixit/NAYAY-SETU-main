import { useEffect, useMemo, useState } from "react";
import "./RightsHub.css";
import { searchRightsOnline } from "../../services/legalApi";
import { addNotification } from "../../utils/notifications";

const RIGHTS = [
  {
    title: "Right to Equality",
    symbol: "⚖️",
    details: "Protection against discrimination and equal treatment under law.",
    law: "Articles 14-18",
    authority: "State Human Rights Commission / High Court",
    quickStep: "Collect evidence of discrimination and file written complaint.",
  },
  {
    title: "Right to Freedom",
    symbol: "🗣️",
    details: "Speech, movement, association, and profession freedoms with legal limits.",
    law: "Article 19",
    authority: "Local Magistrate / High Court",
    quickStep: "Document unlawful restrictions and seek legal notice.",
  },
  {
    title: "Right against Exploitation",
    symbol: "🛑",
    details: "No forced labour, trafficking, or child labour in hazardous work.",
    law: "Articles 23-24",
    authority: "Police, Labour Department, Childline 1098",
    quickStep: "Report immediately and preserve workplace/witness details.",
  },
  {
    title: "Right to Constitutional Remedies",
    symbol: "🏛️",
    details: "You can approach courts if fundamental rights are violated.",
    law: "Article 32",
    authority: "Supreme Court / High Court",
    quickStep: "Prepare rights-violation timeline and supporting documents.",
  },
  {
    title: "Consumer Rights",
    symbol: "🧾",
    details: "Right to safety, information, choice, and complaint redressal.",
    law: "Consumer Protection Act",
    authority: "National Consumer Helpline / Consumer Commission",
    quickStep: "Keep bill, warranty, and complaint communication records.",
  },
  {
    title: "Women & Child Protection",
    symbol: "👩‍👧",
    details: "Helplines, protection laws, and legal aid are available for urgent support.",
    law: "DV Act / POCSO / JJ Act",
    authority: "Women Helpline 181 / Police 112 / Childline 1098",
    quickStep: "Prioritize safety, call helplines, and file complaint quickly.",
  },
  {
    title: "Right to Education",
    symbol: "📘",
    details: "Children have a right to free and compulsory elementary education.",
    law: "Article 21A / RTE Act",
    authority: "District Education Office",
    quickStep: "Submit admission/refusal records with child ID proof.",
  },
  {
    title: "Right to Information (RTI)",
    symbol: "📄",
    details: "Citizens can seek information from public authorities.",
    law: "RTI Act 2005",
    authority: "Public Information Officer",
    quickStep: "File RTI with specific questions and keep acknowledgement.",
  },
  {
    title: "Right to Privacy",
    symbol: "🔐",
    details: "Personal dignity and data privacy are constitutionally protected.",
    law: "Article 21",
    authority: "Cyber Cell / Court",
    quickStep: "Capture misuse proof and report platform/cyber authority.",
  },
  {
    title: "Labour & Wage Rights",
    symbol: "👷",
    details: "Workers are entitled to fair wages, safe conditions, and due process.",
    law: "Labour Codes / Minimum Wages",
    authority: "Labour Commissioner Office",
    quickStep: "Store attendance, payment slips, and contract details.",
  },
  {
    title: "Senior Citizen Rights",
    symbol: "🧓",
    details: "Senior citizens can seek maintenance and protection from neglect.",
    law: "MWPSC Act 2007",
    authority: "Maintenance Tribunal / Police",
    quickStep: "File complaint with identity, relation proof, and neglect details.",
  },
  {
    title: "SC/ST Protection Rights",
    symbol: "🛡️",
    details: "Special legal protections exist against caste-based atrocities.",
    law: "SC/ST Atrocities Act",
    authority: "Police / Special Court",
    quickStep: "Ensure FIR sections are recorded correctly and seek protection.",
  },
];

const VIOLATION_RESPONSE = [
  "1️⃣ Ensure immediate safety and call emergency helplines if needed.",
  "2️⃣ Preserve proof: photos, chats, documents, bills, and witness contacts.",
  "3️⃣ File complaint in writing and collect acknowledgement/reference number.",
  "4️⃣ Escalate to higher authority if no action within reasonable time.",
];

const CURRENT_USER_KEY = "nayay-setu-current-user";
const SAVED_RIGHTS_KEY_PREFIX = "nayay-setu-saved-rights";

const getSavedRightsStorageKey = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    if (!currentUser) return "";
    const suffix = (currentUser.email || currentUser.username || "").toLowerCase();
    return suffix ? `${SAVED_RIGHTS_KEY_PREFIX}:${suffix}` : "";
  } catch {
    return "";
  }
};

const makeRightSelectionKey = (item, source = "local") => {
  if (source === "online") {
    return `online:${item.id || item.sourceUrl || item.title || "resource"}`;
  }
  return `local:${item.title}`;
};

function RightsHub({ isLoggedIn, onRequireLogin, onBackHome }) {
  const [query, setQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("All Rights");
  const [onlineRights, setOnlineRights] = useState([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [memberNotice, setMemberNotice] = useState("");
  const [savedRightKeys, setSavedRightKeys] = useState([]);
  const topicSections = RIGHTS.map((item) => item.title);

  const filteredLocalRights = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RIGHTS;
    return RIGHTS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.law.toLowerCase().includes(q) ||
        item.authority.toLowerCase().includes(q) ||
        item.quickStep.toLowerCase().includes(q)
    );
  }, [query]);

  const sectionCounts = useMemo(() => {
    const counts = { "All Rights": filteredLocalRights.length, "Online Resources": onlineRights.length };
    topicSections.forEach((topic) => {
      counts[topic] = filteredLocalRights.filter((item) => item.title === topic).length;
    });
    return counts;
  }, [filteredLocalRights, onlineRights, topicSections]);

  const visibleLocalRights = useMemo(() => {
    if (selectedSection === "All Rights") return filteredLocalRights;
    if (selectedSection === "Online Resources") return [];
    return filteredLocalRights.filter((item) => item.title === selectedSection);
  }, [filteredLocalRights, selectedSection]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setOnlineRights([]);
      setOnlineError("");
      setIsSearchingOnline(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      setOnlineError("");
      try {
        const response = await searchRightsOnline(normalizedQuery);
        if (cancelled) return;
        setOnlineRights(Array.isArray(response?.rights) ? response.rights : []);
      } catch {
        if (cancelled) return;
        setOnlineRights([]);
        setOnlineError("Could not fetch online legal rights resources right now.");
      } finally {
        if (!cancelled) setIsSearchingOnline(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!isLoggedIn) {
      setSavedRightKeys([]);
      return;
    }

    const storageKey = getSavedRightsStorageKey();
    if (!storageKey) {
      setSavedRightKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSavedRightKeys(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedRightKeys([]);
    }
  }, [isLoggedIn]);

  const handleAdvancedAction = (actionLabel) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    setMemberNotice(`${actionLabel} will be available in your member dashboard.`);
    addNotification(`${actionLabel} requested from Rights Hub.`);
  };

  const toggleSaveRight = (item, source = "local") => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    const storageKey = getSavedRightsStorageKey();
    if (!storageKey) return;

    const targetKey = makeRightSelectionKey(item, source);
    const isSaved = savedRightKeys.includes(targetKey);
    const nextSaved = isSaved
      ? savedRightKeys.filter((key) => key !== targetKey)
      : [targetKey, ...savedRightKeys];

    setSavedRightKeys(nextSaved);
    localStorage.setItem(storageKey, JSON.stringify(nextSaved));
    setMemberNotice(
      isSaved
        ? `${item.title || "Right"} removed from My Rights.`
        : `${item.title || "Right"} saved to My Rights.`
    );
    addNotification(
      isSaved
        ? `${item.title || "Right"} removed from saved rights.`
        : `${item.title || "Right"} saved to your rights list.`,
      { type: isSaved ? "info" : "success" }
    );
  };

  return (
    <section className="rights-page">
      <div className="rights-shell">
        <div className="rights-header">
          <h3>Know Your Rights</h3>
          <button
            type="button"
            className="rights-close"
            aria-label="Close rights"
            onClick={onBackHome}
          >
            X
          </button>
        </div>

        <div className="rights-search-row">
          <input
            className="rights-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rights..."
          />
          <div className="rights-actions rights-actions-top">
            <button
              type="button"
              onClick={() => handleAdvancedAction("Download Rights Guide")}
            >
              Download Rights Guide
            </button>
          </div>
        </div>
        {!isLoggedIn && (
          <p className="rights-preview-note">
            Preview mode is active. Login to save rights, download detailed
            resources, and track legal topics.
          </p>
        )}
        {memberNotice && <p className="rights-member-note">{memberNotice}</p>}

        <div className="rights-layout">
          <aside className="rights-left-rail">
            <h4>Rights Menu</h4>
            <div className="rights-menu">
              <button
                type="button"
                className={selectedSection === "All Rights" ? "is-active" : ""}
                onClick={() => setSelectedSection("All Rights")}
              >
                <span>All Rights</span>
                <strong>{sectionCounts["All Rights"] || 0}</strong>
              </button>
              {topicSections.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={selectedSection === topic ? "is-active" : ""}
                  onClick={() => setSelectedSection(topic)}
                >
                  <span>{topic}</span>
                  <strong>{sectionCounts[topic] || 0}</strong>
                </button>
              ))}
              <button
                type="button"
                className={selectedSection === "Online Resources" ? "is-active" : ""}
                onClick={() => setSelectedSection("Online Resources")}
              >
                <span>Online Resources</span>
                <strong>{sectionCounts["Online Resources"] || 0}</strong>
              </button>
            </div>
          </aside>

          <div className="rights-main">
            {selectedSection !== "Online Resources" && (
              <>
                <h4 className="rights-section-title">{selectedSection}</h4>
                <div className="rights-list">
                  {visibleLocalRights.map((item) => {
                    const rightKey = makeRightSelectionKey(item, "local");
                    const isSaved = savedRightKeys.includes(rightKey);
                    return (
                      <article key={item.title} className="rights-item">
                        <strong>
                          {item.symbol} {item.title}
                        </strong>
                        <p>{item.details}</p>
                        <p className="rights-meta">
                          <span>Law:</span> {item.law}
                        </p>
                        <p className="rights-meta">
                          <span>Authority:</span> {item.authority}
                        </p>
                        <p className="rights-meta">
                          <span>Quick Step:</span> {item.quickStep}
                        </p>
                        {isLoggedIn && (
                          <div className="rights-card-actions">
                            <button
                              type="button"
                              className={isSaved ? "is-saved" : ""}
                              onClick={() => toggleSaveRight(item, "local")}
                            >
                              {isSaved ? "Saved Right" : "Save Right"}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
                {visibleLocalRights.length === 0 && (
                  <p className="rights-empty">No rights found for this search/filter.</p>
                )}
              </>
            )}

            {(selectedSection === "All Rights" ||
              selectedSection === "Online Resources") && (
              <>
                {isSearchingOnline && (
                  <p className="rights-online-status">
                    Searching online legal rights resources...
                  </p>
                )}
                {onlineError && <p className="rights-online-error">{onlineError}</p>}
                {selectedSection === "Online Resources" &&
                  query.trim().length < 3 && (
                    <p className="rights-online-status">
                      Type at least 3 letters in search to load online resources.
                    </p>
                  )}
                {onlineRights.length > 0 && (
                  <>
                    <h4 className="rights-online-heading">Online Resources</h4>
                    <div className="rights-list rights-list-online">
                      {onlineRights.map((item) => {
                        const rightKey = makeRightSelectionKey(item, "online");
                        const isSaved = savedRightKeys.includes(rightKey);
                        return (
                          <article key={item.id || item.sourceUrl} className="rights-item">
                            <strong>🌐 {item.title}</strong>
                            <p>{item.details}</p>
                            <a
                              className="rights-source-link"
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source: {item.source || "web"}
                            </a>
                            {isLoggedIn && (
                              <div className="rights-card-actions">
                                <button
                                  type="button"
                                  className={isSaved ? "is-saved" : ""}
                                  onClick={() => toggleSaveRight(item, "online")}
                                >
                                  {isSaved ? "Saved Right" : "Save Right"}
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            <article className="rights-response-card">
              <h4>🚨 If Any Right Is Violated</h4>
              <ul>
                {VIOLATION_RESPONSE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

          </div>
        </div>
      </div>
    </section>
  );
}

export default RightsHub;
