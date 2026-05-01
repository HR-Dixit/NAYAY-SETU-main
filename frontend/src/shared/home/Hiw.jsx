import "./Hiw.css";

const STEPS = [
  {
    number: "01",
    title: "Share Your Legal Issue",
    details:
      "Describe your problem in one line. Add city/state and urgency for better guidance.",
  },
  {
    number: "02",
    title: "Get AI Direction",
    details:
      "AI gives immediate steps: what to do now, what to do next, and required documents.",
  },
  {
    number: "03",
    title: "Access SOS or Rights Help",
    details:
      "Use Emergency SOS for helpline numbers and open Know Your Rights for quick legal basics.",
  },
  {
    number: "04",
    title: "Find Verified Lawyers",
    details:
      "Browse category-wise lawyers. Contact directly by call, message, or appointment request.",
  },
  {
    number: "05",
    title: "Track & Act",
    details:
      "Collect key records, send notices/complaints in time, and follow legal deadlines.",
  },
];

export default function Hiw() {
  return (
    <section className="hiw-section">
      <p className="hiw-intro">
        A simple legal support flow from first question to real action.
      </p>
      <div className="hiw-grid">
        {STEPS.map((step) => (
          <article key={step.number} className="hiw-card">
            <div className="hiw-card-head">
              <span className="hiw-step">{`Step ${Number(step.number)}`}</span>
              <h3>{step.title}</h3>
            </div>
            <p>{step.details}</p>
          </article>
        ))}
      </div>
      <div className="hiw-example">
        <h4>Example: How to Use NAYAY SETU</h4>
        <p>
          Situation: "My landlord is threatening illegal eviction."
        </p>
        <p>
          1. Open AI Legal Assistant and ask this in one line.
        </p>
        <p>
          2. Follow AI guidance: immediate action, next legal step, and required
          documents.
        </p>
        <p>
          3. If urgent threat, use Emergency SOS first.
        </p>
        <p>
          4. Open Lawyers section, filter by Property Law, and contact a verified
          lawyer.
        </p>
      </div>
      <div className="hiw-note">
        Need urgent help? Use Emergency SOS first, then continue with AI guidance.
      </div>
    </section>
  );
}
