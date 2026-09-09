import { useState, useRef, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../context/useAuth';
import { homePathForRole } from '../routes/roleHome';
import Icon from '../components/ui/Icon';
import LoginBallScene from '../components/auth/LoginBallScene';
import { prefersReducedMotion } from '../animations/gsapAnimations';
import './login.css';

const DEMO_PRESETS = [
  { label: 'Admin', username: 'admin', password: 'Admin@123', icon: 'shield' },
  { label: 'Coach', username: 'coach.arsenal', password: 'Demo@123', icon: 'teams' },
  { label: 'Player', username: 'player.saka', password: 'Demo@123', icon: 'player' },
];

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeDemo, setActiveDemo] = useState(null);

  const heroRef = useRef(null);
  const cardRef = useRef(null);

  // GSAP Entrance Animation on mount
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 0, x: -36 },
          { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }
        );
      }

      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, y: 32, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'power3.out', delay: 0.15 }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  if (isAuthenticated) {
    return <Navigate to={homePathForRole(role)} replace />;
  }

  function handleDemoSelect(preset) {
    setUsername(preset.username);
    setPassword(preset.password);
    setActiveDemo(preset.label);
    setError(null);

    // Subtle feedback animation on card
    if (!prefersReducedMotion() && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.985 },
        { scale: 1, duration: 0.25, ease: 'power2.out' }
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const signedIn = await login(username.trim(), password);
      navigate(location.state?.from ?? homePathForRole(signedIn.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ??
          'Invalid username or password. Please verify your credentials and try again.'
      );

      // Tactile shake animation on error
      if (!prefersReducedMotion() && cardRef.current) {
        gsap.timeline()
          .to(cardRef.current, { x: -9, duration: 0.08 })
          .to(cardRef.current, { x: 9, duration: 0.08 })
          .to(cardRef.current, { x: -6, duration: 0.08 })
          .to(cardRef.current, { x: 6, duration: 0.08 })
          .to(cardRef.current, { x: 0, duration: 0.08 });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page-root">
      <div className="auth-pitch-lines" aria-hidden="true" />

      {/* Top Header Navigation */}
      <header className="auth-top-nav">
        <Link to="/" className="auth-back-link" title="Return to public homepage">
          <Icon name="arrowLeft" size={15} />
          <span>Back to Club Home</span>
        </Link>

        <span className="auth-portal-badge">
          <span className="auth-pulse-dot" />
          <span>Official Matchday Portal · Season 2026</span>
        </span>
      </header>

      {/* Main Split Showcase Layout */}
      <main className="auth-main-layout">
        {/* Left Column: Interactive 3D Football Experience */}
        <section className="auth-hero-pane" ref={heroRef}>
          <div className="auth-hero-kicker">
            <span className="auth-kicker-icon">⚽</span>
            <span>Official Matchday Portal · FIFA 2026 Trionda Edition</span>
          </div>

          <h1 className="auth-hero-title">
            Command <span className="text-gold">The Pitch.</span>
            <br />
            Manage <span className="text-emerald">The Glory.</span>
          </h1>

          <p className="auth-hero-desc">
            Official tactical control center for club managers, coaching staff, and squad players.
            Real-time team formations, live match entry, official 2026 match ball analytics, and league operations.
          </p>

          {/* Interactive 3D Football Animation Scene */}
          <LoginBallScene />

          {/* Tactical Features Strip */}
          <div className="auth-features-strip">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Icon name="matches" size={18} />
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Trionda 26 Ball</span>
                <span className="auth-feature-sub">FIFA Quality Pro</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Icon name="player" size={18} />
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Stadium Pitch</span>
                <span className="auth-feature-sub">Live tactical metrics</span>
              </div>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-icon">
                <Icon name="shield" size={18} />
              </div>
              <div className="auth-feature-text">
                <span className="auth-feature-title">Role Access</span>
                <span className="auth-feature-sub">Admin, Coach & Player</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Portal Login Card */}
        <section className="auth-card-pane" ref={cardRef}>
          <div className="auth-tactical-card">
            <div className="auth-card-header">
              <div className="auth-emblem-badge" aria-hidden="true">
                <Icon name="ball" size={28} />
              </div>
              <div className="auth-card-brand">ClubManager</div>
              <h2 className="auth-card-title">Portal Sign In</h2>
              <p className="auth-card-subtitle">
                Authenticate with your club account to access your dashboard.
              </p>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="auth-quick-fill">
              <div className="auth-quick-label">
                <Icon name="sparkles" size={13} />
                <span>Quick Fill Demo Credentials:</span>
              </div>
              <div className="auth-quick-buttons">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={`auth-demo-btn ${activeDemo === preset.label ? 'is-active' : ''}`}
                    onClick={() => handleDemoSelect(preset)}
                    title={`Click to fill ${preset.label} credentials (${preset.username})`}
                  >
                    <Icon name={preset.icon} size={13} />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="auth-field-group">
                <label htmlFor="username" className="auth-label">
                  Username or ID
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <Icon name="player" size={16} />
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setActiveDemo(null);
                    }}
                    placeholder="Enter club username"
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              <div className="auth-field-group">
                <label htmlFor="password" className="auth-label">
                  Password
                </label>
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <Icon name="lock" size={16} />
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setActiveDemo(null);
                    }}
                    placeholder="Enter password"
                    className="auth-input has-toggle"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="auth-error-banner" role="alert">
                  <Icon name="alert" size={16} className="auth-error-icon" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <Icon name="login" size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Public Section Notice */}
            <div className="auth-card-footer">
              <p className="auth-public-notice">
                League standings, match scores, and top scorers are public.
              </p>
              <div className="auth-public-links">
                <Link to="/standings" className="auth-public-link">
                  View Standings →
                </Link>
                <span className="auth-link-divider">·</span>
                <Link to="/topscorers" className="auth-public-link">
                  Top Scorers →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
