import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import "./Faq.css";

const FAQ_ITEMS = [
  {
    q: "Is AI advice final legal advice?",
    a: "No. It gives general legal direction. For case-specific strategy, consult a qualified lawyer.",
  },
  {
    q: "How fast should I act in emergency legal issues?",
    a: "Immediately. Use SOS contacts first, preserve evidence, and then seek legal guidance.",
  },
  {
    q: "How are lawyers verified on this platform?",
    a: "Lawyer registration requires Bar Council details and identity documents before listing.",
  },
  {
    q: "Can I contact a lawyer directly from the platform?",
    a: "Yes. You can call, message, or send an appointment request from the lawyer card.",
  },
  {
    q: "What documents should I keep ready?",
    a: "ID proof, timeline of events, notices/messages, payment records, and any relevant evidence.",
  },
];

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="faq-section">
      <h2 className="headings"> FAQ </h2>
      <p className="faq-intro">
        Quick answers to common questions about AI guidance, emergency flow, and
        lawyer support.
      </p>
      <div className="faq-list">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <article key={item.q} className={`faq-item ${isOpen ? "open" : ""}`}>
              <button
                className="faq-question"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span>{item.q}</span>
                <FiChevronDown className="faq-toggle" />
              </button>
              {isOpen && <p className="faq-answer">{item.a}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Faq;
