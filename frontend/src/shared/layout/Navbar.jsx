import { useEffect, useMemo, useRef, useState } from "react";
import "./Navbar.css";
import { BsBell, BsCaretDown } from "react-icons/bs";
import ProfileDrawer from "./ProfileDrawer";
import {
  markAllNotificationsRead,
  markNotificationRead,
  readNotifications,
  subscribeToNotifications,
} from "../../utils/notifications";

const ACTIVE_LANGUAGE_OPTIONS = ["English", "Hindi"];

const NAV_LABELS = {
  English: ["HOME", "SERVICES", "ABOUT", "FEEDBACK"],
  Hindi: ["होम", "सेवाएं", "हमारे बारे में", "फीडबैक"],
};

function Navbar({
  toggleLogin,
  onNavigate,
  language,
  onLanguageChange,
  isLoggedIn,
  currentUser,
  onLogout,
  isDashboardActive = false,
  onOpenDashboard,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenLegalAssistant,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  const brandName = "NAYAY-SETU";
  const [openPanel, setOpenPanel] = useState("");
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);

  // Close dropdowns when the user clicks outside navbar controls.
  useEffect(() => {
    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpenPanel("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const reload = () => {
      setNotifications(readNotifications(currentUser));
    };

    reload();
    return subscribeToNotifications(reload);
  }, [currentUser]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const labels = NAV_LABELS[language] || NAV_LABELS.English;
  const navItems = [
    { label: labels[0], id: "home" },
    { label: labels[1], id: "services" },
    { label: labels[2], id: "about" },
    { label: labels[3], id: "feedback" },
  ];

  const markAllRead = () => {
    markAllNotificationsRead(currentUser);
  };

  const markOneRead = (notificationId) => {
    markNotificationRead(notificationId, currentUser);
  };

  const handleLanguageSelect = (value) => {
    onLanguageChange?.(value);
    setOpenPanel("");
  };

  const togglePanel = (panel) => {
    setOpenPanel((prev) => (prev === panel ? "" : panel));
  };

  const shortLanguage = (language || "English").slice(0, 2).toUpperCase();
  const displayName = currentUser?.displayName || currentUser?.username || "User";
  const profileInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <nav className="navbar">
      <div className="left-div">
        <h1
          onClick={() => onNavigate?.("home")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onNavigate?.("home");
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Go to home"
        >
          {brandName}
        </h1>
      </div>
      <div className="mid-div">
        <ul>
          {navItems.map((item) => (
            <li
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onNavigate?.(item.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="right-btn" ref={panelRef}>
        <div className="nav-control-wrap">
          <button
            className="nav-control"
            onClick={() => togglePanel("notifications")}
          >
            <BsBell className="bell-icon" />
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </button>
          {openPanel === "notifications" && (
            <div className="nav-panel">
              <div className="nav-panel-header">
                <strong>Notifications</strong>
                <button onClick={markAllRead}>Mark all read</button>
              </div>
              <ul>
                {notifications.length === 0 && (
                  <li className="read">No notifications yet.</li>
                )}
                {notifications.map((item) => (
                  <li
                    key={item.id}
                    className={item.read ? "read" : "unread"}
                    onClick={() => markOneRead(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        markOneRead(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="nav-control-wrap">
          <button
            className="nav-control lang"
            onClick={() => togglePanel("language")}
          >
            <BsCaretDown className="down-icon" />
            <p>{shortLanguage}</p>
          </button>
          {openPanel === "language" && (
            <div className="nav-panel option-panel">
              {ACTIVE_LANGUAGE_OPTIONS.map((item) => (
                <button
                  key={item}
                  className={item === language ? "selected" : ""}
                  onClick={() => handleLanguageSelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        {!isLoggedIn && (
          <button className="btn btn-light" onClick={toggleLogin}>
            Login
          </button>
        )}
        {isLoggedIn && (
          <div className="nav-control-wrap">
            <button
              className="profile-trigger"
              onClick={() => setIsProfileDrawerOpen(true)}
              aria-label="Open profile menu"
            >
              <span className="profile-avatar">{profileInitial}</span>
              <span className="profile-name">{displayName}</span>
            </button>
          </div>
        )}
      </div>
      {isLoggedIn && (
        <ProfileDrawer
          isOpen={isProfileDrawerOpen}
          onClose={() => setIsProfileDrawerOpen(false)}
          currentUser={currentUser}
          isDashboardActive={isDashboardActive}
          onOpenDashboard={onOpenDashboard}
          onLogout={onLogout}
          onNavigate={onNavigate}
          onOpenLawyerHub={onOpenLawyerHub}
          onOpenCommunityHub={onOpenCommunityHub}
          onOpenRightsHub={onOpenRightsHub}
          onOpenLegalAssistant={onOpenLegalAssistant}
          onOpenEmergencySupport={onOpenEmergencySupport}
          onOpenJusticeHub={onOpenJusticeHub}
        />
      )}
    </nav>
  );
}

export default Navbar;
