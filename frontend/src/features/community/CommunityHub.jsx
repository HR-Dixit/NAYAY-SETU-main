import { useEffect, useMemo, useState } from "react";
import "./CommunityHub.css";
import {
  addCommunityComment,
  createCommunityDiscussion,
  fetchCommunityData,
  reportCommunityComment,
  reportCommunityDiscussion,
  upvoteCommunityDiscussion,
} from "../../services/legalApi";
import { addNotification } from "../../utils/notifications";

const COMMUNITY_CAPTCHA_ENABLED =
  String(import.meta.env.VITE_COMMUNITY_CAPTCHA_ENABLED || "false").toLowerCase() ===
  "true";
const RECAPTCHA_SITE_KEY = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();
const RECAPTCHA_SCRIPT_ID = "nayay-community-recaptcha";

const INITIAL_STORIES = [
  {
    id: "s1",
    title: "FIR not registered after theft. What should I do next?",
    summary: "Police asked to come later and did not issue complaint receipt.",
    response:
      "Submit written complaint with acknowledgement, then escalate to SP in writing within 24 hours.",
    validatedBy: "Lawyer Verified",
    votes: 34,
    tags: ["FIR", "Police", "Criminal"],
    author: "Anonymous Citizen",
    handle: "@case_watch",
    postedAt: "2h ago",
  },
  {
    id: "s2",
    title: "UPI scam happened 30 minutes ago. First hour checklist?",
    summary: "Money debited after fake support call and remote app install.",
    response:
      "Call 1930 immediately, alert bank for hold, then file cybercrime complaint with transaction evidence.",
    validatedBy: "Moderator Verified",
    votes: 49,
    tags: ["Cyber", "UPI", "Fraud"],
    author: "Riya S.",
    handle: "@cyber_alert",
    postedAt: "5h ago",
  },
  {
    id: "s3",
    title: "Landlord not returning deposit. Can I file directly?",
    summary: "Deposit pending for 4 months without proper deductions breakdown.",
    response:
      "Send legal notice first with payment proof and timeline, then proceed before rent authority/civil forum.",
    validatedBy: "Lawyer Verified",
    votes: 21,
    tags: ["Rent", "Property", "Civil"],
    author: "Tenant Voice",
    handle: "@rental_rights",
    postedAt: "1d ago",
  },
  {
    id: "s4",
    title: "Salary not paid for two months. Where to complain?",
    summary: "Employer stopped replying after promise to clear dues.",
    response:
      "Collect appointment docs, payslips, and chats; file complaint before labour commissioner office.",
    validatedBy: "Volunteer Verified",
    votes: 27,
    tags: ["Labour", "Salary", "Complaint"],
    author: "Worker Help Desk",
    handle: "@labour_line",
    postedAt: "2d ago",
  },
];

const MEETUPS = [
  {
    id: "m1",
    city: "Delhi",
    title: "Know Your Rights: Women Safety",
    date: "22 Feb 2026",
    host: "Nyay Saathi Collective",
    venue: "Lajpat Nagar Community Hall",
    seats: "40 seats",
  },
  {
    id: "m2",
    city: "Mumbai",
    title: "Tenant Rights and Legal Notice Workshop",
    date: "01 Mar 2026",
    host: "Citizen Legal Forum",
    venue: "Andheri Legal Aid Center",
    seats: "55 seats",
  },
  {
    id: "m3",
    city: "Bengaluru",
    title: "Cyber Fraud Response Drill",
    date: "08 Mar 2026",
    host: "Digital Justice Volunteers",
    venue: "Indiranagar Public Library",
    seats: "35 seats",
  },
];

const QA_SESSIONS = [
  {
    id: "q1",
    topic: "Domestic Violence: Immediate Legal Protection",
    date: "24 Feb 2026",
    speaker: "Adv. Ritu Sharma",
    mode: "Live Video",
  },
  {
    id: "q2",
    topic: "Consumer Fraud and Refund Claims",
    date: "03 Mar 2026",
    speaker: "Adv. Arjun Mehta",
    mode: "Community Room",
  },
  {
    id: "q3",
    topic: "FIR, Bail, and First Court Appearance",
    date: "10 Mar 2026",
    speaker: "Adv. Kavya Rao",
    mode: "Hybrid",
  },
];

