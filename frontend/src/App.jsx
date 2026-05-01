import { Suspense, lazy, useEffect, useRef, useState } from "react";
import Navbar from "./shared/layout/Navbar";
import Hero from "./shared/layout/Hero";
import Line from "./shared/home/Line";
import Sticky from "./shared/home/Sticky";
import Services from "./shared/home/Services";
import Card from "./shared/home/Card";
import EQUALITY from "./assets/Images/Tarazu.png";
import COMMUNITY from "./assets/Images/Community.png";
import EMERGENCY from "./assets/Images/emergency icon.png";
import BOOK from "./assets/Images/Book.png";
import Hiw from "./shared/home/Hiw";
import Faq from "./shared/home/Faq";
import GuidedFlows from "./shared/home/GuidedFlows";
import About from "./features/about/About";
import Footer from "./shared/layout/Footer";
import LegalAssistant from "./features/assistant/LegalAssistant";
import FeedbackForm from "./features/feedback/FeedbackForm";
import { lockBodyScroll, unlockBodyScroll } from "./utils/scrollLock";
import ImpactStats from "./shared/home/ImpactStats";
import { addNotification } from "./utils/notifications";
import { useAuth } from "./context/AuthContext";
import { authLogout } from "./services/legalApi";

const LANGUAGE_STORAGE_KEY = "nayay-language";
const LEGACY_LANGUAGE_STORAGE_KEY = "nyaya-language";

const APP_COPY = {
  English: {
    servicesHeading: "OUR SERVICES",
    howHeading: "HOW IT WORKS",
    aboutHeading: "ABOUT NAYAY SETU",
    heroTitle: "Your Personal AI Legal Assistant",
    heroSubtitle:
      "Get instant, reliable legal guidance 24/7. Chat with AI and get clear next steps in seconds.",
    services: [
      {
        title: "Lawyers",
        description:
          "Browse verified lawyers by practice area and contact directly.",
        btn: "Find Lawyers",
      },
      {
        title: "Our Community",
        description: "Join our community for legal resources and support.",
        btn: "Join Community",
      },
      {
        title: "Emergency",
        description: "Emergency legal assistance when you need it most.",
        btn: "Get Help",
      },
      {
        title: "Know Your Rights",
        description: "Learn about your legal rights and protections.",
        btn: "Explore Now",
      },
      {
        title: "Official Links",
        description:
          "Get official eCourts/NJDG/legal-aid routing and manage your case reminders.",
        btn: "Open Links",
      },
    ],
  },
  Hindi: {
    servicesHeading: "हमारी सेवाएं",
    howHeading: "यह कैसे काम करता है",
    aboutHeading: "न्याय सेतु के बारे में",
    heroTitle: "आपका व्यक्तिगत AI कानूनी सहायक",
    heroSubtitle:
      "24/7 तेज और भरोसेमंद कानूनी मार्गदर्शन पाएं। AI से चैट करें और अगले कदम जानें।",
    services: [
      {
        title: "वकील",
        description:
          "विभिन्न कानूनी क्षेत्रों के सत्यापित वकील देखें और सीधे संपर्क करें।",
        btn: "वकील खोजें",
      },
      {
        title: "हमारा समुदाय",
        description: "कानूनी संसाधन और सहायता के लिए समुदाय से जुड़ें।",
        btn: "समुदाय से जुड़ें",
      },
      {
        title: "इमरजेंसी",
        description: "ज़रूरत के समय तुरंत कानूनी सहायता पाएं।",
        btn: "मदद लें",
      },
      {
        title: "अपने अधिकार जानें",
        description: "अपने कानूनी अधिकार और सुरक्षा के बारे में जानें।",
        btn: "अभी देखें",
      },
      {
        title: "ऑफिशियल लिंक्स",
        description:
          "आधिकारिक eCourts/NJDG/लीगल-एड रूटिंग और केस रिमाइंडर एक ही जगह।",
        btn: "लिंक्स खोलें",
      },
    ],
  },
};

