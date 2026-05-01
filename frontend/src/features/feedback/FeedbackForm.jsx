import { useEffect, useMemo, useState } from "react";
import "./FeedbackForm.css";

const FEEDBACK_STORAGE_KEY = "nayay-setu-feedback";

const EMPTY_FORM = {
  name: "",
  email: "",
  rating: "5",
  message: "",
};

const formatReviewDate = (timestamp) => {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return "Recently";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const renderStars = (rating) => {
  const numeric = Number(rating) || 0;
  if (numeric <= 0) return "☆☆☆☆☆";
  const normalized = Math.max(1, Math.min(5, Math.round(numeric)));
  return "★".repeat(normalized) + "☆".repeat(5 - normalized);
};

function FeedbackForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "[]");
      setReviews(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReviews([]);
    }
  }, []);

  const reviewStats = useMemo(() => {
    if (reviews.length === 0) {
      return { count: 0, avg: 0, roundedAvg: 0 };
    }
    const total = reviews.reduce((sum, item) => sum + (Number(item.rating) || 0), 0);
    const avg = total / reviews.length;
    return {
      count: reviews.length,
      avg,
      roundedAvg: Math.round(avg),
    };
  }, [reviews]);

  const recentReviews = useMemo(
    () =>
      [...reviews]
        .sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0))
        .slice(0, 6),
    [reviews]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    let currentReviews = [];
    try {
      const parsed = JSON.parse(
        localStorage.getItem(FEEDBACK_STORAGE_KEY) || "[]"
      );
      currentReviews = Array.isArray(parsed) ? parsed : [];
    } catch {
      currentReviews = [];
    }

    const nextReview = { ...form, submittedAt: Date.now() };
    const nextReviews = [...currentReviews, nextReview];
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(nextReviews));
    setReviews(nextReviews);
    setNotice("Thanks! Your feedback has been submitted.");
    setForm(EMPTY_FORM);
  };

  return (
    <section className="feedback-wrap">
      <h2 className="headings"> FEEDBACK </h2>
      <div className="feedback-layout">
        <aside className="feedback-reviews">
          <div className="feedback-summary">
            <p>Overall Rating</p>
            <strong>
              {reviewStats.avg ? reviewStats.avg.toFixed(1) : "0.0"}
            </strong>
            <span>{renderStars(reviewStats.roundedAvg || 0)}</span>
            <small>Based on {reviewStats.count} reviews</small>
          </div>

          <h3>What People Say About Us</h3>
          {recentReviews.length === 0 && (
            <p className="feedback-empty">No reviews yet. Be the first one.</p>
          )}
          <div className="feedback-review-list">
            {recentReviews.map((review, index) => (
              <article
                key={`${review.email}-${review.submittedAt}-${index}`}
                className="feedback-review-card"
              >
                <div className="feedback-review-top">
                  <strong>{review.name || "Anonymous User"}</strong>
                  <span>{renderStars(review.rating)}</span>
                </div>
                <p>{review.message}</p>
                <small>{formatReviewDate(review.submittedAt)}</small>
              </article>
            ))}
          </div>
        </aside>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <h3>Share Your Feedback</h3>
          <p>
            Tell us your experience so we can keep improving NAYAY SETU.
          </p>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            required
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Your email"
            required
          />
          <select name="rating" value={form.rating} onChange={handleChange}>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Average</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Very Poor</option>
          </select>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            placeholder="Write your feedback..."
            rows={5}
            required
          />
          <button type="submit">Submit Feedback</button>
          {notice && <p className="feedback-notice">{notice}</p>}
        </form>
      </div>
    </section>
  );
}

export default FeedbackForm;