const VOLUNTEER_GROUPS = [
  {
    id: "v1",
    name: "Nyay Sathi Network",
    type: "NGO",
    focus: "Domestic violence response and court accompaniment",
    location: "Delhi NCR",
    members: "210 volunteers",
  },
  {
    id: "v2",
    name: "Awaaz Legal Collective",
    type: "Community",
    focus: "Labour wage disputes and documentation support",
    location: "Mumbai",
    members: "140 volunteers",
  },
  {
    id: "v3",
    name: "Cyber Rakshak Volunteers",
    type: "NGO",
    focus: "Cyber fraud reporting and digital evidence preservation",
    location: "Bengaluru",
    members: "95 volunteers",
  },
  {
    id: "v4",
    name: "Nari Nyay Circle",
    type: "Community",
    focus: "Women legal rights awareness and helpline navigation",
    location: "Jaipur",
    members: "120 volunteers",
  },
];

const SECTION_OPTIONS = [
  { id: "discussion", label: "Discussion Forum" },
  { id: "meetups", label: "Local Meetups" },
  { id: "qa", label: "Legal Q/A" },
  { id: "volunteers", label: "Volunteer Network" },
];

const EXPERTS = [
  "Adv. Ritu Sharma",
  "Adv. Arjun Mehta",
  "Digital Justice Volunteers",
  "Citizen Legal Forum",
];

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const toErrorMessage = (error, fallback) => {
  const text = String(error?.message || "").trim();
  return text || fallback;
};

