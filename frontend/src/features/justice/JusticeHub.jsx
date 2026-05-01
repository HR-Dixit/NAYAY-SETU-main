import { useCallback, useEffect, useMemo, useState } from "react";
import "./JusticeHub.css";
import {
  createJusticeCase,
  createJusticeReminder,
  fetchCompliancePolicy,
  fetchJusticeDesk,
  fetchJusticeServices,
  fetchLegalAidChannels,
  fetchNjdgInsights,
  generateJusticeCasePlan,
  patchJusticeCase,
  patchJusticeReminder,
  removeJusticeCase,
  removeJusticeReminder,
  routeJusticeQuery,
  verifyOfficialLink,
} from "../../services/legalApi";
import { addNotification } from "../../utils/notifications";

const PROBLEM_TYPE_OPTIONS = [
  { value: "", label: "Auto-detect from query" },
  { value: "case_status", label: "Case status / hearing updates" },
  { value: "case_filing", label: "Online case filing" },
  { value: "legal_aid", label: "Legal aid / free lawyer" },
  { value: "court_services", label: "Virtual court / process services" },
  { value: "judicial_data", label: "NJDG judicial trend insights" },
  { value: "women_child_safety", label: "Women or child safety legal route" },
  { value: "cyber_fraud", label: "Cyber fraud legal route" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const EMPTY_CASE_FORM = {
  title: "",
  cnrNumber: "",
  court: "",
  status: "",
  nextHearingDate: "",
  notes: "",
};

const EMPTY_REMINDER_FORM = {
  title: "",
  dueDate: "",
};

const toDeskUserId = (currentUser) =>
  String(currentUser?.email || currentUser?.username || "").trim().toLowerCase();

function JusticeHub({
  isLoggedIn,
  currentUser,
  onRequireLogin,
  onBackHome,
  onOpenLegalAssistant,
}) {
  const [activeTab, setActiveTab] = useState("router");
  const [policy, setPolicy] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [legalAidChannels, setLegalAidChannels] = useState([]);
  const [njdgInsight, setNjdgInsight] = useState(null);
  const [metaError, setMetaError] = useState("");

  const [routeQuery, setRouteQuery] = useState("");
  const [routeProblemType, setRouteProblemType] = useState("");
  const [routeUrgency, setRouteUrgency] = useState("medium");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeResult, setRouteResult] = useState(null);

  const [desk, setDesk] = useState({
    cases: [],
    reminders: [],
    storeMode: "file",
  });
  const [deskLoading, setDeskLoading] = useState(false);
  const [deskError, setDeskError] = useState("");
  const [caseForm, setCaseForm] = useState(EMPTY_CASE_FORM);
  const [reminderForm, setReminderForm] = useState(EMPTY_REMINDER_FORM);
  const [casePlanLoadingId, setCasePlanLoadingId] = useState("");
  const [checkUrl, setCheckUrl] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState("");
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);

  const deskUserId = useMemo(() => toDeskUserId(currentUser), [currentUser]);

  useEffect(() => {
    let cancelled = false;
    const loadMeta = async () => {
      setMetaError("");
      try {
        const [policyRes, servicesRes, aidRes, njdgRes] = await Promise.all([
          fetchCompliancePolicy(),
          fetchJusticeServices(),
          fetchLegalAidChannels(),
          fetchNjdgInsights(),
        ]);
        if (cancelled) return;
        setPolicy(policyRes || null);
        setServiceCatalog(Array.isArray(servicesRes?.services) ? servicesRes.services : []);
        setLegalAidChannels(Array.isArray(aidRes?.channels) ? aidRes.channels : []);
        setNjdgInsight(njdgRes || null);
      } catch {
        if (cancelled) return;
        setMetaError("Could not load compliance and service metadata right now.");
      }
    };

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadDesk = useCallback(async () => {
    if (!isLoggedIn || !deskUserId) {
      setDesk({ cases: [], reminders: [], storeMode: "file" });
      return;
    }

    setDeskLoading(true);
    setDeskError("");
    try {
      const response = await fetchJusticeDesk();
      setDesk({
        cases: Array.isArray(response?.cases) ? response.cases : [],
        reminders: Array.isArray(response?.reminders) ? response.reminders : [],
        storeMode: response?.storeMode || "file",
      });
    } catch {
      setDeskError("Could not sync your justice desk right now.");
    } finally {
      setDeskLoading(false);
    }
  }, [deskUserId, isLoggedIn]);

  useEffect(() => {
    void reloadDesk();
  }, [reloadDesk]);

  const handleRouteSubmit = async (event) => {
    event.preventDefault();
    if (!routeQuery.trim() && !routeProblemType) {
      setRouteError("Enter your issue or select a problem type.");
      return;
    }
    setRouteLoading(true);
    setRouteError("");
    try {
      const response = await routeJusticeQuery({
        query: routeQuery.trim(),
        problemType: routeProblemType,
        urgency: routeUrgency,
      });
      setRouteResult(response?.route || null);
      addNotification("Official links route generated from verified service catalog.", {
        user: currentUser,
        type: "success",
      });
    } catch {
      setRouteError("Could not generate a route right now.");
    } finally {
      setRouteLoading(false);
    }
  };

  const handleCaseSubmit = async (event) => {
    event.preventDefault();
    if (!isLoggedIn || !deskUserId) {
      onRequireLogin?.();
      return;
    }
    if (!caseForm.title.trim()) return;
    try {
      await createJusticeCase("", caseForm);
      setCaseForm(EMPTY_CASE_FORM);
      await reloadDesk();
      addNotification("Case tracker item added to Justice Desk.", {
        user: currentUser,
        type: "success",
      });
    } catch {
      setDeskError("Could not add case right now.");
    }
  };

  const handleRemoveCase = async (caseId) => {
    if (!isLoggedIn || !deskUserId) return;
    try {
      await removeJusticeCase("", caseId);
      await reloadDesk();
    } catch {
      setDeskError("Could not remove case right now.");
    }
  };

  const handleGenerateCasePlan = async (caseItem) => {
    if (!isLoggedIn || !deskUserId) return;
    setCasePlanLoadingId(caseItem.id);
    setDeskError("");
    try {
      const response = await generateJusticeCasePlan({
        caseTitle: caseItem.title,
        caseStatus: caseItem.status,
        nextHearingDate: caseItem.nextHearingDate,
        notes: caseItem.notes,
      });
      const plan = response?.plan || {};
      const planText = [
        plan.summary ? `Summary: ${plan.summary}` : "",
        Array.isArray(plan.actions) && plan.actions.length > 0
          ? `Actions:\n${plan.actions.map((item) => `- ${item}`).join("\n")}`
          : "",
        Array.isArray(plan.risks) && plan.risks.length > 0
          ? `Risks:\n${plan.risks.map((item) => `- ${item}`).join("\n")}`
          : "",
        plan.preparation ? `Preparation: ${plan.preparation}` : "",
        plan.disclaimer ? `Disclaimer: ${plan.disclaimer}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await patchJusticeCase("", caseItem.id, {
        aiPlan: planText,
      });
      await reloadDesk();
      addNotification("AI next-step plan generated for your case.", {
        user: currentUser,
        type: "success",
      });
    } catch {
      setDeskError("Could not generate case plan right now.");
    } finally {
      setCasePlanLoadingId("");
    }
  };

  const handleReminderSubmit = async (event) => {
    event.preventDefault();
    if (!isLoggedIn || !deskUserId) {
      onRequireLogin?.();
      return;
    }
    if (!reminderForm.title.trim()) return;
    try {
      await createJusticeReminder("", reminderForm);
      setReminderForm(EMPTY_REMINDER_FORM);
      await reloadDesk();
      addNotification("Reminder added to Justice Desk.", {
        user: currentUser,
        type: "success",
      });
    } catch {
      setDeskError("Could not add reminder right now.");
    }
  };

  const handleReminderToggle = async (item) => {
    if (!isLoggedIn || !deskUserId) return;
    try {
      await patchJusticeReminder("", item.id, {
        done: !item.done,
      });
      await reloadDesk();
    } catch {
      setDeskError("Could not update reminder.");
    }
  };

  const handleReminderDelete = async (item) => {
    if (!isLoggedIn || !deskUserId) return;
    try {
      await removeJusticeReminder("", item.id);
      await reloadDesk();
    } catch {
      setDeskError("Could not delete reminder.");
    }
  };

  const handleVerifyLink = async (event) => {
    event.preventDefault();
    if (!checkUrl.trim()) {
      setCheckError("Enter a URL to verify.");
      return;
    }
    setIsCheckingUrl(true);
    setCheckError("");
    try {
      const response = await verifyOfficialLink(checkUrl.trim());
      setCheckResult(response || null);
    } catch {
      setCheckError("Could not verify this URL right now.");
      setCheckResult(null);
    } finally {
      setIsCheckingUrl(false);
    }
  };

  return (
    <section className="justice-page">
      <div className="justice-shell">
        <div className="justice-header">
          <div>
            <h3>Official Links & Desk</h3>
            <p>
              Official service links, case workflow planning, and compliance-first legal-tech
              operations.
            </p>
          </div>
          <button type="button" className="justice-close" onClick={() => onBackHome?.()}>
            Back
          </button>
        </div>

        {policy?.legalNotice && <p className="justice-policy-banner">{policy.legalNotice}</p>}
        {metaError && <p className="justice-error">{metaError}</p>}

        <div className="justice-tabs">
          <button
            type="button"
            className={activeTab === "router" ? "is-active" : ""}
            onClick={() => setActiveTab("router")}
          >
            Official Links
          </button>
          <button
            type="button"
            className={activeTab === "desk" ? "is-active" : ""}
            onClick={() => setActiveTab("desk")}
          >
            My Desk
          </button>
          <button
            type="button"
            className={activeTab === "aid" ? "is-active" : ""}
            onClick={() => setActiveTab("aid")}
          >
            Legal Aid
          </button>
          <button
            type="button"
            className={activeTab === "njdg" ? "is-active" : ""}
            onClick={() => setActiveTab("njdg")}
          >
            NJDG Guide
          </button>
          <button
            type="button"
            className={activeTab === "policy" ? "is-active" : ""}
            onClick={() => setActiveTab("policy")}
          >
            Compliance
          </button>
        </div>

        {activeTab === "router" && (
          <div className="justice-panel">
            <form className="justice-form-grid" onSubmit={handleRouteSubmit}>
              <textarea
                value={routeQuery}
                onChange={(event) => setRouteQuery(event.target.value)}
                placeholder="Describe your issue in one line. Example: Need case status by CNR and next hearing."
                rows={3}
              />
              <select
                value={routeProblemType}
                onChange={(event) => setRouteProblemType(event.target.value)}
              >
                {PROBLEM_TYPE_OPTIONS.map((item) => (
                  <option key={item.value || "auto"} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <select
                value={routeUrgency}
                onChange={(event) => setRouteUrgency(event.target.value)}
              >
                {URGENCY_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    Urgency: {item.label}
                  </option>
                ))}
              </select>
              <div className="justice-inline-actions">
                <button type="submit" disabled={routeLoading}>
                  {routeLoading ? "Loading Links..." : "Generate Official Links"}
                </button>
                <button type="button" onClick={() => onOpenLegalAssistant?.(routeQuery)}>
                  Ask AI Assistant
                </button>
              </div>
              {routeError && <p className="justice-error">{routeError}</p>}
            </form>

            {routeResult && (
              <div className="justice-route-output">
                <p>
                  <strong>Detected type:</strong> {routeResult.problemType}
                </p>
                <div>
                  <strong>Checklist:</strong>
                  <ul>
                    {Array.isArray(routeResult.checklist) &&
                      routeResult.checklist.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="justice-service-grid">
                  {Array.isArray(routeResult.services) &&
                    routeResult.services.map((item) => (
                      <article key={item.id} className="justice-service-card">
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                        <p className="justice-service-meta">{item.officialBody}</p>
                        <span className={item.isOfficialDomain ? "ok" : "warn"}>
                          {item.isOfficialDomain ? "Official domain" : "Unverified domain"}
                        </span>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          Open Service
                        </a>
                      </article>
                    ))}
                </div>
              </div>
            )}

            {routeResult == null && (
              <div className="justice-service-grid">
                {serviceCatalog.slice(0, 6).map((item) => (
                  <article key={item.id} className="justice-service-card">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <span className={item.isOfficialDomain ? "ok" : "warn"}>
                      {item.isOfficialDomain ? "Official domain" : "Check domain"}
                    </span>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      Open Service
                    </a>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "desk" && (
          <div className="justice-panel">
            {!isLoggedIn && (
              <div className="justice-login-box">
                <p>Login is required to save case tracker and reminder data.</p>
                <button type="button" onClick={() => onRequireLogin?.()}>
                  Login to Continue
                </button>
              </div>
            )}

            {isLoggedIn && (
              <>
                <p className="justice-meta-line">
                  Desk storage mode: <strong>{desk.storeMode}</strong>
                </p>
                {deskLoading && <p className="justice-meta-line">Syncing your desk...</p>}
                {deskError && <p className="justice-error">{deskError}</p>}

                <div className="justice-form-layout">
                  <form onSubmit={handleCaseSubmit} className="justice-form-grid">
                    <h4>Add Case</h4>
                    <input
                      value={caseForm.title}
                      onChange={(event) =>
                        setCaseForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Case title"
                      required
                    />
                    <input
                      value={caseForm.cnrNumber}
                      onChange={(event) =>
                        setCaseForm((prev) => ({ ...prev, cnrNumber: event.target.value }))
                      }
                      placeholder="CNR number (optional)"
                    />
                    <input
                      value={caseForm.court}
                      onChange={(event) =>
                        setCaseForm((prev) => ({ ...prev, court: event.target.value }))
                      }
                      placeholder="Court"
                    />
                    <input
                      value={caseForm.status}
                      onChange={(event) =>
                        setCaseForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                      placeholder="Current status"
                    />
                    <input
                      type="date"
                      value={caseForm.nextHearingDate}
                      onChange={(event) =>
                        setCaseForm((prev) => ({
                          ...prev,
                          nextHearingDate: event.target.value,
                        }))
                      }
                    />
                    <textarea
                      rows={2}
                      value={caseForm.notes}
                      onChange={(event) =>
                        setCaseForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Case notes"
                    />
                    <button type="submit">Save Case</button>
                  </form>

                  <form onSubmit={handleReminderSubmit} className="justice-form-grid">
                    <h4>Add Reminder</h4>
                    <input
                      value={reminderForm.title}
                      onChange={(event) =>
                        setReminderForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Reminder title"
                      required
                    />
                    <input
                      type="date"
                      value={reminderForm.dueDate}
                      onChange={(event) =>
                        setReminderForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                    />
                    <button type="submit">Save Reminder</button>
                  </form>
                </div>

                <div className="justice-list-grid">
                  <section className="justice-list-card">
                    <h4>Tracked Cases ({desk.cases.length})</h4>
                    {desk.cases.length === 0 && <p>No cases yet.</p>}
                    {desk.cases.map((item) => (
                      <article key={item.id} className="justice-item-row">
                        <strong>{item.title}</strong>
                        <p>Status: {item.status || "N/A"}</p>
                        <p>Court: {item.court || "N/A"}</p>
                        <p>CNR: {item.cnrNumber || "N/A"}</p>
                        <p>Next hearing: {item.nextHearingDate || "Not set"}</p>
                        {item.notes && <p>Notes: {item.notes}</p>}
                        {item.aiPlan && <pre>{item.aiPlan}</pre>}
                        <div className="justice-inline-actions">
                          <button
                            type="button"
                            onClick={() => handleGenerateCasePlan(item)}
                            disabled={casePlanLoadingId === item.id}
                          >
                            {casePlanLoadingId === item.id ? "Planning..." : "AI Next Step"}
                          </button>
                          <button type="button" onClick={() => handleRemoveCase(item.id)}>
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>

                  <section className="justice-list-card">
                    <h4>Reminders ({desk.reminders.length})</h4>
                    {desk.reminders.length === 0 && <p>No reminders yet.</p>}
                    {desk.reminders.map((item) => (
                      <article key={item.id} className="justice-item-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(item.done)}
                            onChange={() => handleReminderToggle(item)}
                          />
                          <span>{item.title}</span>
                        </label>
                        <p>Due: {item.dueDate || "Not set"}</p>
                        <div className="justice-inline-actions">
                          <button type="button" onClick={() => handleReminderDelete(item)}>
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </section>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "aid" && (
          <div className="justice-panel">
            <h4>Legal Aid Channels</h4>
            <div className="justice-service-grid">
              {legalAidChannels.map((item) => (
                <article key={item.id} className="justice-service-card">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                  <span className={item.isOfficialDomain ? "ok" : "warn"}>
                    {item.isOfficialDomain ? "Official domain" : "Check domain"}
                  </span>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    Open Channel
                  </a>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeTab === "njdg" && (
          <div className="justice-panel">
            <h4>{njdgInsight?.title || "NJDG Guide"}</h4>
            <p>{njdgInsight?.note}</p>
            <ul>
              {Array.isArray(njdgInsight?.facets) &&
                njdgInsight.facets.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <a
              className="justice-link-btn"
              href={njdgInsight?.officialUrl || "https://njdg.ecourts.gov.in/njdg_v3/"}
              target="_blank"
              rel="noreferrer"
            >
              Open Official NJDG Portal
            </a>
          </div>
        )}

        {activeTab === "policy" && (
          <div className="justice-panel">
            <h4>Compliance Guardrails</h4>
            <p>{policy?.positioning}</p>
            <p>{policy?.sourceRule}</p>
            <p>{policy?.dataHandling}</p>
            <p>{policy?.antiScrapeRule}</p>
            <p>
              Last updated: <strong>{policy?.lastUpdated || "N/A"}</strong>
            </p>
            <h5>Official Domain Allowlist</h5>
            <ul>
              {Array.isArray(policy?.officialDomains) &&
                policy.officialDomains.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <form className="justice-form-grid" onSubmit={handleVerifyLink}>
              <h5>Verify Any Link Before Sharing Data</h5>
              <input
                value={checkUrl}
                onChange={(event) => setCheckUrl(event.target.value)}
                placeholder="Paste URL to verify (e.g. https://services.ecourts.gov.in)"
              />
              <button type="submit" disabled={isCheckingUrl}>
                {isCheckingUrl ? "Verifying..." : "Verify URL"}
              </button>
              {checkError && <p className="justice-error">{checkError}</p>}
              {checkResult && (
                <p className={checkResult.isOfficial ? "justice-ok" : "justice-warn"}>
                  {checkResult.recommendation}
                </p>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

export default JusticeHub;
