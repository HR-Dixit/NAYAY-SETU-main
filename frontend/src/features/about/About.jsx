import "./About.css";
import ABTImg from "../../assets/Images/about nayay.jpeg";
import Member1 from "../../assets/Images/abhi.jpeg";
import Member2 from "../../assets/Images/Mathuriya.jpeg";
import Member3 from "../../assets/Images/Jhanvi.jpeg";
import Member4 from "../../assets/Images/Hardik.jpeg";

function About({ mode = "full", onKnowMore, onBackHome }) {
  const isSummary = mode === "summary";
  const teamMembers = [
    {
      name: "Abhishek Yadav",
      role: "Founder",
      image: Member1,
      bio: "Leads the NAYAY SETU mission with a focus on legal awareness, accountability, and citizen empowerment through technology.",
    },
    {
      name: "Abhishek Maturiya",
      role: "Core Team Member",
      image: Member2,
      bio: "Contributes to product development and execution, helping turn social-impact ideas into practical platform features.",
    },
    {
      name: "Jhanvi Singh",
      role: "Core Team Member",
      image: Member3,
      bio: "Supports content and user-focused planning to keep legal guidance clear, understandable, and accessible.",
    },
    {
      name: "Hardik Dixit",
      role: "Core Team Member",
      image: Member4,
      bio: "Works on implementation and collaboration efforts that strengthen platform quality and real-world usability.",
    },
  ];

  return (
    <div className={`about-page ${isSummary ? "about-page-summary" : "about-page-full"}`}>
      {!isSummary && (
        <div className="about-topbar">
          <p className="about-topbar-text">Detailed About NAYAY SETU</p>
          <button type="button" className="about-back-btn" onClick={() => onBackHome?.()}>
            Back to Home
          </button>
        </div>
      )}
      <div className="about-hero">
        <div className="about-hero-copy">
          <p className="about-kicker">About NAYAY SETU</p>
          <h3>Transforming Legal Awareness into Empowerment</h3>
          <p>
            NAYAY SETU is a purpose-driven legal technology initiative founded
            with a single vision, to make justice accessible, understandable,
            and actionable for everyone.
          </p>
          <p>
            We are building a digital platform that empowers citizens with
            reliable legal knowledge, promotes responsible governance, and
            strengthens the connection between society and the justice system.
          </p>
        </div>
        <div className="about-hero-image">
          <img
            src={ABTImg}
            alt="NAYAY SETU legal awareness initiative"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      {!isSummary && (
        <section className="about-section">
          <h4>Why NAYAY SETU Exists</h4>
          <p>
            In today&apos;s world, legal systems are often complex and
            intimidating. Many individuals face situations where their rights are
            unclear, guidance is unavailable, and authority is misused without
            accountability. NAYAY SETU was created to bridge this gap by providing
            awareness, guidance, and clarity when it matters most.
          </p>
          <div className="about-subblock">
            <h5>Our Vision</h5>
            <p>
              To build a globally trusted legal-tech platform that empowers
              individuals, strengthens societal awareness, and contributes to a
              more just and accountable nation.
            </p>
          </div>
        </section>
      )}

      <section className="about-section">
        <h4>The Team Behind the Mission</h4>
        <div className="about-member-grid">
          {teamMembers.map((member) => (
            <article key={member.name} className="about-member-card">
              <div className="about-member-photo-wrap">
                <img
                  src={member.image}
                  alt={member.name}
                  className="about-member-photo"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h5>{member.name}</h5>
              <p className="about-member-role">{member.role}</p>
              <p>{member.bio}</p>
            </article>
          ))}
        </div>
        <p>
          Their dedication, collaboration, and shared belief in social impact
          have been instrumental in shaping this initiative.
        </p>
        {isSummary && (
          <div className="about-cta-row">
            <button
              type="button"
              className="about-know-more-btn"
              onClick={() => onKnowMore?.()}
            >
              Know More About Us
            </button>
          </div>
        )}
        {!isSummary && (
          <p>
            We also express our sincere gratitude to Dr. Anurag Sharma, Head of
            the Department, C.S.E., whose mentorship, guidance, and belief in our
            vision provided us with the opportunity and direction to transform
            this idea into a meaningful social initiative.
          </p>
        )}
      </section>

      {!isSummary && (
        <>
          <section className="about-founder-note">
            <h4>Founder&apos;s Note</h4>
            <p>
              When I started NAYAY SETU, it was not just an idea, it was a response
              to a real experience.
            </p>
            <p>
              As a student traveling daily by bike to another city for college, I
              once faced a situation where, despite having all valid documents, I
              experienced misuse of authority and disrespectful conduct. In that
              moment, I felt something many citizens feel, confusion, helplessness,
              and a lack of immediate guidance.
            </p>
            <p>I kept asking myself:</p>
            <p className="about-quote">
              &quot;What if there was a platform that could instantly guide me about
              my rights? What if every citizen had access to clear, reliable legal
              direction during critical moments?&quot;
            </p>
            <p>That question became the foundation of NAYAY SETU.</p>
            <p>
              This platform is not built out of anger, but out of responsibility.
              It is built on the belief that awareness creates confidence, and
              confidence strengthens society. An informed citizen does not create
              conflict, they create accountability, respect, and balance.
            </p>
            <p>
              Through NAYAY SETU, my team and I aim to contribute toward a legally
              aware, digitally empowered, and socially responsible India, aligned
              with the broader vision of initiatives like Digital India.
            </p>
            <p>
              We are not here to challenge systems. We are here to strengthen them,
              by empowering the people they serve.
            </p>
            <p>
              This is just the beginning of a mission to make legal awareness
              accessible, practical, and transformative.
            </p>
            <p>Thank you for being part of this journey.</p>
            <p className="about-signoff">
              Abhishek Yadav
              <br />
              Founder, NAYAY SETU
            </p>
          </section>

          <section className="about-section">
            <h4>Our Contribution to Society &amp; Nation</h4>
            <p>At NAYAY SETU, we believe that an informed citizen strengthens a nation.</p>
            <div className="about-points">
              <div className="about-point">Promoting legal awareness and constitutional rights</div>
              <div className="about-point">Encouraging transparency and responsible authority</div>
              <div className="about-point">Helping individuals handle legal or administrative challenges confidently</div>
              <div className="about-point">Reducing fear, confusion, and misinformation during critical situations</div>
              <div className="about-point">Supporting the vision of a more accountable and empowered society</div>
            </div>
            <p>
              By spreading awareness and providing guidance, we aim to create
              social impact at both individual and national levels because justice
              awareness is a foundation of a strong democracy.
            </p>
          </section>

          <section className="about-section">
            <h4>Alignment with the Vision of India</h4>
            <p>
              At NAYAY SETU, our mission strongly aligns with the transformative
              goals of the Government of India to build a transparent, digitally
              empowered, and legally aware society.
            </p>

            <div className="about-subblock">
              <h5>Supporting Digital India</h5>
              <p>
                Under the Digital India initiative, the Government of India aims to
                transform the country into a digitally empowered society and
                knowledge economy.
              </p>
              <p>NAYAY SETU contributes to this vision by:</p>
              <div className="about-points">
                <div className="about-point">
                  Providing digital access to legal awareness
                </div>
                <div className="about-point">
                  Promoting online legal guidance and information
                </div>
                <div className="about-point">
                  Leveraging technology to simplify complex systems
                </div>
              </div>
              <p>
                We believe technology should not just connect people, it should
                empower them.
              </p>
            </div>

            <div className="about-subblock">
              <h5>Strengthening Access to Justice</h5>
              <p>
                Our vision complements the principles of the Ministry of Law and
                Justice, which works to ensure accessible and equitable justice for
                all citizens.
              </p>
              <p>
                By promoting awareness of legal rights, responsibilities, and lawful
                procedures, NAYAY SETU supports:
              </p>
              <div className="about-points">
                <div className="about-point">Citizen empowerment</div>
                <div className="about-point">Transparency in public administration</div>
                <div className="about-point">Reduction of misinformation</div>
                <div className="about-point">
                  Encouragement of lawful and respectful engagement between
                  authorities and citizens
                </div>
              </div>
            </div>

            <div className="about-subblock">
              <h5>Promoting Legal Awareness</h5>
              <p>
                The Government of India has consistently emphasized legal literacy
                through initiatives such as the National Legal Services Authority
                (NALSA), which focuses on free legal aid and spreading awareness
                among citizens.
              </p>
              <p>NAYAY SETU aligns with this mission by:</p>
              <div className="about-points">
                <div className="about-point">
                  Simplifying legal knowledge into understandable language
                </div>
                <div className="about-point">
                  Encouraging responsible civic behavior
                </div>
                <div className="about-point">
                  Helping individuals handle legal situations calmly and lawfully
                </div>
              </div>
            </div>

            <div className="about-subblock">
              <h5>Our National Commitment</h5>
              <p>
                We are not positioned against systems, we are positioned to
                strengthen them.
              </p>
              <p>NAYAY SETU aims to:</p>
              <div className="about-points">
                <div className="about-point">
                  Support a legally informed citizen base
                </div>
                <div className="about-point">
                  Encourage accountability with respect
                </div>
                <div className="about-point">
                  Build trust between citizens and institutions
                </div>
                <div className="about-point">
                  Contribute to a stronger, more transparent democracy
                </div>
              </div>
              <p>
                Our long-term goal is to complement government efforts by acting as
                a technology bridge between public awareness and institutional
                frameworks.
              </p>
            </div>
          </section>
        </>
      )}

    </div>
  );
}

export default About;
