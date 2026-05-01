import "./Footer.css";
import {
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

function Footer({ onOpenLegalPolicies }) {
  const openLegalPolicies = (event) => {
    event.preventDefault();
    if (onOpenLegalPolicies) {
      onOpenLegalPolicies();
      return;
    }
    window.location.hash = "/legal";
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>NAYAY SETU</h3>
          <p>Accessible legal awareness, support, and community for everyone.</p>
        </div>

        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#legal-resources">How It Works</a>
          <a href="#about">About</a>
          <a href="#/legal" onClick={openLegalPolicies}>
            Terms
          </a>
          <a href="#/legal" onClick={openLegalPolicies}>
            Privacy
          </a>
          <a href="#/legal" onClick={openLegalPolicies}>
            Data Retention
          </a>
        </div>

        <div className="footer-social">
          <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
            <FaInstagram />
          </a>
          <a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">
            <FaXTwitter />
          </a>
          <a href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <FaLinkedinIn />
          </a>
          <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">
            <FaYoutube />
          </a>
        </div>
      </div>

      <div className="footer-copy">
        © {new Date().getFullYear()} NAYAY SETU. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