const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage"));
const LawyerHub = lazy(() => import("./features/lawyers/LawyerHub"));
const CommunityHub = lazy(() => import("./features/community/CommunityHub"));
const RightsHub = lazy(() => import("./features/rights/RightsHub"));
const EmergencyHub = lazy(() => import("./features/emergency/EmergencyHub"));
const JusticeHub = lazy(() => import("./features/justice/JusticeHub"));
const PolicyHub = lazy(() => import("./features/legal/PolicyHub"));
const LogInOut = lazy(() => import("./features/auth/LogInOut"));

const getHashRoute = () => {
  const hash = window.location.hash || "";
  const normalized = hash.startsWith("#/")
    ? hash.slice(2)
    : hash.replace(/^#/, "");
  return normalized.split("?")[0] || "";
};

const getLawyerTabFromHash = () => {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#/lawyers")) return "find";
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return "find";
  const params = new URLSearchParams(hash.slice(queryIndex + 1));
  return params.get("tab") === "register" ? "register" : "find";
};

const getPageFromHash = () => {
  const route = getHashRoute();
  if (route === "dashboard") return "dashboard";
  if (route === "community") return "community";
  if (route === "about") return "about";
  if (route === "lawyers") return "lawyers";
  if (route === "rights") return "rights";
  if (route === "emergency") return "emergency";
  if (route === "justice") return "justice";
  if (route === "legal") return "legal";
  return "home";
};

function App() {
  const { currentUser, isLoggedIn, logout, refreshFromStorage } = useAuth();
  const scrollRafRef = useRef(0);
  const [showLogin, setShowLogin] = useState(false);
  const [activePage, setActivePage] = useState(getPageFromHash);
  const [lawyerTab, setLawyerTab] = useState(getLawyerTabFromHash);
  const [serviceReturnTarget, setServiceReturnTarget] = useState("home");
  const [language, setLanguage] = useState(
    localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY) ||
      "English"
  );

  const openLegalAssistant = (query = "") => {
    window.dispatchEvent(
      new CustomEvent("open-legal-assistant", {
        detail: { query: query || "" },
      })
    );
  };

  const openLawyerHub = (tab = "find", origin = "home") => {
    setServiceReturnTarget(origin === "dashboard" ? "dashboard" : "home");
    const nextTab = tab === "register" ? "register" : "find";
    setLawyerTab(nextTab);
    setActivePage("lawyers");
    const nextHash =
      nextTab === "register" ? "/lawyers?tab=register" : "/lawyers";
    if (window.location.hash !== `#${nextHash}`) {
      window.location.hash = nextHash;
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openCommunityHub = (origin = "home") => {
    setServiceReturnTarget(origin === "dashboard" ? "dashboard" : "home");
    setActivePage("community");
    if (window.location.hash !== "#/community") {
      window.location.hash = "/community";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openRightsHub = (origin = "home") => {
    setServiceReturnTarget(origin === "dashboard" ? "dashboard" : "home");
    setActivePage("rights");
    if (window.location.hash !== "#/rights") {
      window.location.hash = "/rights";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openDashboard = () => {
    setActivePage("dashboard");
    if (window.location.hash !== "#/dashboard") {
      window.location.hash = "/dashboard";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openAboutPage = () => {
    setActivePage("about");
    if (window.location.hash !== "#/about") {
      window.location.hash = "/about";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openEmergencySupport = (origin = "home") => {
    setServiceReturnTarget(origin === "dashboard" ? "dashboard" : "home");
    setActivePage("emergency");
    if (window.location.hash !== "#/emergency") {
      window.location.hash = "/emergency";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openJusticeHub = (origin = "home") => {
    setServiceReturnTarget(origin === "dashboard" ? "dashboard" : "home");
    setActivePage("justice");
    if (window.location.hash !== "#/justice") {
      window.location.hash = "/justice";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const openLegalPolicies = () => {
    setActivePage("legal");
    if (window.location.hash !== "#/legal") {
      window.location.hash = "/legal";
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  const jumpToServicesInstant = () => {
    setActivePage("home");
    history.replaceState(null, "", window.location.pathname + window.location.search);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById("services");
        if (!target) {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
          return;
        }
        const navbarOffset = 80;
        const targetTop =
          target.getBoundingClientRect().top + window.scrollY - navbarOffset;
        window.scrollTo({
          top: Math.max(0, targetTop),
          left: 0,
          behavior: "auto",
        });
      });
    });
  };

  const returnFromService = () => {
    if (serviceReturnTarget === "dashboard") {
      setServiceReturnTarget("home");
      openDashboard();
      return;
    }
    jumpToServicesInstant();
  };

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const navbarOffset = 80;
    const targetTop =
      target.getBoundingClientRect().top + window.scrollY - navbarOffset;
    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    if (Math.abs(distance) < 4) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
    }

    const duration = Math.min(900, Math.max(450, Math.abs(distance) * 0.35));
    const startTime = performance.now();
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo(0, startTop + distance * eased);

      if (progress < 1) {
        scrollRafRef.current = requestAnimationFrame(tick);
      } else {
        scrollRafRef.current = 0;
      }
    };

    scrollRafRef.current = requestAnimationFrame(tick);
  };

  const handleNavbarNavigate = (sectionId) => {
    if (activePage !== "home") {
      setActivePage("home");
      if (
        window.location.hash === "#/dashboard" ||
        window.location.hash === "#/community" ||
        window.location.hash === "#/about" ||
        window.location.hash.startsWith("#/lawyers") ||
        window.location.hash === "#/rights" ||
        window.location.hash === "#/emergency" ||
        window.location.hash === "#/justice" ||
        window.location.hash === "#/legal"
      ) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      requestAnimationFrame(() => {
        scrollToSection(sectionId);
      });
      return;
    }
    scrollToSection(sectionId);
  };

  const handleLanguageChange = (value) => {
    setLanguage(value);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  };

  const copy = APP_COPY[language] || APP_COPY.English;

  const servicesData = [
    {
      title: copy.services[0].title,
      description: copy.services[0].description,
      image: EQUALITY,
      BtnTXT: copy.services[0].btn,
      onclick: openLawyerHub,
    },
    {
      title: copy.services[1].title,
      description: copy.services[1].description,
      image: COMMUNITY,
      BtnTXT: copy.services[1].btn,
      onclick: openCommunityHub,
    },
    {
      title: copy.services[2].title,
      description: copy.services[2].description,
      image: EMERGENCY,
      BtnTXT: copy.services[2].btn,
      onclick: openEmergencySupport,
    },
    {
      title: copy.services[3].title,
      description: copy.services[3].description,
      image: BOOK,
      BtnTXT: copy.services[3].btn,
      onclick: openRightsHub,
    },
    {
      title: copy.services[4].title,
      description: copy.services[4].description,
      image: BOOK,
      BtnTXT: copy.services[4].btn,
      onclick: openJusticeHub,
    },
  ];

  const toggleLogin = () => {
    setShowLogin((prev) => !prev);
  };

  const requireLogin = () => {
    setShowLogin(true);
  };

  const handleAuthSuccess = () => {
    refreshFromStorage();
    openDashboard();
  };

  const handleLogout = async () => {
    const displayName =
      currentUser?.displayName || currentUser?.username || "Member";
    if (currentUser) {
      addNotification(`${displayName}, you have been logged out.`, {
        user: currentUser,
        type: "info",
      });
    }
    try {
      await authLogout();
    } catch {
      // Best-effort server logout for stateless JWT.
    }
    logout();
  };

  useEffect(() => {
    if (showLogin) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [showLogin]);

  useEffect(
    () => () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    },
    []
  );

  useEffect(() => {
    document.documentElement.lang = language === "Hindi" ? "hi" : "en";
  }, [language]);

  useEffect(() => {
    const onHashChange = () => {
      setActivePage(getPageFromHash());
      setLawyerTab(getLawyerTabFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (
      activePage === "about" ||
      activePage === "dashboard" ||
      activePage === "community" ||
      activePage === "lawyers" ||
      activePage === "rights" ||
      activePage === "emergency" ||
      activePage === "justice" ||
      activePage === "legal"
    ) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [activePage]);

  const pageFallback = (
    <section style={{ padding: "2rem 1rem", textAlign: "center" }}>
      <p>Loading...</p>
    </section>
  );

  return (
    <>
      <Navbar
        toggleLogin={toggleLogin}
        onNavigate={handleNavbarNavigate}
        language={language}
        onLanguageChange={handleLanguageChange}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
        isDashboardActive={activePage === "dashboard"}
        onOpenDashboard={openDashboard}
        onOpenLawyerHub={openLawyerHub}
        onOpenCommunityHub={openCommunityHub}
        onOpenRightsHub={openRightsHub}
        onOpenLegalAssistant={openLegalAssistant}
        onOpenEmergencySupport={openEmergencySupport}
        onOpenJusticeHub={openJusticeHub}
      />
      <LegalAssistant />

      <Suspense fallback={pageFallback}>
        {activePage === "dashboard" ? (
          <DashboardPage
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            onRequireLogin={requireLogin}
            onOpenLegalAssistant={openLegalAssistant}
            onOpenLawyerHub={() => openLawyerHub("find", "dashboard")}
            onOpenCommunityHub={() => openCommunityHub("dashboard")}
            onOpenRightsHub={() => openRightsHub("dashboard")}
            onOpenEmergencySupport={() => openEmergencySupport("dashboard")}
            onOpenJusticeHub={() => openJusticeHub("dashboard")}
            onBackHome={() => {
              setActivePage("home");
              history.replaceState(null, "", window.location.pathname + window.location.search);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : activePage === "community" ? (
          <>
            <CommunityHub
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              onRequireLogin={requireLogin}
              onBackHome={returnFromService}
            />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "lawyers" ? (
          <>
            <LawyerHub
              preferredCity="Delhi"
              initialTab={lawyerTab}
              isLoggedIn={isLoggedIn}
              onRequireLogin={requireLogin}
              onBackHome={returnFromService}
            />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "rights" ? (
          <>
            <RightsHub
              isLoggedIn={isLoggedIn}
              onRequireLogin={requireLogin}
              onBackHome={returnFromService}
            />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "emergency" ? (
          <>
            <EmergencyHub
              isLoggedIn={isLoggedIn}
              onRequireLogin={requireLogin}
              onOpenLegalAssistant={openLegalAssistant}
              onBackHome={returnFromService}
            />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "justice" ? (
          <>
            <JusticeHub
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              onRequireLogin={requireLogin}
              onBackHome={returnFromService}
              onOpenLegalAssistant={openLegalAssistant}
            />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "legal" ? (
          <>
            <PolicyHub onBackHome={returnFromService} />
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : activePage === "about" ? (
          <>
            <section id="about-full">
              <h2 className="headings">{copy.aboutHeading}</h2>
              <About
                mode="full"
                onBackHome={() => {
                  setActivePage("home");
                  history.replaceState(
                    null,
                    "",
                    window.location.pathname + window.location.search
                  );
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                }}
              />
            </section>
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        ) : (
          <>
            <section id="home">
              <Hero
                onStartConsultation={openLegalAssistant}
                title={copy.heroTitle}
                subtitle={copy.heroSubtitle}
              />
            </section>

            <Line />
            <section id="services">
              <h2 className="headings"> {copy.servicesHeading} </h2>
            </section>

            <Sticky />

            <Services>
              {servicesData.map((service, index) => (
                <Card
                  key={index}
                  title={service.title}
                  description={service.description}
                  image={service.image}
                  BtnTXT={service.BtnTXT}
                  onclick={service.onclick}
                />
              ))}
            </Services>
            <Line />
            <section id="legal-resources">
              <h2 className="headings"> {copy.howHeading} </h2>
              <Hiw />
              <GuidedFlows />
              <Faq />
            </section>

            <section id="impact">
              <ImpactStats />
            </section>

            <section id="about">
              <h2 className="headings"> {copy.aboutHeading} </h2>
              <About mode="summary" onKnowMore={openAboutPage} />
            </section>
            <section id="feedback">
              <FeedbackForm />
            </section>
            <section>
              <Footer onOpenLegalPolicies={openLegalPolicies} />
            </section>
          </>
        )}
      </Suspense>

      {showLogin && <div className="blur-overlay" />}
      {showLogin && (
        <Suspense fallback={null}>
          <LogInOut
            toggleLogin={toggleLogin}
            onAuthSuccess={handleAuthSuccess}
            onOpenLawyerRegister={() => openLawyerHub("register")}
          />
        </Suspense>
      )}
    </>
  );
}

export default App;
