import { useEffect, useMemo, useState } from "react";
import "./LawyerHub.css";
import { searchOnlineLawyers } from "../../services/legalApi";
import { INDIA_STATES_29, STATE_DISTRICT_MAP } from "./indiaGeoData";
import { addNotification } from "../../utils/notifications";

const STORAGE_KEY = "nayay-setu-lawyers";
const CURRENT_USER_KEY = "nayay-setu-current-user";
const SAVED_LAWYERS_KEY_PREFIX = "nayay-setu-saved-lawyers";
const SAVED_LAWYER_PROFILES_KEY_PREFIX = "nayay-setu-saved-lawyer-profiles";
const ALL_STATES_OPTION = "All States";
const ALL_DISTRICTS_OPTION = "All Districts";

const CATEGORIES = [
  "Criminal Lawyer",
  "Family Lawyer",
  "Property Lawyer",
  "Corporate Lawyer",
  "Cyber Lawyer",
  "Labour Lawyer",
];

const makeAvatar = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=111111&color=ffffff&rounded=true&bold=true`;

const normalizeCategory = (field = "") => {
  if (!field) return field;
  if (CATEGORIES.includes(field)) return field;
  return field.replace(/ law$/i, " Lawyer");
};

const BASE_LAWYERS = [
  {
    id: "d1",
    name: "Adv. Ritu Sharma",
    field: "Family Lawyer",
    district: "Delhi",
    state: "Delhi",
    experience: "8 years",
    phone: "9876543210",
    email: "ritu.sharma@nayaysetu.in",
    avatar: makeAvatar("Ritu Sharma"),
    barCouncilNo: "D-2017-4412",
    enrollmentYear: "2017",
    stateBarCouncil: "Delhi",
    officeAddress: "Tis Hazari Court Complex, Delhi",
    docsVerified: true,
    verificationChecks: {
      phoneOtpVerified: true,
      emailOtpVerified: true,
      enrollmentVerified: true,
      ecourtsVerified: true,
      kanoonVerified: true,
      officeVerified: true,
      reputationVerified: true,
      redFlagsCleared: true,
    },
    verificationSource: "eCourts Appearance Index / Indian Kanoon Index",
  },
  {
    id: "d2",
    name: "Adv. Arjun Mehta",
    field: "Criminal Lawyer",
    district: "Mumbai",
    state: "Maharashtra",
    experience: "11 years",
    phone: "9811122233",
    email: "arjun.mehta@nayaysetu.in",
    avatar: makeAvatar("Arjun Mehta"),
    barCouncilNo: "MH-2014-9921",
    enrollmentYear: "2014",
    stateBarCouncil: "Maharashtra",
    officeAddress: "Fort Area, Mumbai",
    docsVerified: true,
    verificationChecks: {
      phoneOtpVerified: true,
      emailOtpVerified: true,
      enrollmentVerified: true,
      ecourtsVerified: true,
      kanoonVerified: true,
      officeVerified: true,
      reputationVerified: true,
      redFlagsCleared: true,
    },
    verificationSource: "eCourts Appearance Index / Indian Kanoon Index",
  },
  {
    id: "d3",
    name: "Adv. Kavya Rao",
    field: "Cyber Lawyer",
    district: "Bengaluru Urban",
    state: "Karnataka",
    experience: "6 years",
    phone: "9898981212",
    email: "kavya.rao@nayaysetu.in",
    avatar: makeAvatar("Kavya Rao"),
    barCouncilNo: "KA-2019-1233",
    enrollmentYear: "2019",
    stateBarCouncil: "Karnataka",
    officeAddress: "City Civil Court Road, Bengaluru",
    docsVerified: true,
    verificationChecks: {
      phoneOtpVerified: true,
      emailOtpVerified: true,
      enrollmentVerified: true,
      ecourtsVerified: true,
      kanoonVerified: false,
      officeVerified: true,
      reputationVerified: true,
      redFlagsCleared: true,
    },
    verificationSource: "eCourts Appearance Index",
  },
];

const FIRST_NAMES = [
  "Aarav", "Vihaan", "Aditya", "Reyansh", "Ishaan", "Arjun", "Kabir", "Rohan",
  "Aisha", "Ananya", "Saanvi", "Ira", "Diya", "Kavya", "Meera", "Riya",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Singh", "Gupta", "Mehta", "Joshi", "Khan", "Rao",
  "Nair", "Patel", "Iyer", "Yadav", "Agarwal", "Chauhan", "Saxena", "Das",
];
const DISTRICT_SEED = [
  "Delhi",
  "Mumbai",
  "Bengaluru Urban",
  "Hyderabad",
  "Chennai",
  "Kolkata",
];
const CITY_STATE = {
  Delhi: "Delhi",
  Mumbai: "Maharashtra",
  "Bengaluru Urban": "Karnataka",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  Kolkata: "West Bengal",
};
const STATE_PREFIX = {
  Delhi: "D",
  Maharashtra: "MH",
  Karnataka: "KA",
  Telangana: "TG",
  "Tamil Nadu": "TN",
  "West Bengal": "WB",
};

const TRUST_WEIGHTS = {
  docsVerified: 24,
  enrollmentVerified: 20,
  ecourtsVerified: 20,
  kanoonVerified: 8,
  officeVerified: 10,
  reputationVerified: 10,
  redFlagsCleared: 8,
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const calculateTrustScore = (lawyer) => {
  const checks = lawyer.verificationChecks || {};
  let score = 0;

  if (lawyer.docsVerified) score += TRUST_WEIGHTS.docsVerified;
  if (checks.enrollmentVerified) score += TRUST_WEIGHTS.enrollmentVerified;
  if (checks.ecourtsVerified) score += TRUST_WEIGHTS.ecourtsVerified;
  if (checks.kanoonVerified) score += TRUST_WEIGHTS.kanoonVerified;
  if (checks.officeVerified) score += TRUST_WEIGHTS.officeVerified;
  if (checks.reputationVerified) score += TRUST_WEIGHTS.reputationVerified;
  if (checks.redFlagsCleared) score += TRUST_WEIGHTS.redFlagsCleared;

  return Math.min(100, Math.max(0, Math.round(score)));
};

const getTrustLevel = (score) => {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
};

const makeSelectionKey = (lawyer, source = "local") =>
  `${source}:${lawyer.id || lawyer.sourceUrl || lawyer.email || lawyer.name}`;

const getMemberStorageSuffix = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    if (!currentUser) return "";
    return (currentUser.email || currentUser.username || "").toLowerCase();
  } catch {
    return "";
  }
};

const getSavedLawyersStorageKey = () => {
  const suffix = getMemberStorageSuffix();
  return suffix ? `${SAVED_LAWYERS_KEY_PREFIX}:${suffix}` : "";
};

const getSavedLawyerProfilesStorageKey = () => {
  const suffix = getMemberStorageSuffix();
  return suffix ? `${SAVED_LAWYER_PROFILES_KEY_PREFIX}:${suffix}` : "";
};

const hashSeed = (value = "") =>
  String(value)
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

const getPerformanceMetrics = (lawyer) => {
  const saved = lawyer.performance || lawyer.profileMetrics || {};
  const seed = hashSeed(`${lawyer.id || lawyer.sourceUrl || lawyer.name || "lawyer"}`);
  const solvedCases = saved.solvedCases ?? 40 + (seed % 420);
  const avgDaysPerCase = saved.avgDaysPerCase ?? 15 + (seed % 70);
  const consistencyRatingRaw = saved.consistencyRating ?? 3.4 + (seed % 16) / 10;
  const activeCases = saved.activeCases ?? 5 + (seed % 55);

  return {
    solvedCases,
    avgDaysPerCase,
    consistencyRating: Math.min(5, Math.max(1, Number(consistencyRatingRaw.toFixed(1)))),
    activeCases,
  };
};

const buildMockLawyers = (countPerCategory = 10) => {
  const list = [];
  let serial = 0;

  // Evenly distributes generated advocates across each legal category.
  CATEGORIES.forEach((field, categoryIndex) => {
    for (let i = 0; i < countPerCategory; i += 1) {
      serial += 1;
      const seed = categoryIndex * countPerCategory + i;
      const first = FIRST_NAMES[seed % FIRST_NAMES.length];
      const last = LAST_NAMES[(seed * 3) % LAST_NAMES.length];
      const district = DISTRICT_SEED[seed % DISTRICT_SEED.length];
      const state = CITY_STATE[district] || "Maharashtra";
      const year = 2010 + (seed % 14);
      const docsVerified = seed % 7 !== 0;
      const ecourtsVerified = seed % 5 !== 0;
      const enrollmentVerified = seed % 6 !== 0;
      const name = `Adv. ${first} ${last}`;
      const phone = `9${String(700000000 + seed).slice(-9)}`;

      list.push({
        id: `m-${serial}`,
        name,
        field: normalizeCategory(field),
        district,
        state,
        city: district,
        experience: `${2 + (seed % 18)} years`,
        phone,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${serial}@nayaysetu.in`,
        avatar: makeAvatar(`${first} ${last}`),
        barCouncilNo: `${STATE_PREFIX[state] || "D"}-${year}-${4300 + serial}`,
        enrollmentYear: String(year),
        stateBarCouncil: state,
        officeAddress: `${district} District Court Complex`,
        docsVerified,
        verificationChecks: {
          phoneOtpVerified: true,
          emailOtpVerified: true,
          enrollmentVerified,
          ecourtsVerified,
          kanoonVerified: seed % 2 === 0,
          officeVerified: true,
          reputationVerified: seed % 3 !== 0,
          redFlagsCleared: seed % 4 !== 0,
        },
        verificationSource: ecourtsVerified ? "eCourts Appearance Index" : "",
      });
    }
  });

  return list;
};

