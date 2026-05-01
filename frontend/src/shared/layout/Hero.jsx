import { useEffect, useRef, useState } from "react";
import Carousel from "bootstrap/js/dist/carousel";
import { BsArrowUp, BsMic, BsPlusLg } from "react-icons/bs";
import "./Hero.css";
import IMG1 from "../../assets/Images/vidio.mp4";
import IMG2 from "../../assets/Images/images_handshake.png";
import IMG3 from "../../assets/Images/img3.jpg";

function Hero({
  onStartConsultation,
  title = "Your Personal AI Legal Assistant",
  subtitle = "Get instant, reliable legal guidance 24/7. Chat with AI and get clear next steps in seconds.",
}) {
  const carouselRef = useRef(null);
  const timerRef = useRef(null);
  const [askText, setAskText] = useState("");

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;

    const carousel = new Carousel(node, {
      interval: false,
      ride: false,
      pause: false,
      wrap: true,
      touch: true,
    });

    const clearImageTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const scheduleSlideAdvance = () => {
      clearImageTimer();

      const activeItem = node.querySelector(".carousel-item.active");
      if (!activeItem) return;

      const activeVideo = activeItem.querySelector("video");
      if (activeVideo) {
        activeVideo.currentTime = 0;
        activeVideo.play().catch(() => {});
        return;
      }

      timerRef.current = window.setTimeout(() => {
        carousel.next();
      }, 10000);
    };

    const handleVideoEnded = (event) => {
      if (!event.target.closest(".carousel-item.active")) return;
      carousel.next();
    };

    const handleSlideChanged = () => {
      scheduleSlideAdvance();
    };

    const videos = node.querySelectorAll("video");
    videos.forEach((video) => {
      video.addEventListener("ended", handleVideoEnded);
    });

    node.addEventListener("slid.bs.carousel", handleSlideChanged);
    scheduleSlideAdvance();

    return () => {
      clearImageTimer();
      node.removeEventListener("slid.bs.carousel", handleSlideChanged);
      videos.forEach((video) => {
        video.removeEventListener("ended", handleVideoEnded);
      });
      carousel.dispose();
    };
  }, []);

  const openAssistant = (prefill = "") => {
    onStartConsultation?.(prefill);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    openAssistant(askText.trim());
    setAskText("");
  };

  return (
    <div className="Hero-Container">
      <div
        id="carouselExampleAutoplaying"
        className="carousel slide"
        ref={carouselRef}
      >
        <div className="carousel-inner">
          <div className="carousel-item active">
            <video src={IMG1} autoPlay muted playsInline preload="metadata"></video>
          </div>
          <div className="carousel-item">
            <img src={IMG2} className="d-block w-100" alt="..." />
          </div>
          <div className="carousel-item">
            <img src={IMG3} className="d-block w-100" alt="..." />
          </div>
        </div>
      </div>

      <div className="hero-content">
        <div className="hero-panel">
          <h1>{title}</h1>
          <p>{subtitle}</p>

          <form className="hero-assist-form" onSubmit={handleSubmit}>
            <div className="hero-assist-bar">
              <button
                type="button"
                className="hero-assist-icon left"
                onClick={() => {
                  openAssistant(askText.trim());
                  setAskText("");
                }}
                aria-label="Open assistant"
              >
                <BsPlusLg />
              </button>
              <input
                type="text"
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                placeholder="Ask anything"
                aria-label="Ask anything"
              />
              <div className="hero-assist-right">
                <button
                  type="button"
                  className="hero-assist-icon"
                  onClick={() => {
                    openAssistant(askText.trim());
                    setAskText("");
                  }}
                  aria-label="Use microphone"
                >
                  <BsMic />
                </button>
                <button
                  type="submit"
                  className="hero-assist-send"
                  aria-label="Send"
                >
                  <BsArrowUp />
                </button>
              </div>
            </div>
          </form>

          <div className="hero-stats">
            <div>
              <strong>10K+</strong>
              <span>Users Served</span>
            </div>
            <div>
              <strong>500+</strong>
              <span>Lawyers</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
