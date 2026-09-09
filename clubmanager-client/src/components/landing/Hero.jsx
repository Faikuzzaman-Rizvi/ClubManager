import { Suspense, lazy, useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

import SceneBoundary from './SceneBoundary';
import { HERO_PLAYERS } from './heroPlayersData';
import Icon from '../ui/Icon';

// Three + the scene are code-split as their own chunk.
const HeroScene = lazy(() => import('./HeroScene'));

/** Cheap probe so we never mount a Canvas that cannot possibly draw. */
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

export default function Hero({ onExplore }) {
  const canRender3D = useMemo(() => supportsWebGL(), []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeItem = HERO_PLAYERS[activeIndex] ?? HERO_PLAYERS[0];

  // Auto-advance through showcase every 6.5s unless hovered or paused
  const nextItem = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HERO_PLAYERS.length);
  }, []);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = setInterval(nextItem, 6500);
    return () => clearInterval(timer);
  }, [isPaused, nextItem]);

  return (
    <section className="ld-hero" id="home">
      <div className="ld-hero-bg" aria-hidden="true">
        <span className="ld-hero-glow" data-hero="glow" />
        <span className="ld-hero-beam" />
        <span className="ld-hero-pitch" />
        <span className="ld-hero-grain" />
      </div>

      <div className="ld-hero-inner">
        {/* Left Column: Hero Copy & Club Actions */}
        <div className="ld-hero-copy">
          <p className="ld-eyebrow" data-hero="label">
            <span className="ld-eyebrow-dot" aria-hidden="true" />
            Official Match Ball · FIFA 2026 Trionda Edition
          </p>

          <h1 className="ld-hero-title">
            <span className="ld-line-mask">
              <span data-hero="line">Where passion</span>
            </span>
            <span className="ld-line-mask">
              <span data-hero="line">
                meets the <span className="ld-title-gold">Legends</span>
              </span>
            </span>
          </h1>

          <p className="ld-hero-lead" data-hero="copy">
            Command your squad on authentic stadium turf, track live match intelligence,
            and inspect the official 2026 tournament match ball with real-time aerodynamics
            and legendary player analytics.
          </p>

          <div className="ld-hero-actions">
            <button
              type="button"
              className="ld-btn ld-btn-primary"
              data-hero="cta"
              onClick={onExplore}
            >
              Explore Club
            </button>
            <Link to="/standings" className="ld-btn ld-btn-ghost" data-hero="cta">
              View Standings
            </Link>
          </div>

          {/* Quick League & Match Ball Metric Badges */}
          <div className="ld-hero-pills" data-hero="copy">
            <span className="ld-hero-pill is-trionda" onClick={() => setActiveIndex(0)} role="button" tabIndex={0}>
              <span className="ld-pill-ball-icon" aria-hidden="true">⚽</span>
              <span>Trionda 2026 Ball</span>
            </span>
            <span className="ld-hero-pill">
              <Icon name="teams" size={13} />
              <span>20 Elite Clubs</span>
            </span>
            <span className="ld-hero-pill">
              <Icon name="matches" size={13} />
              <span>38 Matchdays</span>
            </span>
            <span className="ld-hero-pill">
              <Icon name="chart" size={13} />
              <span>Pitch Engine</span>
            </span>
          </div>
        </div>

        {/* Right Column: 3D Match Ball & Legends Stage */}
        <div
          className="ld-hero-stage-wrap"
          data-hero="stage"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Showcase Switcher Pills */}
          <div className="ld-legend-switcher" role="tablist" aria-label="Select Showcase Item">
            {HERO_PLAYERS.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`ld-legend-tab ${isActive ? 'is-active' : ''} ${item.isBall ? 'is-ball-tab' : ''}`}
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsPaused(true);
                  }}
                  style={{
                    '--tab-color': item.color,
                  }}
                >
                  <span className="ld-legend-num">
                    {item.isBall ? '⚽' : `#${item.number}`}
                  </span>
                  <span className="ld-legend-name">{item.shortName.replace('⚽ ', '')}</span>
                  {isActive && <span className="ld-legend-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* 3D Three.js Match Ball & Player Deck Canvas */}
          <div className="ld-hero-stage">
            {canRender3D && (
              <SceneBoundary>
                <Suspense
                  fallback={
                    <div className="ld-stage-fallback">
                      <img
                        src={activeItem.image}
                        alt={activeItem.name}
                        className="ld-stage-fallback-img"
                      />
                    </div>
                  }
                >
                  <HeroScene
                    activeIndex={activeIndex}
                    onSelectPlayer={(idx) => {
                      setActiveIndex(idx);
                      setIsPaused(true);
                    }}
                  />
                </Suspense>
              </SceneBoundary>
            )}
          </div>

          {/* Tactical HUD / Spec Card */}
          <div
            className="ld-legend-hud"
            style={{
              '--hud-theme': activeItem.color,
            }}
          >
            <div className="ld-hud-header">
              <div className="ld-hud-title-wrap">
                <span className="ld-hud-badge">
                  {activeItem.isBall ? 'FIFA QUALITY PRO' : `#${activeItem.number}`} · {activeItem.title}
                </span>
                <h3 className="ld-hud-name">{activeItem.name}</h3>
                <p className="ld-hud-accolade">{activeItem.accolades}</p>
              </div>

              <div className="ld-hud-ovr-box">
                <span className="ld-hud-ovr-label">{activeItem.isBall ? 'RATING' : 'OVR'}</span>
                <span className="ld-hud-ovr-val">
                  {activeItem.stats.find((s) => s.label === 'OVR')?.val ?? '99'}
                </span>
              </div>
            </div>

            {/* Micro Stats Bar */}
            <div className="ld-hud-stats">
              {activeItem.stats
                .filter((s) => s.label !== 'OVR')
                .map((st) => (
                  <div className="ld-hud-stat-item" key={st.label}>
                    <span className="ld-hud-stat-num">{st.val}</span>
                    <span className="ld-hud-stat-lbl">{st.label}</span>
                  </div>
                ))}
            </div>

            {/* Interaction Hint bar */}
            <div className="ld-hud-footer">
              <span className="ld-hud-hint">
                <Icon name="sparkles" size={12} />
                <span>
                  {activeItem.isBall
                    ? 'Drag to rotate Trionda ball 360° · Rest on stadium pitch turf'
                    : 'Hover or drag in 3D to tilt · Click ball or cards to focus'}
                </span>
              </span>
              <span className="ld-hud-timer-badge">
                {isPaused ? '⏸ Focused' : '⚡ Auto Rotating'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ld-hero-scroll" aria-hidden="true">
        <span className="ld-hero-scroll-line" />
        Scroll
      </div>
    </section>
  );
}
