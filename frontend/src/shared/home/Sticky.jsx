import { useEffect, useState } from "react";
import "./Sticky.css";
import { EMERGENCY_CONTACTS_INDIA } from "../../features/assistant/emergencyContacts";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/scrollLock";

function Sticky() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener("open-emergency-sos", onOpen);

    if (isOpen) {
      lockBodyScroll();
      return () => {
        window.removeEventListener("open-emergency-sos", onOpen);
        unlockBodyScroll();
      };
    }

    return () => {
      window.removeEventListener("open-emergency-sos", onOpen);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="Vertical-note"
        onClick={() => setIsOpen(true)}
        aria-label="Open emergency contacts"
      >
        Emergency SOS
      </button>

      {isOpen && (
        <div className="sos-modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="sos-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Emergency Contacts India"
          >
            <div className="sos-modal-header">
              <h3>Emergency Contacts (India)</h3>
              <button
                type="button"
                className="sos-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close emergency contacts"
              >
                x
              </button>
            </div>

            <div className="sos-list">
              {EMERGENCY_CONTACTS_INDIA.map((item) => (
                <a
                  key={`${item.number}-${item.department}`}
                  href={`tel:${item.number.replace(/[^0-9]/g, "")}`}
                  className="sos-item"
                >
                  <span>{item.number}</span>
                  <small>{item.department}</small>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sticky;
