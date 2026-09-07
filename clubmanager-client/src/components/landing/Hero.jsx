import { Suspense, lazy, useMemo } from 'react';
import { Link } from 'react-router-dom';

import SceneBoundary from './SceneBoundary';

// three + the scene are the heaviest thing on the page by a wide margin, so they
// load as their own chunk after the hero copy is already on screen.
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

  return (
    <section className="ld-hero" id="home">
      <div className="ld-hero-bg" aria-hidden="true">
        <span className="ld-hero-glow" data-hero="glow" />
        <span className="ld-hero-pitch" />
        <span className="ld-hero-grain" />
      </div>

      <div className="ld-hero-inner">
        <div className="ld-hero-copy">
          <p className="ld-eyebrow" data-hero="label">
            <span className="ld-eyebrow-dot" aria-hidden="true" />
            Football Club
          </p>

          <h1 className="ld-hero-title">
            <span className="ld-line-mask">
              <span data-hero="line">Where passion</span>
            </span>
            <span className="ld-line-mask">
              <span data-hero="line">meets the game</span>
            </span>
          </h1>

          <p className="ld-hero-lead" data-hero="copy">
            Manage your club. Follow every match. Track every goal.
          </p>

          <div className="ld-hero-actions">
            <button type="button" className="ld-btn ld-btn-primary" data-hero="cta" onClick={onExplore}>
              Explore club
            </button>
            <Link to="/standings" className="ld-btn ld-btn-ghost" data-hero="cta">
              View standings
            </Link>
          </div>
        </div>

        <div className="ld-hero-stage" data-hero="stage">
          {canRender3D && (
            <SceneBoundary>
              <Suspense fallback={null}>
                <HeroScene />
              </Suspense>
            </SceneBoundary>
          )}
        </div>
      </div>

      <div className="ld-hero-scroll" aria-hidden="true">
        <span className="ld-hero-scroll-line" />
        Scroll
      </div>
    </section>
  );
}