function CommunityHub({ isLoggedIn, currentUser, onRequireLogin, onBackHome }) {
  const [activeSection, setActiveSection] = useState("discussion");
  const [stories, setStories] = useState(INITIAL_STORIES);
  const [meetups, setMeetups] = useState(MEETUPS);
  const [qaSessions, setQaSessions] = useState(QA_SESSIONS);
  const [volunteerGroups, setVolunteerGroups] = useState(VOLUNTEER_GROUPS);
  const [experts, setExperts] = useState(EXPERTS);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    if (!COMMUNITY_CAPTCHA_ENABLED || !RECAPTCHA_SITE_KEY) return;
    if (window.grecaptcha?.ready) return;
    if (document.getElementById(RECAPTCHA_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCommunity = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetchCommunityData();
        if (cancelled) return;
        setStories(
          ensureArray(response?.discussions).map((item) => ({
            ...item,
            tags: ensureArray(item.tags),
            comments: ensureArray(item.comments),
            votes: Number(item.votes || 0),
          }))
        );
        setMeetups(ensureArray(response?.meetups));
        setQaSessions(ensureArray(response?.qaSessions));
        setVolunteerGroups(ensureArray(response?.volunteers));
        setExperts(ensureArray(response?.experts));
      } catch {
        if (cancelled) return;
        setLoadError("Community backend is unavailable. Showing cached demo data.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCommunity();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stories;

    return stories.filter((story) => {
      const tagText = ensureArray(story.tags).join(" ").toLowerCase();
      return (
        story.title.toLowerCase().includes(q) ||
        story.summary.toLowerCase().includes(q) ||
        story.response.toLowerCase().includes(q) ||
        tagText.includes(q)
      );
    });
  }, [search, stories]);

  const filteredMeetups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetups;
    return meetups.filter((item) =>
      `${item.city} ${item.title} ${item.host} ${item.venue}`.toLowerCase().includes(q)
    );
  }, [meetups, search]);

  const filteredQa = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return qaSessions;
    return qaSessions.filter((item) =>
      `${item.topic} ${item.speaker} ${item.mode}`.toLowerCase().includes(q)
    );
  }, [qaSessions, search]);

  const filteredVolunteers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return volunteerGroups;
    return volunteerGroups.filter((item) =>
      `${item.name} ${item.type} ${item.focus} ${item.location}`
        .toLowerCase()
        .includes(q)
    );
  }, [search, volunteerGroups]);

  const topStories = useMemo(
    () => [...stories].sort((a, b) => b.votes - a.votes).slice(0, 3),
    [stories]
  );

  const trendingTags = useMemo(() => {
    const counts = {};
    stories.forEach((story) => {
      ensureArray(story.tags).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 6);
  }, [stories]);

  const sectionCounts = {
    discussion: filteredStories.length,
    meetups: filteredMeetups.length,
    qa: filteredQa.length,
    volunteers: filteredVolunteers.length,
  };

  const pushMemberNotification = (text, type = "info") => {
    if (!isLoggedIn) return;
    addNotification(text, { user: currentUser, type });
  };

  const requestCaptchaToken = async (action) => {
    if (!COMMUNITY_CAPTCHA_ENABLED) return "";
    if (!RECAPTCHA_SITE_KEY) {
      throw new Error("Captcha is enabled but site key is missing.");
    }
    const client = window.grecaptcha;
    if (!client?.ready || !client?.execute) {
      throw new Error("Captcha is loading. Please retry.");
    }

    return new Promise((resolve, reject) => {
      client.ready(() => {
        client
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then((token) => {
            if (!token) {
              reject(new Error("Captcha token was not generated."));
              return;
            }
            resolve(token);
          })
          .catch(() => reject(new Error("Captcha verification failed.")));
      });
    });
  };

  const handleMemberAction = (actionLabel) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice(`Login required for ${actionLabel}.`);
      return;
    }
    setNotice(`${actionLabel} feature is enabled for your account.`);
    pushMemberNotification(`${actionLabel} confirmed from Community Hub.`, "success");
  };

  const handleCreateDiscussion = async () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice("Login required for New Discussion.");
      return;
    }

    const title = window.prompt("Add question title");
    if (!title || !title.trim()) return;

    const summary = window.prompt("Add short details for context");
    if (!summary || !summary.trim()) return;

    const tagsRaw = window.prompt("Optional tags (comma-separated)") || "";
    const tags = tagsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);

    try {
      const captchaToken = await requestCaptchaToken("community_post");
      const response = await createCommunityDiscussion({
        title: title.trim(),
        summary: summary.trim(),
        tags,
        captchaToken,
      });

      const discussion = response?.discussion;
      const verdict = String(response?.moderation?.verdict || discussion?.status || "").toLowerCase();
      if (discussion && verdict === "published") {
        setStories((prev) => [
          {
            ...discussion,
            comments: ensureArray(discussion.comments),
            tags: ensureArray(discussion.tags),
          },
          ...prev,
        ]);
        setNotice("Your discussion has been posted.");
        pushMemberNotification("Your community discussion was posted.", "success");
      } else if (verdict === "pending_review") {
        setNotice("Your discussion is submitted and pending moderation review.");
        pushMemberNotification("Discussion submitted for moderation review.", "info");
      } else {
        setNotice("Your discussion was blocked by community safety filters.");
        pushMemberNotification("Discussion blocked by moderation policy.", "warning");
      }
      setActiveSection("discussion");
    } catch (error) {
      setNotice(toErrorMessage(error, "Could not post discussion right now."));
      pushMemberNotification("Discussion posting failed.", "warning");
    }
  };

  const upvoteStory = async (storyId) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice("Login required for Helpful vote.");
      return;
    }

    try {
      const response = await upvoteCommunityDiscussion(storyId);
      const updated = response?.discussion;
      if (!updated) return;
      setStories((prev) =>
        prev.map((story) =>
          story.id === storyId ? { ...updated, comments: ensureArray(updated.comments) } : story
        )
      );
      pushMemberNotification("You marked a discussion as helpful.");
    } catch {
      setNotice("Could not register vote right now. Please retry.");
      pushMemberNotification("Helpful vote failed. Please retry.", "warning");
    }
  };

  const submitComment = async (storyId) => {
    const text = (commentDrafts[storyId] || "").trim();
    if (!text) return;
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice("Login required for Discussion Reply.");
      return;
    }

    try {
      const captchaToken = await requestCaptchaToken("community_comment");
      const response = await addCommunityComment(storyId, {
        text,
        captchaToken,
      });
      const updated = response?.discussion;
      const verdict = String(response?.moderation?.verdict || "").toLowerCase();
      if (updated && verdict !== "pending_review" && verdict !== "blocked") {
        setStories((prev) =>
          prev.map((story) =>
            story.id === storyId ? { ...updated, comments: ensureArray(updated.comments) } : story
          )
        );
      }
      setCommentDrafts((prev) => ({ ...prev, [storyId]: "" }));
      if (verdict === "pending_review") {
        setNotice("Reply submitted and pending moderation review.");
        pushMemberNotification("Reply submitted for moderation review.", "info");
      } else if (verdict === "blocked") {
        setNotice("Reply blocked by community safety filters.");
        pushMemberNotification("Reply blocked by moderation policy.", "warning");
      } else {
        setNotice("Reply posted.");
        pushMemberNotification("Your reply was posted to the discussion.", "success");
      }
    } catch (error) {
      setNotice(toErrorMessage(error, "Could not post reply right now."));
      pushMemberNotification("Reply posting failed.", "warning");
    }
  };

  const reportDiscussion = async (storyId) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice("Login required for reporting.");
      return;
    }

    const reasonInput = window.prompt("Reason for report (spam/hate/misleading/abuse)");
    if (reasonInput == null) return;
    const reason = reasonInput.trim() || "reported";

    try {
      const response = await reportCommunityDiscussion(storyId, { reason });
      if (response?.autoHidden) {
        setStories((prev) => prev.filter((story) => story.id !== storyId));
        setNotice("Report submitted. This thread was auto-hidden for moderation review.");
      } else if (response?.duplicate) {
        setNotice("You already reported this thread.");
      } else {
        setNotice("Report submitted. Moderation team will review.");
      }
      pushMemberNotification("Discussion report submitted.", "info");
    } catch (error) {
      setNotice(toErrorMessage(error, "Could not submit report right now."));
    }
  };

  const reportComment = async (storyId, commentId) => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      setNotice("Login required for reporting.");
      return;
    }

    const reasonInput = window.prompt("Reason for report (spam/hate/misleading/abuse)");
    if (reasonInput == null) return;
    const reason = reasonInput.trim() || "reported";

    try {
      const response = await reportCommunityComment(storyId, commentId, { reason });
      if (response?.autoHidden) {
        setStories((prev) =>
          prev.map((story) =>
            story.id === storyId
              ? {
                  ...story,
                  comments: ensureArray(story.comments).filter((comment) => comment.id !== commentId),
                }
              : story
          )
        );
        setNotice("Report submitted. The comment was auto-hidden for moderation review.");
      } else if (response?.duplicate) {
        setNotice("You already reported this comment.");
      } else {
        setNotice("Report submitted. Moderation team will review.");
      }
      pushMemberNotification("Comment report submitted.", "info");
    } catch (error) {
      setNotice(toErrorMessage(error, "Could not submit report right now."));
    }
  };

  return (
    <section className="community-page">
      <div className="community-shell">
        <div className="community-layout">
          <aside className="community-left-rail">
            <div className="rail-brand">
              <h2>NAYAY Social</h2>
              <p>Public legal community for discussions, meetups, Q/A, and support.</p>
            </div>
            <nav className="rail-nav">
              {SECTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={activeSection === option.id ? "is-active" : ""}
                  onClick={() => setActiveSection(option.id)}
                >
                  <span>{option.label}</span>
                  <strong>{sectionCounts[option.id]}</strong>
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="rail-primary"
              onClick={handleCreateDiscussion}
            >
              Ask Question
            </button>
            <button
              type="button"
              className="rail-secondary"
              onClick={() => onBackHome?.()}
            >
              Back
            </button>
          </aside>

          <main className="community-feed">
            <header className="feed-header">
              <div>
                <h3>
                  {SECTION_OPTIONS.find((item) => item.id === activeSection)?.label}
                </h3>
                <p>Public legal conversations, answered by community and experts.</p>
              </div>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions, topics, cities, groups"
              />
            </header>

            {!isLoggedIn && (
              <p className="community-login-note">
                Preview mode is active. Login to post, comment, RSVP, ask live Q/A,
                and join volunteer communities.
              </p>
            )}
            {isLoading && (
              <p className="community-login-note">Loading latest community feed...</p>
            )}
            {loadError && <p className="community-notice">{loadError}</p>}
            {notice && <p className="community-notice">{notice}</p>}

            {activeSection === "discussion" && (
              <section className="feed-stream">
                {filteredStories.map((story) => (
                  <article key={story.id} className="feed-card question-card">
                    <div className="question-head">
                      <div className="question-avatar">
                        {String(story.author || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="question-meta">
                        <strong>{story.author}</strong>
                        <span>{story.handle} • {story.postedAt}</span>
                      </div>
                      <em>{story.validatedBy}</em>
                    </div>

                    <h4>{story.title}</h4>
                    <p className="question-summary">{story.summary}</p>
                    <p className="question-answer">
                      <span>Top answer:</span> {story.response}
                    </p>

                    <div className="question-tags">
                      {ensureArray(story.tags).map((tag) => (
                        <button key={`${story.id}-${tag}`} type="button">
                          #{tag}
                        </button>
                      ))}
                    </div>

                    <div className="question-actions">
                      <button type="button" onClick={() => upvoteStory(story.id)}>
                        Helpful ({Number(story.votes || 0)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMemberAction("Discussion Reply")}
                      >
                        Answer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMemberAction("Follow Thread")}
                      >
                        Follow
                      </button>
                      <button type="button" onClick={() => reportDiscussion(story.id)}>
                        Report
                      </button>
                    </div>

                    {ensureArray(story.comments).length > 0 && (
                      <div className="question-comments">
                        {ensureArray(story.comments)
                          .slice(-2)
                          .map((comment) => (
                            <div key={comment.id} className="question-comment">
                              <strong>{comment.author}</strong>
                              <span>
                                {comment.handle || "@member"} • {comment.postedAt || "Just now"}
                              </span>
                              <p>{comment.text}</p>
                              <button
                                type="button"
                                onClick={() => reportComment(story.id, comment.id)}
                              >
                                Report
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className="question-comment-form">
                      <input
                        type="text"
                        value={commentDrafts[story.id] || ""}
                        onChange={(event) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [story.id]: event.target.value,
                          }))
                        }
                        placeholder="Write a reply..."
                      />
                      <button type="button" onClick={() => submitComment(story.id)}>
                        Post Reply
                      </button>
                    </div>
                  </article>
                ))}

                {filteredStories.length === 0 && (
                  <p className="community-empty">No matching discussions found.</p>
                )}
              </section>
            )}

            {activeSection === "meetups" && (
              <section className="feed-stream">
                {filteredMeetups.map((meetup) => (
                  <article key={meetup.id} className="feed-card module-card">
                    <span className="module-chip">{meetup.city}</span>
                    <h4>{meetup.title}</h4>
                    <p>{meetup.date} • {meetup.venue}</p>
                    <p>Host: {meetup.host}</p>
                    <p>{meetup.seats}</p>
                    <button
                      type="button"
                      onClick={() => handleMemberAction("Meetup RSVP")}
                    >
                      Join Meetup
                    </button>
                  </article>
                ))}
                {filteredMeetups.length === 0 && (
                  <p className="community-empty">No meetup found for this search.</p>
                )}
              </section>
            )}

            {activeSection === "qa" && (
              <section className="feed-stream">
                {filteredQa.map((session) => (
                  <article key={session.id} className="feed-card module-card">
                    <span className="module-chip">{session.mode}</span>
                    <h4>{session.topic}</h4>
                    <p>{session.date}</p>
                    <p>Speaker: {session.speaker}</p>
                    <button
                      type="button"
                      onClick={() => handleMemberAction("Q/A Slot Booking")}
                    >
                      Reserve Seat
                    </button>
                  </article>
                ))}
                {filteredQa.length === 0 && (
                  <p className="community-empty">No Q/A session found for this search.</p>
                )}
              </section>
            )}

            {activeSection === "volunteers" && (
              <section className="feed-stream">
                {filteredVolunteers.map((group) => (
                  <article key={group.id} className="feed-card module-card">
                    <span className="module-chip">{group.type}</span>
                    <h4>{group.name}</h4>
                    <p>{group.focus}</p>
                    <p>{group.location}</p>
                    <p>{group.members}</p>
                    <button
                      type="button"
                      onClick={() => handleMemberAction("Volunteer Group Join")}
                    >
                      Join Network
                    </button>
                  </article>
                ))}
                {filteredVolunteers.length === 0 && (
                  <p className="community-empty">No volunteer group found for this search.</p>
                )}
              </section>
            )}
          </main>

          <aside className="community-right-rail">
            <section className="rail-card">
              <h4>Trending Topics</h4>
              <ul>
                {trendingTags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            </section>

            <section className="rail-card">
              <h4>Top Useful Responses</h4>
              <ul>
                {topStories.map((story) => (
                  <li key={story.id}>
                    <strong>{story.title}</strong>
                    <span>{Number(story.votes || 0)} helpful votes</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rail-card">
              <h4>Recommended Experts & NGOs</h4>
              <ul>
                {experts.map((expert) => (
                  <li key={expert}>{expert}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleMemberAction("Community Follow")}
              >
                Follow Community
              </button>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default CommunityHub;
