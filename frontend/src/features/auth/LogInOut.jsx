import { useEffect, useRef, useState } from "react";
import "./LogInOut.css";
import { FaGoogle, FaFacebookF, FaLinkedinIn } from "react-icons/fa";
import { BsTwitterX } from "react-icons/bs";
import { MdClose } from "react-icons/md";
import { addNotification } from "../../utils/notifications";
import {
  authGoogle,
  authLogin,
  authRegister,
  authSocial,
} from "../../services/legalApi";
import { saveAuthSession } from "../../utils/authSession";

const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_GSI_SCRIPT = "https://accounts.google.com/gsi/client";

const SOCIAL_PROVIDERS = [
  { id: "facebook", label: "Facebook", icon: FaFacebookF },
  { id: "google", label: "Google", icon: FaGoogle },
  { id: "twitter", label: "X", icon: BsTwitterX },
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedinIn },
];

function LogInOut({ toggleLogin, onAuthSuccess, onOpenLawyerRegister }) {
  const closeTimerRef = useRef(null);
  const googleReadyRef = useRef(false);
  const [active, setActive] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [socialBusyProvider, setSocialBusyProvider] = useState("");
  const [signInForm, setSignInForm] = useState({
    username: "",
    password: "",
  });
  const [signUpForm, setSignUpForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    if (window.google?.accounts?.id) {
      googleReadyRef.current = true;
      return undefined;
    }

    let cancelled = false;
    const existing = document.querySelector('script[data-google-gsi="true"]');
    if (existing) {
      existing.addEventListener(
        "load",
        () => {
          if (!cancelled) googleReadyRef.current = Boolean(window.google?.accounts?.id);
        },
        { once: true }
      );
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = GOOGLE_GSI_SCRIPT;
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "true";
    script.onload = () => {
      if (!cancelled) googleReadyRef.current = Boolean(window.google?.accounts?.id);
    };
    script.onerror = () => {
      if (!cancelled) googleReadyRef.current = false;
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRegister = () => setActive(true);
  const handleLogin = () => setActive(false);

  const handleSignInChange = (event) => {
    const { name, value } = event.target;
    setSignInForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignUpChange = (event) => {
    const { name, value } = event.target;
    setSignUpForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignInSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const username = signInForm.username.trim();
    const password = signInForm.password;

    if (!username || !password) {
      setAuthError("Enter username/email and password.");
      return;
    }

    try {
      const response = await authLogin({
        identifier: username,
        password,
      });
      const user = response?.user || null;
      const accessToken = response?.accessToken || "";
      const refreshToken = response?.refreshToken || "";
      if (!user || !accessToken || !refreshToken) {
        setAuthError("Invalid login response.");
        return;
      }
      saveAuthSession({
        user,
        accessToken,
        refreshToken,
      });
      addNotification(`Welcome back, ${user.displayName || user.username}.`, {
        user,
        type: "success",
      });
      onAuthSuccess?.();
      setAuthSuccess(`Welcome, ${user.displayName || user.username}.`);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => toggleLogin(), 600);
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.toLowerCase().includes("invalid credentials") ||
        message.includes("401")
      ) {
        setAuthError("Invalid credentials.");
        return;
      }
      setAuthError("Login failed. Please try again.");
      return;
    }
  };

  const handleSignUpSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const username = signUpForm.username.trim();
    const displayName = signUpForm.displayName.trim();
    const email = signUpForm.email.trim().toLowerCase();
    const password = signUpForm.password;

    if (!username || !displayName || !email || !password) {
      setAuthError("Fill all signup fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAuthError("Enter a valid email.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }

    try {
      const response = await authRegister({
        username,
        displayName,
        email,
        password,
      });
      const user = response?.user || null;
      const accessToken = response?.accessToken || "";
      const refreshToken = response?.refreshToken || "";
      if (!user || !accessToken || !refreshToken) {
        setAuthError("Signup failed. Invalid server response.");
        return;
      }

      saveAuthSession({
        user,
        accessToken,
        refreshToken,
      });
      addNotification("Signup successful. Account is ready for dashboard access.", {
        user,
        type: "success",
      });
      onAuthSuccess?.();

      setAuthSuccess("Signup successful. You are now logged in.");
      setSignUpForm({
        username: "",
        displayName: "",
        email: "",
        password: "",
      });
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => toggleLogin(), 600);
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.toLowerCase().includes("already exists") ||
        message.includes("409")
      ) {
        setAuthError("Username or email already registered.");
        return;
      }
      setAuthError("Signup failed. Please try again.");
    }
  };

  const handleLawyerRegisterOpen = () => {
    onOpenLawyerRegister?.();
    toggleLogin();
  };

  const promptGoogleIdToken = async () =>
    new Promise((resolve, reject) => {
      const googleClient = window.google?.accounts?.id;
      if (!googleClient || !GOOGLE_CLIENT_ID) {
        reject(new Error("Google OAuth is not configured."));
        return;
      }

      let settled = false;
      const finish = (handler, payload) => {
        if (settled) return;
        settled = true;
        handler(payload);
      };

      const timeoutId = window.setTimeout(() => {
        finish(reject, new Error("Google sign-in timed out. Try again."));
      }, 25_000);

      googleClient.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          window.clearTimeout(timeoutId);
          if (!response?.credential) {
            finish(reject, new Error("Google sign-in did not return credentials."));
            return;
          }
          finish(resolve, response.credential);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleClient.prompt((notification) => {
        if (settled) return;
        const notDisplayed = Boolean(notification?.isNotDisplayed?.());
        const skipped = Boolean(notification?.isSkippedMoment?.());
        if (notDisplayed || skipped) {
          window.clearTimeout(timeoutId);
          finish(reject, new Error("Google sign-in cancelled or blocked."));
        }
      });
    });

  const handleGoogleAuth = async () => {
    setAuthError("");
    setAuthSuccess("");

    if (!GOOGLE_CLIENT_ID) {
      setAuthError("Google login is not configured. Set VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    if (!googleReadyRef.current) {
      setAuthError("Google script is loading. Please try again in a moment.");
      return;
    }

    setSocialBusyProvider("google");
    try {
      const idToken = await promptGoogleIdToken();
      const response = await authGoogle({ idToken });
      const user = response?.user || null;
      const accessToken = response?.accessToken || "";
      const refreshToken = response?.refreshToken || "";
      if (!user || !accessToken || !refreshToken) {
        setAuthError("Google login failed. Invalid server response.");
        return;
      }
      saveAuthSession({
        user,
        accessToken,
        refreshToken,
      });
      addNotification(`Signed in with Google as ${user.displayName || user.username}.`, {
        user,
        type: "success",
      });
      onAuthSuccess?.();
      setAuthSuccess("Google login successful.");
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => toggleLogin(), 600);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("cancelled")) {
        setAuthError("Google login cancelled.");
        return;
      }
      setAuthError(message || "Google login failed.");
    } finally {
      setSocialBusyProvider("");
    }
  };

  const handleSocialAuth = async (provider) => {
    setAuthError("");
    setAuthSuccess("");
    const providerName = String(provider || "").trim();
    if (!providerName) return;

    const emailInput = window.prompt(`Demo ${providerName} login: enter your email to continue.`);
    const email = String(emailInput || "").trim().toLowerCase();
    if (!email) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setAuthError("Enter a valid email for social login.");
      return;
    }

    const displayName = email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim();

    setSocialBusyProvider(providerName);
    try {
      const response = await authSocial({
        provider: providerName.toLowerCase(),
        email,
        displayName,
      });
      const user = response?.user || null;
      const accessToken = response?.accessToken || "";
      const refreshToken = response?.refreshToken || "";
      if (!user || !accessToken || !refreshToken) {
        setAuthError("Social login failed. Invalid server response.");
        return;
      }
      saveAuthSession({
        user,
        accessToken,
        refreshToken,
      });
      addNotification(`Signed in with ${providerName} as ${user.displayName || user.username}.`, {
        user,
        type: "success",
      });
      onAuthSuccess?.();
      setAuthSuccess(`Signed in with ${providerName}.`);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = window.setTimeout(() => toggleLogin(), 600);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("disabled")) {
        setAuthError("Social login is currently disabled by backend settings.");
        return;
      }
      setAuthError("Social login failed. Please try again.");
    } finally {
      setSocialBusyProvider("");
    }
  };

  // Note: removed direct DOM access and addEventListener. Use React state instead.

  return (

    <div id="container" className={`container${active ? " active" : ""}`}>
      <div className="form-container sign-in">
        <form onSubmit={handleSignInSubmit}>
          <div className="form-header">
            <h2>Sign In</h2>
            <button
              type="button"
              className="close-btn"
              onClick={toggleLogin}
              aria-label="Close login and signup"
            >
              <MdClose />
            </button>
          </div>
          <div className="social-container">
            {SOCIAL_PROVIDERS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="social-btn"
                  onClick={() =>
                    item.id === "google" ? handleGoogleAuth() : handleSocialAuth(item.id)
                  }
                  aria-label={`Continue with ${item.label}`}
                  disabled={Boolean(socialBusyProvider)}
                  title={`Continue with ${item.label}`}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
          <input
            type="text"
            name="username"
            value={signInForm.username}
            onChange={handleSignInChange}
            placeholder="Username or Email"
          />
          <input
            type="password"
            name="password"
            value={signInForm.password}
            onChange={handleSignInChange}
            placeholder="Password"
          />
          {authError && !active && (
            <p className="auth-msg auth-error">{authError}</p>
          )}
          {authSuccess && !active && (
            <p className="auth-msg auth-success">{authSuccess}</p>
          )}
          <button type="submit" className="btn">
            Sign In
          </button>
          <button
            type="button"
            className="lawyer-register-entry"
            onClick={handleLawyerRegisterOpen}
          >
            Register as Lawyer
          </button>
          <button type="button" className="mobile-switch-btn" onClick={handleRegister}>
            New user? Create account
          </button>
        </form>
      </div>

      <div className="form-container sign-up">
        <form onSubmit={handleSignUpSubmit}>
          <div className="form-header">
            <h2>Create Account</h2>
            <button
              type="button"
              className="close-btn"
              onClick={toggleLogin}
              aria-label="Close login and signup"
            >
              <MdClose />
            </button>
          </div>
          <div className="social-container">
            {SOCIAL_PROVIDERS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="social-btn"
                  onClick={() =>
                    item.id === "google" ? handleGoogleAuth() : handleSocialAuth(item.id)
                  }
                  aria-label={`Continue with ${item.label}`}
                  disabled={Boolean(socialBusyProvider)}
                  title={`Continue with ${item.label}`}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
          <input
            type="text"
            name="username"
            value={signUpForm.username}
            onChange={handleSignUpChange}
            placeholder="Username"
          />
          <input
            type="text"
            name="displayName"
            value={signUpForm.displayName}
            onChange={handleSignUpChange}
            placeholder="Display name"
          />
          <input
            type="email"
            name="email"
            value={signUpForm.email}
            onChange={handleSignUpChange}
            placeholder="Email"
          />
          <input
            type="password"
            name="password"
            value={signUpForm.password}
            onChange={handleSignUpChange}
            placeholder="Password"
          />
          {authError && active && <p className="auth-msg auth-error">{authError}</p>}
          {authSuccess && active && (
            <p className="auth-msg auth-success">{authSuccess}</p>
          )}
          <button type="submit" className="btn">
            Sign Up
          </button>
          <button
            type="button"
            className="lawyer-register-entry"
            onClick={handleLawyerRegisterOpen}
          >
            Register as Lawyer
          </button>
          <button type="button" className="mobile-switch-btn" onClick={handleLogin}>
            Already have an account? Sign in
          </button>
        </form>
      </div>

      <div className="toggle-container">
        <div className="toggle">
          <div className="toggle-panel toggle-right">
            <h1>New Here?</h1>
            <p>Create your account to access all platform features.</p>
            <button
              type="button"
              className="hidden"
              id="register"
              onClick={handleRegister}
            >
              Create Account
            </button>
          </div>
          <div className="toggle-panel toggle-left">
            <h1>Welcome Back!</h1>
            <p>Use your existing account to continue.</p>
            <button type="button" className="hidden" id="login" onClick={handleLogin}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogInOut;
