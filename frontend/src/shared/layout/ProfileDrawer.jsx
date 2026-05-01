import { useEffect, useMemo, useState } from "react";
import { lockBodyScroll, unlockBodyScroll } from "../../utils/scrollLock";
import "./ProfileDrawer.css";

const CURRENT_USER_KEY = "nayay-setu-current-user";
const USERS_STORAGE_KEY = "nayay-setu-users";
const LAWYERS_STORAGE_KEY = "nayay-setu-lawyers";

const EMPTY_PROFILE = {
  firstName: "",
  middleName: "",
  lastName: "",
  username: "",
  email: "",
  contact: "",
  address: "",
  profilePhoto: "",
  info: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  youtube: "",
  website: "",
};

function ProfileDrawer({
  isOpen,
  onClose,
  currentUser,
  isDashboardActive = false,
  onOpenDashboard,
  onLogout,
  onNavigate,
  onOpenLawyerHub,
  onOpenCommunityHub,
  onOpenRightsHub,
  onOpenLegalAssistant,
  onOpenEmergencySupport,
  onOpenJusticeHub,
}) {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [initialForm, setInitialForm] = useState(EMPTY_PROFILE);
  const [notice, setNotice] = useState("");
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState(false);
  const [isUpdateInfoOpen, setIsUpdateInfoOpen] = useState(false);
  const [isSocialMediaOpen, setIsSocialMediaOpen] = useState(false);
  const [lawyerRecords, setLawyerRecords] = useState([]);
  const role = currentUser?.role || "user";

  useEffect(() => {
    if (!currentUser) {
      setForm(EMPTY_PROFILE);
      setInitialForm(EMPTY_PROFILE);
      return;
    }
    const nextForm = {
      firstName: currentUser.firstName || "",
      middleName: currentUser.middleName || "",
      lastName: currentUser.lastName || "",
      username: currentUser.username || "",
      email: currentUser.email || "",
      contact: currentUser.contact || "",
      address: currentUser.address || "",
      profilePhoto: currentUser.profilePhoto || "",
      info: currentUser.info || "",
      instagram: currentUser.instagram || "",
      linkedin: currentUser.linkedin || "",
      twitter: currentUser.twitter || "",
      youtube: currentUser.youtube || "",
      website: currentUser.website || "",
    };
    setForm(nextForm);
    setInitialForm(nextForm);
    setNotice("");
  }, [currentUser, isOpen]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LAWYERS_STORAGE_KEY) || "[]");
      setLawyerRecords(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLawyerRecords([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onEsc = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setIsQuickAccessOpen(false);
    setIsUpdateInfoOpen(false);
    setIsSocialMediaOpen(false);
  }, [isOpen]);

  const fullName = useMemo(
    () =>
      [form.firstName, form.middleName, form.lastName]
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" "),
    [form.firstName, form.middleName, form.lastName]
  );

  const isDirty = useMemo(
    () =>
      JSON.stringify({
        ...form,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
      }) !==
      JSON.stringify({
        ...initialForm,
        firstName: initialForm.firstName.trim(),
        middleName: initialForm.middleName.trim(),
        lastName: initialForm.lastName.trim(),
        username: initialForm.username.trim(),
        email: initialForm.email.trim(),
      }),
    [form, initialForm]
  );

  const isSocialDirty = useMemo(
    () =>
      form.instagram !== initialForm.instagram ||
      form.linkedin !== initialForm.linkedin ||
      form.twitter !== initialForm.twitter ||
      form.youtube !== initialForm.youtube ||
      form.website !== initialForm.website,
    [form, initialForm]
  );

  const linkedLawyer = useMemo(() => {
    const email = (currentUser?.email || form.email || "").toLowerCase();
    if (!email) return null;
    return lawyerRecords.find(
      (lawyer) => lawyer?.email?.toLowerCase && lawyer.email.toLowerCase() === email
    );
  }, [currentUser?.email, form.email, lawyerRecords]);

  const lawyerVerified = useMemo(() => {
    if (!linkedLawyer) return false;
    const checks = linkedLawyer.verificationChecks || {};
    return Boolean(
      linkedLawyer.docsVerified &&
        checks.ecourtsVerified &&
        checks.enrollmentVerified
    );
  }, [linkedLawyer]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setNotice("");
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!currentUser || !isDirty) return;

    const displayName = fullName || currentUser.displayName || currentUser.username;
    const updatedUser = {
      ...currentUser,
      ...form,
      username: form.username.trim() || currentUser.username,
      email: form.email.trim() || currentUser.email,
      displayName,
    };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    try {
      const parsed = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const users = Array.isArray(parsed) ? parsed : [];
      const nextUsers = users.map((user) => {
        const sameEmail =
          user?.email?.toLowerCase() &&
          updatedUser.email?.toLowerCase() &&
          user.email.toLowerCase() === updatedUser.email.toLowerCase();
        const sameUsername =
          user?.username?.toLowerCase() &&
          updatedUser.username?.toLowerCase() &&
          user.username.toLowerCase() === updatedUser.username.toLowerCase();
        if (!sameEmail && !sameUsername) return user;
        return { ...user, ...updatedUser };
      });
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
    } catch {
      // ignore local storage sync errors
    }

    window.dispatchEvent(new Event("auth-updated"));
    setInitialForm(form);
    setNotice("Profile updated successfully.");
  };

  const handleSocialSave = (event) => {
    event.preventDefault();
    if (!isSocialDirty || !currentUser) return;
    handleSave(event);
  };

  const openFeature = (fn) => {
    onClose?.();
    fn?.();
  };

  if (!isOpen) return null;

  const headerName = fullName || currentUser?.displayName || currentUser?.username || "User";
  const initials = headerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="profile-drawer-overlay" onClick={onClose}>
      <aside className={`profile-drawer role-${role}`} onClick={(event) => event.stopPropagation()}>
        <div className="profile-drawer-header">
          <div className="profile-header-main">
            <div className="profile-title-row">
              <div className="profile-avatar" aria-hidden="true">
                {initials || "U"}
              </div>
              <div>
                <h3>My Profile</h3>
                <p className="profile-role-pill">{role.toUpperCase()}</p>
              </div>
            </div>
            <section className="profile-summary">
              <h4>{headerName}</h4>
              {role === "lawyer" && (
                <>
                  <p>
                    Status:{" "}
                    <span className={lawyerVerified ? "ok" : "warn"}>
                      {lawyerVerified ? "Verified" : "Not Verified"}
                    </span>
                  </p>
                  <p>Category: {linkedLawyer?.field || "Not assigned"}</p>
                  <p>Info: {form.info || "No profile info added yet."}</p>
                </>
              )}
              {role !== "lawyer" && (
                <>
                  <p>Actual Name: {fullName || "Not set"}</p>
                  <p>Info: {form.info || "No profile info added yet."}</p>
                </>
              )}
            </section>
          </div>
          <button type="button" onClick={onClose} aria-label="Close profile menu">
            x
          </button>
        </div>

        <div className="profile-menu-buttons">
          <button
            type="button"
            className="profile-section-toggle"
            onClick={() => setIsQuickAccessOpen((prev) => !prev)}
            aria-expanded={isQuickAccessOpen}
          >
            <span>Quick Access</span>
            <span>{isQuickAccessOpen ? "−" : "+"}</span>
          </button>
          {isQuickAccessOpen && (
            <div className="profile-shortcut-grid">
              <button type="button" onClick={() => openFeature(() => onNavigate?.("home"))}>
                Home
              </button>
              <button type="button" onClick={() => openFeature(() => onNavigate?.("services"))}>
                Services
              </button>
              <button
                type="button"
                onClick={() => openFeature(() => onNavigate?.("legal-resources"))}
              >
                How It Works
              </button>
              <button type="button" onClick={() => openFeature(() => onNavigate?.("about"))}>
                About
              </button>
              <button type="button" onClick={() => openFeature(() => onNavigate?.("feedback"))}>
                Feedback
              </button>
              <button type="button" onClick={() => openFeature(onOpenLawyerHub)}>
                Lawyers
              </button>
              <button type="button" onClick={() => openFeature(onOpenCommunityHub)}>
                Community
              </button>
              <button type="button" onClick={() => openFeature(onOpenRightsHub)}>
                Rights
              </button>
              <button type="button" onClick={() => openFeature(onOpenLegalAssistant)}>
                AI Help
              </button>
              <button type="button" onClick={() => openFeature(onOpenEmergencySupport)}>
                Emergency SOS
              </button>
              <button type="button" onClick={() => openFeature(onOpenJusticeHub)}>
                Official Links
              </button>
            </div>
          )}

          {!isDashboardActive && (
            <button
              type="button"
              className="profile-flat-btn"
              onClick={() => openFeature(onOpenDashboard)}
            >
              Dashboard
            </button>
          )}

          <button
            type="button"
            className="profile-section-toggle"
            onClick={() => setIsUpdateInfoOpen((prev) => !prev)}
            aria-expanded={isUpdateInfoOpen}
          >
            <span>Update Info</span>
            <span>{isUpdateInfoOpen ? "−" : "+"}</span>
          </button>
          {isUpdateInfoOpen && (
            <form className="profile-form" onSubmit={handleSave}>
              <div className="profile-grid">
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
                <input
                  name="middleName"
                  value={form.middleName}
                  onChange={handleChange}
                  placeholder="Middle name"
                />
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Username"
                  required
                />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
                <input
                  name="contact"
                  value={form.contact}
                  onChange={handleChange}
                  placeholder="Contact number"
                />
              </div>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
              />
              <input
                name="profilePhoto"
                value={form.profilePhoto}
                onChange={handleChange}
                placeholder="Profile photo URL"
              />
              <textarea
                rows={3}
                name="info"
                value={form.info}
                onChange={handleChange}
                placeholder="Profile info / about you"
              />
              {notice && <p className="profile-notice">{notice}</p>}
              {isDirty && <button type="submit" className="profile-save-btn">Save Profile</button>}
            </form>
          )}

          <button
            type="button"
            className="profile-section-toggle"
            onClick={() => setIsSocialMediaOpen((prev) => !prev)}
            aria-expanded={isSocialMediaOpen}
          >
            <span>Social Media</span>
            <span>{isSocialMediaOpen ? "−" : "+"}</span>
          </button>
          {isSocialMediaOpen && (
            <form className="profile-form" onSubmit={handleSocialSave}>
              <div className="profile-grid">
                <input
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="Instagram URL"
                />
                <input
                  name="linkedin"
                  value={form.linkedin}
                  onChange={handleChange}
                  placeholder="LinkedIn URL"
                />
                <input
                  name="twitter"
                  value={form.twitter}
                  onChange={handleChange}
                  placeholder="X / Twitter URL"
                />
                <input
                  name="youtube"
                  value={form.youtube}
                  onChange={handleChange}
                  placeholder="YouTube URL"
                />
              </div>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="Website URL"
              />
              {notice && <p className="profile-notice">{notice}</p>}
              {isSocialDirty && (
                <button type="submit" className="profile-save-btn">
                  Edit & Update Social Media
                </button>
              )}
            </form>
          )}

          <button
            type="button"
            className="profile-flat-btn danger"
            onClick={() => {
              onClose?.();
              onLogout?.();
            }}
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}

export default ProfileDrawer;
