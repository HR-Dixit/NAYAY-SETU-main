import { useMemo, useState } from "react";
import "./GuidedFlows.css";

const WORKFLOWS = [
  {
    id: "fir-refusal",
    title: "FIR Refusal Workflow",
    states: "All India",
    deadline: "Escalate within 24 hours",
    steps: [
      "Prepare incident summary with date, time, place, and witnesses.",
      "Visit police station and request FIR for cognizable offence.",
      "If refused, submit written complaint to SP/Commissioner office.",
      "Keep acknowledgement copy and complaint number safely.",
      "Consult criminal lawyer for 156(3) CrPC application if needed.",
    ],
    checklist: [
      "Government ID proof",
      "Incident timeline",
      "Photos/video evidence",
      "Prior complaint copy",
      "Witness contacts",
    ],
  },
  {
    id: "cyber-fraud",
    title: "Cyber Fraud Recovery",
    states: "All India",
    deadline: "Report in first 2-6 hours for better recovery chance",
    steps: [
      "Call 1930 immediately and ask bank to freeze suspicious transfer.",
      "File complaint on cybercrime.gov.in with transaction proof.",
      "Submit printout/reference to nearest cyber police station.",
      "Track complaint status and submit additional evidence quickly.",
    ],
    checklist: [
      "Transaction ID / UTR",
      "Bank statement screenshot",
      "UPI app logs",
      "Fraud call/chat screenshots",
      "1930 complaint reference",
    ],
  },
  {
    id: "domestic-violence",
    title: "Domestic Violence Protection",
    states: "All India",
    deadline: "Immediate safety first, legal filing in 24-48 hours",
    steps: [
      "If in danger, call 112 and move to safe location.",
      "Contact women helpline 181/1091 and collect support contacts.",
      "File Domestic Violence complaint through Protection Officer.",
      "Request protection, residence, maintenance, and custody reliefs.",
    ],
    checklist: [
      "Medical records",
      "Threat/injury photos",
      "Messages/audio proof",
      "Marriage proof",
      "Expense and child records",
    ],
  },
  {
    id: "tenant-eviction",
    title: "Illegal Eviction (Tenant)",
    states: "Major metros + state rent laws",
    deadline: "Respond to notice within 48 hours",
    steps: [
      "Do not vacate without written notice/legal order.",
      "Send formal written response to landlord.",
      "Collect rent agreement and payment proof.",
      "Approach rent authority/civil court for interim protection.",
    ],
    checklist: [
      "Rent agreement",
      "Rent receipts / bank proof",
      "Eviction notice copy",
      "Utility bills",
      "Chat/email records",
    ],
  },
  {
    id: "consumer-complaint",
    title: "Consumer Complaint",
    states: "All India",
    deadline: "Send written notice in 3-7 days",
    steps: [
      "Collect invoice, warranty, and communication records.",
      "Send clear written notice to seller/service provider.",
      "File grievance at National Consumer Helpline or e-Daakhil.",
      "Track hearing notice and submit evidence bundle.",
    ],
    checklist: [
      "Invoice / receipt",
      "Warranty/terms",
      "Product/service photos",
      "Written complaint copy",
      "NCH/e-Daakhil references",
    ],
  },
];

function downloadChecklist(flow) {
  const content = [
    `NAYAY SETU Checklist: ${flow.title}`,
    `Applicable states: ${flow.states}`,
    `Target deadline: ${flow.deadline}`,
    "",
    "Action Steps:",
    ...flow.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Documents Checklist:",
    ...flow.checklist.map((item) => `- ${item}`),
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${flow.id}-checklist.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function GuidedFlows() {
  const [activeId, setActiveId] = useState(WORKFLOWS[0].id);
  const activeFlow = useMemo(
    () => WORKFLOWS.find((flow) => flow.id === activeId) || WORKFLOWS[0],
    [activeId]
  );

  return (
    <section className="guided-flow-wrap">
      <h3>Guided Legal Workflows (India)</h3>
      <p>
        Choose a situation and follow a state-aware action flow with deadlines.
      </p>

      <div className="guided-flow-tabs">
        {WORKFLOWS.map((flow) => (
          <button
            key={flow.id}
            type="button"
            className={flow.id === activeId ? "active" : ""}
            onClick={() => setActiveId(flow.id)}
          >
            {flow.title}
          </button>
        ))}
      </div>

      <article className="guided-flow-card">
        <div className="guided-flow-head">
          <div>
            <h4>{activeFlow.title}</h4>
            <p>Applicable: {activeFlow.states}</p>
          </div>
          <span>{activeFlow.deadline}</span>
        </div>

        <div className="guided-flow-grid">
          <div>
            <strong>Action Steps</strong>
            <ol>
              {activeFlow.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div>
            <strong>Documents Needed</strong>
            <ul>
              {activeFlow.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <button type="button" onClick={() => downloadChecklist(activeFlow)}>
          Download Checklist
        </button>
      </article>
    </section>
  );
}
