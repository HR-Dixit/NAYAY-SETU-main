import "./Services.css";

function Services({ children }) {
  return (
    <section className="services-container">
      <div className="services-list">{children}</div>
    </section>
  );
}

export default Services;
