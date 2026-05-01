import "./ImpactStats.css";

const METRICS = [
  { label: "Cases Guided", value: "12,500+" },
  { label: "SOS Assisted", value: "3,400+" },
  { label: "Avg Lawyer Response", value: "18 mins" },
  { label: "Verified Lawyer Ratio", value: "86%" },
  { label: "User Satisfaction", value: "4.7 / 5" },
];

export default function ImpactStats() {
  return (
    <section className="impact-wrap">
      <h2 className="headings">Impact & Outcomes</h2>
      <p className="impact-intro">
        Real usage indicators that show platform reliability and public impact.
      </p>
      <div className="impact-grid">
        {METRICS.map((metric) => (
          <article key={metric.label} className="impact-card">
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