const DEFAULT_LAWYERS = [...BASE_LAWYERS, ...buildMockLawyers(10)];
const INITIAL_FORM = {
  name: "",
  field: CATEGORIES[0],
  district: "",
  experience: "",
  phone: "",
  email: "",
  barCouncilNo: "",
  enrollmentYear: "",
  stateBarCouncil: INDIA_STATES_29[0],
  officeAddress: "",
  aadhaarNo: "",
  barCouncilCard: null,
  aadhaarCard: null,
};

function LawyerHub({
  preferredCity = "Delhi",
  initialTab = "find",
  isLoggedIn,
  onRequireLogin,
  onBackHome,
}) {
  const [activeTab, setActiveTab] = useState(
    initialTab === "register" ? "register" : "find"
  );
  const [lawyers, setLawyers] = useState(DEFAULT_LAWYERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedField, setSelectedField] = useState("All Fields");
  const [selectedState, setSelectedState] = useState(ALL_STATES_OPTION);
  const [selectedDistrict, setSelectedDistrict] = useState(ALL_DISTRICTS_OPTION);
  const [error, setError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneOtpInput, setPhoneOtpInput] = useState("");
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [onlineLawyers, setOnlineLawyers] = useState([]);
  const [isOnlineSearching, setIsOnlineSearching] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState("");
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);
  const [selectedLawyerKey, setSelectedLawyerKey] = useState("");
  const [savedLawyerKeys, setSavedLawyerKeys] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    // Normalizes historical localStorage entries to current schema.
    const normalizeLawyer = (lawyer) => ({
      ...lawyer,
      district: lawyer.district || lawyer.city || "",
      state:
        lawyer.state ||
        lawyer.stateBarCouncil ||
        CITY_STATE[lawyer.district || lawyer.city] ||
        "",
      field: normalizeCategory(lawyer.field || ""),
      city: lawyer.city || lawyer.district || "",
      docsVerified:
        typeof lawyer.docsVerified === "boolean"
          ? lawyer.docsVerified
          : Boolean(lawyer.verified),
      enrollmentYear: lawyer.enrollmentYear || "",
      stateBarCouncil:
        lawyer.stateBarCouncil ||
        lawyer.state ||
        INDIA_STATES_29[0],
      officeAddress: lawyer.officeAddress || "",
      avatar: lawyer.avatar || makeAvatar(lawyer.name || "Advocate"),
      verificationChecks: {
        phoneOtpVerified: lawyer.verificationChecks?.phoneOtpVerified || false,
        emailOtpVerified: lawyer.verificationChecks?.emailOtpVerified || false,
        enrollmentVerified: lawyer.verificationChecks?.enrollmentVerified || false,
        ecourtsVerified: lawyer.verificationChecks?.ecourtsVerified || false,
        kanoonVerified: lawyer.verificationChecks?.kanoonVerified || false,
        officeVerified: lawyer.verificationChecks?.officeVerified || false,
        reputationVerified: lawyer.verificationChecks?.reputationVerified || false,
        redFlagsCleared: lawyer.verificationChecks?.redFlagsCleared || false,
      },
      verificationSource: lawyer.verificationSource || "",
      lastVerifiedOn: lawyer.lastVerifiedOn || todayIso(),
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLawyers([...DEFAULT_LAWYERS, ...parsed.map(normalizeLawyer)]);
        }
      } catch {
        setLawyers(DEFAULT_LAWYERS);
      }
    }
  }, []);

  useEffect(() => {
    setSelectedState(ALL_STATES_OPTION);
    setSelectedDistrict(preferredCity || ALL_DISTRICTS_OPTION);
  }, [preferredCity]);

  useEffect(() => {
    setActiveTab(initialTab === "register" ? "register" : "find");
  }, [initialTab]);

  useEffect(() => {
    if (!isLoggedIn) {
      setSavedLawyerKeys([]);
      return;
    }

    const storageKey = getSavedLawyersStorageKey();
    if (!storageKey) {
      setSavedLawyerKeys([]);
      return;
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      setSavedLawyerKeys(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedLawyerKeys([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab !== "register") return;
    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
    } catch {
      currentUser = null;
    }
    if (!currentUser) return;
    setForm((prev) => ({
      ...prev,
      name: currentUser.displayName || currentUser.username || prev.name,
      email: currentUser.email || prev.email,
    }));
  }, [activeTab]);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim();
    const shouldSearchOnline =
      activeTab === "find" &&
      (normalizedSearch.length >= 2 ||
        selectedField !== "All Fields" ||
        selectedState !== ALL_STATES_OPTION ||
        selectedDistrict !== ALL_DISTRICTS_OPTION);

    if (!shouldSearchOnline) {
      setOnlineLawyers([]);
      setOnlineSearchError("");
      setHasSearchedOnline(false);
      setIsOnlineSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsOnlineSearching(true);
      setOnlineSearchError("");
      try {
        const response = await searchOnlineLawyers({
          query: normalizedSearch,
          field: selectedField === "All Fields" ? "" : selectedField,
          state: selectedState === ALL_STATES_OPTION ? "" : selectedState,
          district:
            selectedDistrict === ALL_DISTRICTS_OPTION ? "" : selectedDistrict,
        });

        if (cancelled) return;

        const nextList = Array.isArray(response?.lawyers) ? response.lawyers : [];
        const deduped = nextList.filter(
          (item, index, arr) =>
            arr.findIndex((x) => x.sourceUrl === item.sourceUrl) === index
        );

        setOnlineLawyers(deduped);
        setHasSearchedOnline(true);
      } catch {
        if (cancelled) return;
        setOnlineLawyers([]);
        setHasSearchedOnline(true);
        setOnlineSearchError(
          "Could not fetch online lawyer listings right now."
        );
      } finally {
        if (!cancelled) {
          setIsOnlineSearching(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeTab,
    searchTerm,
    selectedDistrict,
    selectedField,
    selectedState,
  ]);

  const groupedLawyers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return lawyers.filter((lawyer) => {
      const district = lawyer.district || lawyer.city || "";
      const state = lawyer.state || lawyer.stateBarCouncil || "";
      const stateMatch =
        selectedState === ALL_STATES_OPTION || state === selectedState;
      const districtMatch =
        selectedDistrict === ALL_DISTRICTS_OPTION ||
        district === selectedDistrict;
      const textMatch =
        !normalizedSearch ||
        lawyer.name.toLowerCase().includes(normalizedSearch) ||
        lawyer.field.toLowerCase().includes(normalizedSearch) ||
        district.toLowerCase().includes(normalizedSearch) ||
        state.toLowerCase().includes(normalizedSearch);

      return stateMatch && districtMatch && textMatch;
    });
  }, [lawyers, searchTerm, selectedDistrict, selectedState]);

  const fieldCounts = useMemo(() => {
    const counts = { "All Fields": groupedLawyers.length };
    CATEGORIES.forEach((category) => {
      counts[category] = groupedLawyers.filter(
        (lawyer) => lawyer.field === category
      ).length;
    });
    return counts;
  }, [groupedLawyers]);

  const groupedLawyerSections = useMemo(() => {
    const scopedLawyers =
      selectedField === "All Fields"
        ? groupedLawyers
        : groupedLawyers.filter((lawyer) => lawyer.field === selectedField);
    const categoriesToRender =
      selectedField === "All Fields" ? CATEGORIES : [selectedField];

    return categoriesToRender.map((category) => ({
      category,
      items: scopedLawyers.filter((lawyer) => lawyer.field === category),
    }));
  }, [groupedLawyers, selectedField]);

  const visibleLocalLawyers = useMemo(
    () => groupedLawyerSections.flatMap((group) => group.items),
    [groupedLawyerSections]
  );

  const availableLawyerKeys = useMemo(() => {
    const localKeys = visibleLocalLawyers.map((lawyer) =>
      makeSelectionKey(lawyer, "local")
    );
    const onlineKeys = onlineLawyers.map((lawyer) =>
      makeSelectionKey(lawyer, "online")
    );
    return [...localKeys, ...onlineKeys];
  }, [visibleLocalLawyers, onlineLawyers]);

  const selectedLawyerEntry = useMemo(() => {
    if (!selectedLawyerKey) return null;
    const [source] = selectedLawyerKey.split(":");
    const sourceList = source === "online" ? onlineLawyers : visibleLocalLawyers;
    const lawyer =
      sourceList.find(
        (item) => makeSelectionKey(item, source === "online" ? "online" : "local") === selectedLawyerKey
      ) || null;
    if (!lawyer) return null;
    return { source: source === "online" ? "online" : "local", lawyer };
  }, [onlineLawyers, selectedLawyerKey, visibleLocalLawyers]);

  const selectedLawyer = selectedLawyerEntry?.lawyer || null;
  const selectedLawyerSource = selectedLawyerEntry?.source || "local";
  const selectedLawyerSaveKey = selectedLawyer
    ? makeSelectionKey(selectedLawyer, selectedLawyerSource)
    : "";
  const selectedLawyerSaved = selectedLawyerSaveKey
    ? savedLawyerKeys.includes(selectedLawyerSaveKey)
    : false;
  const selectedLawyerChecks = selectedLawyer?.verificationChecks || {};
  const selectedLawyerFullyVerified = Boolean(
    selectedLawyer &&
      selectedLawyer.docsVerified &&
      selectedLawyerChecks.ecourtsVerified &&
      selectedLawyerChecks.enrollmentVerified
  );
  const selectedLawyerTrustScore = selectedLawyer
    ? calculateTrustScore(selectedLawyer)
    : 0;
  const selectedLawyerTrustLevel = getTrustLevel(selectedLawyerTrustScore);
  const selectedLawyerMetrics = selectedLawyer
    ? getPerformanceMetrics(selectedLawyer)
    : null;

  const stateOptions = INDIA_STATES_29;

  const districtOptions = useMemo(() => {
    if (selectedState !== ALL_STATES_OPTION) {
      const stateDistricts = STATE_DISTRICT_MAP[selectedState] || [];
      const lawyerDistricts = lawyers
        .filter((lawyer) => (lawyer.state || lawyer.stateBarCouncil) === selectedState)
        .map((lawyer) => lawyer.district || lawyer.city || "")
        .filter(Boolean);
      return [...new Set([...stateDistricts, ...lawyerDistricts])].sort((a, b) =>
        a.localeCompare(b)
      );
    }

    const mapDistricts = Object.values(STATE_DISTRICT_MAP).flat();
    const lawyerDistricts = lawyers
      .map((lawyer) => lawyer.district || lawyer.city || "")
      .filter(Boolean);
    return [...new Set([...mapDistricts, ...lawyerDistricts])].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [lawyers, selectedState]);

  useEffect(() => {
    if (selectedDistrict === ALL_DISTRICTS_OPTION) return;
    if (!districtOptions.includes(selectedDistrict)) {
      setSelectedDistrict(ALL_DISTRICTS_OPTION);
    }
  }, [districtOptions, selectedDistrict]);

  useEffect(() => {
    if (activeTab !== "find") return;
    if (!selectedLawyerKey) return;
    if (!availableLawyerKeys.includes(selectedLawyerKey)) setSelectedLawyerKey("");
  }, [activeTab, availableLawyerKeys, selectedLawyerKey]);

  const visibleLawyerCount = useMemo(
    () =>
      groupedLawyerSections.reduce((total, group) => total + group.items.length, 0),
    [groupedLawyerSections]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "phone") {
      setPhoneOtpVerified(false);
      setPhoneOtpCode("");
      setPhoneOtpInput("");
    }
    if (name === "email") {
      setEmailOtpVerified(false);
      setEmailOtpCode("");
      setEmailOtpInput("");
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const generateOtp = () =>
    String(Math.floor(100000 + Math.random() * 900000));

  const sendPhoneOtp = () => {
    const phoneValid = /^[6-9]\d{9}$/.test(form.phone.trim());
    if (!phoneValid) {
      setError("Enter valid 10-digit mobile number before OTP.");
      return;
    }
    setError("");
    const otp = generateOtp();
    setPhoneOtpCode(otp);
    setPhoneOtpVerified(false);
    setVerificationNotice(`Phone OTP sent (demo): ${otp}`);
  };

  const verifyPhoneOtp = () => {
    if (!phoneOtpCode) {
      setError("Send phone OTP first.");
      return;
    }
    if (phoneOtpInput.trim() !== phoneOtpCode) {
      setError("Invalid phone OTP.");
      return;
    }
    setError("");
    setPhoneOtpVerified(true);
    setVerificationNotice("Phone OTP verified.");
  };

  const sendEmailOtp = () => {
    const emailValid = /^\S+@\S+\.\S+$/.test(form.email.trim());
    if (!emailValid) {
      setError("Enter valid email before OTP.");
      return;
    }
    setError("");
    const otp = generateOtp();
    setEmailOtpCode(otp);
    setEmailOtpVerified(false);
    setVerificationNotice(`Email OTP sent (demo): ${otp}`);
  };

  const verifyEmailOtp = () => {
    if (!emailOtpCode) {
      setError("Send email OTP first.");
      return;
    }
    if (emailOtpInput.trim() !== emailOtpCode) {
      setError("Invalid email OTP.");
      return;
    }
    setError("");
    setEmailOtpVerified(true);
    setVerificationNotice("Email OTP verified.");
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    setForm((prev) => ({ ...prev, [name]: files?.[0] || null }));
  };

  const toggleSaveLawyer = (lawyer, source = "local") => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }

    const storageKey = getSavedLawyersStorageKey();
    const profileStorageKey = getSavedLawyerProfilesStorageKey();
    if (!storageKey || !profileStorageKey) return;

    const targetKey = makeSelectionKey(lawyer, source);
    const isSaved = savedLawyerKeys.includes(targetKey);
    const nextSaved = isSaved
      ? savedLawyerKeys.filter((item) => item !== targetKey)
      : [targetKey, ...savedLawyerKeys];

    setSavedLawyerKeys(nextSaved);
    localStorage.setItem(storageKey, JSON.stringify(nextSaved));

    let profileMap = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(profileStorageKey) || "{}");
      profileMap = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      profileMap = {};
    }

    if (isSaved) {
      delete profileMap[targetKey];
    } else {
      const slug =
        String(lawyer.name || lawyer.email || "lawyer")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || "lawyer";
      profileMap[targetKey] = {
        id: lawyer.id || "",
        name: lawyer.name || "Advocate",
        field: lawyer.field || "General Lawyer",
        city: lawyer.district || lawyer.city || "Not specified",
        state: lawyer.state || lawyer.stateBarCouncil || "",
        experience: lawyer.experience || "",
        phone: lawyer.phone || "",
        email: lawyer.email || "",
        appointmentEmail: lawyer.email || "",
        sourceUrl: lawyer.sourceUrl || "",
        verified:
          source === "online"
            ? false
            : Boolean(
                lawyer.docsVerified &&
                  lawyer.verificationChecks?.ecourtsVerified &&
                  lawyer.verificationChecks?.enrollmentVerified
              ),
        trustScore: source === "online" ? 0 : calculateTrustScore(lawyer),
        social: {
          linkedin: `https://www.linkedin.com/in/${slug}`,
          x: `https://x.com/${slug.replace(/-/g, "")}`,
          instagram: `https://www.instagram.com/${slug.replace(/-/g, "")}`,
          facebook: `https://www.facebook.com/${slug.replace(/-/g, ".")}`,
          website: lawyer.sourceUrl || `https://${slug}.lawyer`,
        },
        lastContact: "Just now",
      };
    }

    localStorage.setItem(profileStorageKey, JSON.stringify(profileMap));
    setVerificationNotice(
      isSaved
        ? `${lawyer.name} removed from saved lawyers.`
        : `${lawyer.name} saved to your profile.`
    );
    addNotification(
      isSaved
        ? `${lawyer.name} removed from your saved lawyers.`
        : `${lawyer.name} saved to your lawyer list.`,
      { type: isSaved ? "info" : "success" }
    );
  };

  const handleRegister = (event) => {
    event.preventDefault();
    setError("");

    const phoneValid = /^[6-9]\d{9}$/.test(form.phone.trim());
    const aadhaarValid = /^\d{12}$/.test(form.aadhaarNo.trim());
    const barCouncilValid = form.barCouncilNo.trim().length >= 6;
    const yearValid = /^(19|20)\d{2}$/.test(form.enrollmentYear.trim());
    const docsUploaded = form.barCouncilCard && form.aadhaarCard;
    const officeValid = form.officeAddress.trim().length >= 10;

    if (!phoneValid) {
      setError("Enter valid 10-digit mobile number.");
      return;
    }
    if (!aadhaarValid) {
      setError("Enter valid 12-digit Aadhaar number.");
      return;
    }
    if (!barCouncilValid) {
      setError("Enter valid Bar Council registration number.");
      return;
    }
    if (!yearValid) {
      setError("Enter valid enrollment year.");
      return;
    }
    if (!officeValid) {
      setError("Enter a complete physical office address.");
      return;
    }
    if (!docsUploaded) {
      setError("Upload Bar Council card and Aadhaar card for verification.");
      return;
    }
    if (!phoneOtpVerified || !emailOtpVerified) {
      setError("Verify both phone and email via OTP before registration.");
      return;
    }

    const newLawyer = {
      id: `u-${Date.now()}`,
      name: form.name.trim(),
      field: form.field,
      district: form.district.trim(),
      state: form.stateBarCouncil,
      city: form.district.trim(),
      experience: form.experience.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      avatar: makeAvatar(form.name.trim()),
      barCouncilNo: form.barCouncilNo.trim(),
      enrollmentYear: form.enrollmentYear.trim(),
      stateBarCouncil: form.stateBarCouncil,
      officeAddress: form.officeAddress.trim(),
      aadhaarMasked: `********${form.aadhaarNo.trim().slice(-4)}`,
      barCouncilCardName: form.barCouncilCard.name,
      aadhaarCardName: form.aadhaarCard.name,
      docsVerified: true,
      verificationChecks: {
        phoneOtpVerified: true,
        emailOtpVerified: true,
        enrollmentVerified: true,
        ecourtsVerified: false,
        kanoonVerified: false,
        officeVerified: true,
        reputationVerified: false,
        redFlagsCleared: false,
      },
      verificationSource: "",
      lastVerifiedOn: todayIso(),
    };

    const customLawyers = [...lawyers.filter((l) => l.id.startsWith("u-")), newLawyer];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customLawyers));
    setLawyers([...DEFAULT_LAWYERS, ...customLawyers]);
    // Promote current authenticated user to lawyer role when self-registering.
    try {
      const currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
      if (currentUser && currentUser.email?.toLowerCase() === newLawyer.email.toLowerCase()) {
        const nextCurrent = { ...currentUser, role: "lawyer" };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(nextCurrent));
        window.dispatchEvent(new Event("auth-updated"));
      }
      const users = JSON.parse(localStorage.getItem("nayay-setu-users") || "[]");
      if (Array.isArray(users)) {
        const nextUsers = users.map((user) =>
          user.email?.toLowerCase() === newLawyer.email.toLowerCase()
            ? { ...user, role: "lawyer" }
            : user
        );
        localStorage.setItem("nayay-setu-users", JSON.stringify(nextUsers));
      }
    } catch {
      // Best-effort role update only.
    }

    setForm({ ...INITIAL_FORM });
    setActiveTab("find");
    setPhoneOtpCode("");
    setPhoneOtpInput("");
    setPhoneOtpVerified(false);
    setEmailOtpCode("");
    setEmailOtpInput("");
    setEmailOtpVerified(false);
    setVerificationNotice(
      "Registered with manual checks. Complete eCourts, Indian Kanoon, reputation and red-flag checks."
    );
    addNotification(
      "Lawyer registration submitted. Verification checks are now in progress.",
      { type: "success" }
    );
  };

  return (
    <section
      className={`lawyer-page${activeTab === "find" ? " is-directory-view" : ""}`}
    >
      <div className={`lawyer-hub-modal${activeTab === "find" ? " is-directory" : ""}`}>
        <div className="lawyer-hub-header lawyer-hub-header-register">
          <h3>{activeTab === "find" ? "Lawyer Directory" : "Lawyer Registration"}</h3>
          <button
            type="button"
            className="lawyer-form-close"
            aria-label="Close lawyer section"
            onClick={onBackHome}
          >
            X
          </button>
        </div>

        <div className="lawyer-hub-tabs">
          <button
            type="button"
            className={activeTab === "find" ? "active" : ""}
            onClick={() => setActiveTab("find")}
          >
            Lawyer Directory
          </button>
          <button
            type="button"
            className={activeTab === "register" ? "active" : ""}
            onClick={() => setActiveTab("register")}
          >
            Register as Lawyer
          </button>
        </div>

        {activeTab === "find" && (
          <div className="lawyer-hub-list">
            <div className="lawyer-filters">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by lawyer name, state, or district"
              />
              <select
                value={selectedState}
                onChange={(event) => {
                  setSelectedState(event.target.value);
                  setSelectedDistrict(ALL_DISTRICTS_OPTION);
                }}
              >
                <option>{ALL_STATES_OPTION}</option>
                {stateOptions.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <select
                value={selectedDistrict}
                onChange={(event) => setSelectedDistrict(event.target.value)}
              >
                <option>{ALL_DISTRICTS_OPTION}</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`lawyer-directory-layout${
                selectedLawyer ? " has-profile-panel" : ""
              }`}
            >
              <aside className="lawyer-field-rail">
                <h4>Practice Fields</h4>
                <div className="lawyer-field-menu">
                  <button
                    type="button"
                    className={selectedField === "All Fields" ? "is-active" : ""}
                    onClick={() => setSelectedField("All Fields")}
                  >
                    <span>All Lawyers</span>
                    <strong>{fieldCounts["All Fields"] || 0}</strong>
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={selectedField === category ? "is-active" : ""}
                      onClick={() => setSelectedField(category)}
                    >
                      <span>{category}</span>
                      <strong>{fieldCounts[category] || 0}</strong>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="lawyer-results-panel">
                <p className="lawyer-count">
                  Showing {visibleLawyerCount} advocates (Total {lawyers.length})
                </p>
                {!isLoggedIn && (
                  <p className="lawyer-preview-note">
                    Preview mode: you can browse lawyers without login. Login is
                    required for full profile details.
                  </p>
                )}
                <div className="lawyer-guidance">
                  Verify using: State Bar Council enrollment, eCourts appearances,
                  Indian Kanoon history, physical office, and reputation checks.
                  Red flags: guaranteed results, cash-only payment without receipt,
                  refusal to sign Vakalatnama.
                </div>

                <h4 className="lawyer-selected-field">
                  {selectedField === "All Fields"
                    ? "All Lawyer Fields"
                    : selectedField}
                </h4>

                {groupedLawyerSections.map((group) => (
                  <div key={group.category} className="lawyer-group">
                    {selectedField === "All Fields" && <h4>{group.category}</h4>}
                    {group.items.length === 0 && (
                      <p className="lawyer-empty">No verified lawyers yet.</p>
                    )}
                    <div className="lawyer-cards">
                      {group.items.map((lawyer) => {
                        const checks = lawyer.verificationChecks || {};
                        const trustScore = calculateTrustScore(lawyer);
                        const trustLevel = getTrustLevel(trustScore);
                        const fullyVerified =
                          lawyer.docsVerified &&
                          checks.ecourtsVerified &&
                          checks.enrollmentVerified;
                        const selectionKey = makeSelectionKey(lawyer, "local");
                        return (
                          <article
                            key={lawyer.id}
                            className={`lawyer-card ${
                              selectedLawyerKey === selectionKey ? "is-selected" : ""
                            }`}
                          >
                            <div className="lawyer-profile">
                              <img
                                className="lawyer-avatar"
                                src={lawyer.avatar || makeAvatar(lawyer.name)}
                                alt={lawyer.name}
                                loading="lazy"
                              />
                              <div className="lawyer-meta">
                                <strong>{lawyer.name}</strong>
                                <p>{lawyer.field}</p>
                                <p>
                                  {lawyer.district || lawyer.city || "N/A"} |{" "}
                                  {lawyer.state || lawyer.stateBarCouncil || "N/A"} |{" "}
                                  {lawyer.experience}
                                </p>
                              </div>
                            </div>
                            <div className="lawyer-status-row">
                              <button
                                type="button"
                                className={`verify-badge ${
                                  fullyVerified ? "is-verified" : "not-verified"
                                }`}
                              >
                                {fullyVerified ? "Verified" : "Not Verified"}
                              </button>
                              <div className="trust-score-wrap">
                                <span className={`trust-score-pill ${trustLevel}`}>
                                  Trust Score: {trustScore}/100
                                </span>
                              </div>
                            </div>
                            <p className="lawyer-id">
                              Bar Council: {lawyer.barCouncilNo || "N/A"} (
                              {lawyer.enrollmentYear || "N/A"})
                            </p>
                            <p className="lawyer-id">
                              State Council: {lawyer.stateBarCouncil || "N/A"}
                            </p>
                            <div className="lawyer-card-actions">
                              <button
                                type="button"
                                onClick={() => setSelectedLawyerKey(selectionKey)}
                              >
                                Profile
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isOnlineSearching && (
                  <p className="lawyer-online-status">
                    Searching online lawyers outside the local directory...
                  </p>
                )}
                {onlineSearchError && (
                  <p className="lawyer-online-error">{onlineSearchError}</p>
                )}
                {onlineLawyers.length > 0 && (
                  <div className="lawyer-group lawyer-group-online">
                    <h4>Online Listings</h4>
                    <p className="lawyer-online-note">
                      These matches are fetched from public web listings and are
                      not yet verified by NAYAY-SETU.
                    </p>
                    <div className="lawyer-cards">
                      {onlineLawyers.map((lawyer) => {
                        const selectionKey = makeSelectionKey(lawyer, "online");
                        return (
                          <article
                            key={lawyer.id || lawyer.sourceUrl}
                            className={`lawyer-card lawyer-card-online ${
                              selectedLawyerKey === selectionKey ? "is-selected" : ""
                            }`}
                          >
                            <div className="lawyer-meta">
                              <strong>{lawyer.name}</strong>
                              <p>{lawyer.field || "General Practice"}</p>
                              <p>
                                {lawyer.district || "Various"} |{" "}
                                {lawyer.state || "Various"} | Online listing
                              </p>
                            </div>
                            <button type="button" className="verify-badge not-verified">
                              Not Verified (External)
                            </button>
                            <p className="lawyer-id">
                              {lawyer.summary ||
                                "Open source link to view profile and contact details."}
                            </p>
                            <p className="lawyer-source">
                              Source: {lawyer.source || "web"}{" "}
                            </p>
                            <div className="lawyer-card-actions">
                              <button
                                type="button"
                                onClick={() => setSelectedLawyerKey(selectionKey)}
                              >
                                Profile
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hasSearchedOnline &&
                  !isOnlineSearching &&
                  !onlineSearchError &&
                  onlineLawyers.length === 0 && (
                    <p className="lawyer-online-status">
                      No online listings found for this search.
                    </p>
                  )}
                {verificationNotice && (
                  <p className="lawyer-notice">{verificationNotice}</p>
                )}

                {groupedLawyerSections.every((group) => group.items.length === 0) && (
                  <p className="lawyer-empty lawyer-empty-main">
                    No lawyers found for current search/filter.
                  </p>
                )}
              </div>

              {selectedLawyer && (
                <aside className="lawyer-profile-panel">
                  <div className="lawyer-profile-headline">
                    <h4>Lawyer Profile</h4>
                    <button
                      type="button"
                      className="lawyer-profile-close"
                      onClick={() => setSelectedLawyerKey("")}
                    >
                      Close
                    </button>
                  </div>
                  <>
                    <div className="lawyer-profile-card-head">
                      <img
                        className="lawyer-avatar"
                        src={selectedLawyer.avatar || makeAvatar(selectedLawyer.name)}
                        alt={selectedLawyer.name}
                        loading="lazy"
                      />
                      <div className="lawyer-profile-main">
                        <strong>{selectedLawyer.name}</strong>
                        <p>{selectedLawyer.field || "General Practice"}</p>
                        <p>
                          {selectedLawyer.district ||
                            selectedLawyer.city ||
                            "Various"}{" "}
                          |{" "}
                          {selectedLawyer.state ||
                            selectedLawyer.stateBarCouncil ||
                            "Various"}{" "}
                          | {selectedLawyer.experience || "Experience N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="lawyer-status-row lawyer-status-row-profile">
                      <button
                        type="button"
                        className={`verify-badge ${
                          selectedLawyerSource === "online"
                            ? "not-verified"
                            : selectedLawyerFullyVerified
                              ? "is-verified"
                              : "not-verified"
                        }`}
                      >
                        {selectedLawyerSource === "online"
                          ? "Not Verified (External)"
                          : selectedLawyerFullyVerified
                            ? "Verified"
                            : "Not Verified"}
                      </button>
                      <span
                        className={`trust-score-pill ${
                          selectedLawyerSource === "online"
                            ? "low"
                            : selectedLawyerTrustLevel
                        }`}
                      >
                        Trust Score:{" "}
                        {selectedLawyerSource === "online"
                          ? "N/A"
                          : `${selectedLawyerTrustScore}/100`}
                      </span>
                    </div>

                    <div className="lawyer-profile-grid">
                      <p>
                        <span>Bar Council No.</span>
                        <strong>{selectedLawyer.barCouncilNo || "N/A"}</strong>
                      </p>
                      <p>
                        <span>Enrollment Year</span>
                        <strong>{selectedLawyer.enrollmentYear || "N/A"}</strong>
                      </p>
                      <p>
                        <span>State Council</span>
                        <strong>{selectedLawyer.stateBarCouncil || selectedLawyer.state || "N/A"}</strong>
                      </p>
                      <p>
                        <span>Office Address</span>
                        <strong>{selectedLawyer.officeAddress || "N/A"}</strong>
                      </p>
                    </div>

                    {isLoggedIn ? (
                      <>
                        <div className="lawyer-member-grid">
                          <p>
                            <span>Solved Cases</span>
                            <strong>{selectedLawyerMetrics?.solvedCases ?? "N/A"}</strong>
                          </p>
                          <p>
                            <span>Avg Time / Case</span>
                            <strong>
                              {selectedLawyerMetrics
                                ? `${selectedLawyerMetrics.avgDaysPerCase} days`
                                : "N/A"}
                            </strong>
                          </p>
                          <p>
                            <span>Consistency Rating</span>
                            <strong>
                              {selectedLawyerMetrics
                                ? `${selectedLawyerMetrics.consistencyRating}/5`
                                : "N/A"}
                            </strong>
                          </p>
                          <p>
                            <span>Current Active Cases</span>
                            <strong>{selectedLawyerMetrics?.activeCases ?? "N/A"}</strong>
                          </p>
                        </div>

                        <div className="lawyer-profile-actions">
                          <button
                            type="button"
                            className={`lawyer-save-btn${
                              selectedLawyerSaved ? " is-saved" : ""
                            }`}
                            onClick={() =>
                              toggleSaveLawyer(selectedLawyer, selectedLawyerSource)
                            }
                          >
                            {selectedLawyerSaved ? "Saved Lawyer" : "Save Lawyer"}
                          </button>
                          {selectedLawyer.phone && (
                            <>
                              <a href={`tel:${selectedLawyer.phone}`}>Call</a>
                              <a
                                href={`https://wa.me/91${selectedLawyer.phone}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Message
                              </a>
                            </>
                          )}
                          {selectedLawyer.email && (
                            <a
                              href={`mailto:${selectedLawyer.email}?subject=Appointment Request&body=Hi ${selectedLawyer.name}, I want to schedule an appointment.`}
                            >
                              Appointment
                            </a>
                          )}
                          {selectedLawyer.sourceUrl && (
                            <a href={selectedLawyer.sourceUrl} target="_blank" rel="noreferrer">
                              Open Listing
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="lawyer-member-lock">
                        <p>
                          Additional details like solved cases, average case time,
                          consistency rating, active case load, and direct contact
                          actions are available to logged-in members only.
                        </p>
                        <button
                          type="button"
                          className="lawyer-know-more"
                          onClick={() => onRequireLogin?.()}
                        >
                          Know More
                        </button>
                      </div>
                    )}
                  </>
                </aside>
              )}
            </div>
          </div>
        )}

        {activeTab === "register" && (
          <form className="lawyer-form" onSubmit={handleRegister}>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  required
                />
                <select name="field" value={form.field} onChange={handleChange}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  placeholder="District"
                  required
                />
                <input
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  placeholder="Experience (e.g. 7 years)"
                  required
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Mobile number"
                  required
                />
                <div className="otp-block">
                  <div className="otp-row">
                    <input
                      value={phoneOtpInput}
                      onChange={(event) => setPhoneOtpInput(event.target.value)}
                      placeholder="Enter phone OTP"
                    />
                    <button type="button" onClick={sendPhoneOtp}>
                      Send OTP
                    </button>
                    <button type="button" onClick={verifyPhoneOtp}>
                      Verify
                    </button>
                  </div>
                  <small className={phoneOtpVerified ? "otp-ok" : "otp-pending"}>
                    {phoneOtpVerified ? "Phone verified" : "Phone OTP pending"}
                  </small>
                </div>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  required
                />
                <div className="otp-block">
                  <div className="otp-row">
                    <input
                      value={emailOtpInput}
                      onChange={(event) => setEmailOtpInput(event.target.value)}
                      placeholder="Enter email OTP"
                    />
                    <button type="button" onClick={sendEmailOtp}>
                      Send OTP
                    </button>
                    <button type="button" onClick={verifyEmailOtp}>
                      Verify
                    </button>
                  </div>
                  <small className={emailOtpVerified ? "otp-ok" : "otp-pending"}>
                    {emailOtpVerified ? "Email verified" : "Email OTP pending"}
                  </small>
                </div>
                <input
                  name="barCouncilNo"
                  value={form.barCouncilNo}
                  onChange={handleChange}
                  placeholder="Bar Council registration number"
                  required
                />
                <input
                  name="enrollmentYear"
                  value={form.enrollmentYear}
                  onChange={handleChange}
                  placeholder="Enrollment year (e.g. 2019)"
                  required
                />
                <select
                  name="stateBarCouncil"
                  value={form.stateBarCouncil}
                  onChange={handleChange}
                >
                  {INDIA_STATES_29.map((state) => (
                    <option key={state} value={state}>
                      {state} Bar Council
                    </option>
                  ))}
                </select>
                <input
                  name="officeAddress"
                  value={form.officeAddress}
                  onChange={handleChange}
                  placeholder="Physical office address"
                  required
                />
                <input
                  name="aadhaarNo"
                  value={form.aadhaarNo}
                  onChange={handleChange}
                  placeholder="Aadhaar number (12 digits)"
                  required
                />

                <label>
                  Bar Council Card
                  <input
                    type="file"
                    name="barCouncilCard"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                  />
                </label>
                <label>
                  Aadhaar Card
                  <input
                    type="file"
                    name="aadhaarCard"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                  />
                </label>

                {error && <p className="lawyer-error">{error}</p>}
                <button type="submit" className="lawyer-submit">
                  Verify & Register
                </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default LawyerHub;
