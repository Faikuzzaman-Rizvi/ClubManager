import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';

import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import ClubStats from '../components/landing/ClubStats';
import LatestMatches from '../components/landing/LatestMatches';
import UpcomingMatch from '../components/landing/UpcomingMatch';
import SquadPreview from '../components/landing/SquadPreview';
import StandingsPreview from '../components/landing/StandingsPreview';
import TopScorersPreview from '../components/landing/TopScorersPreview';
import ClubStory from '../components/landing/ClubStory';

import useLandingData from '../api/useLandingData';
import { playHeroIntro, revealOnScroll, revealFromSide } from '../animations/gsapAnimations';
import '../landing.css';

export default function LandingPage() {
  const rootRef = useRef(null);
  const data = useLandingData();
  const { loading } = data;

  // Hero intro runs once on mount, independent of data.
  useEffect(() => {
    const context = gsap.context(() => playHeroIntro(rootRef.current), rootRef);
    return () => context.revert();
  }, []);

  /*
   * Scroll reveals wait for the data pass so they bind to the real cards rather
   * than the loading placeholders they replace. gsap.context scopes every tween
   * and ScrollTrigger created inside it, so a single revert() on unmount cleans
   * up both - no stray triggers left driving a page that no longer exists.
   */
  useEffect(() => {
    if (loading) return undefined;

    const context = gsap.context((self) => {
      revealOnScroll(self.selector('[data-reveal]'), { y: 26 });
      revealFromSide(self.selector('[data-reveal-card]'), { x: 36, stagger: 0.07 });
    }, rootRef);

    return () => context.revert();
  }, [loading]);

  function scrollToStats() {
    document.getElementById('matches')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="ld-root" ref={rootRef}>
      <LandingNav />

      <main id="main">
        <Hero onExplore={scrollToStats} />

        <ClubStats
          standings={data.standings}
          loading={data.loading}
          failed={data.failed.standings}
        />

        <LatestMatches
          matches={data.matches}
          loading={data.loading}
          failed={data.failed.matches}
          canRead={data.canReadMatches}
        />

        <UpcomingMatch
          matches={data.matches}
          loading={data.loading}
          canRead={data.canReadMatches}
        />

        <SquadPreview
          players={data.players}
          loading={data.loading}
          failed={data.failed.players}
          canRead={data.canReadPlayers}
        />

        <ClubStory />

        <StandingsPreview
          standings={data.standings}
          loading={data.loading}
          failed={data.failed.standings}
        />

        <TopScorersPreview
          topScorers={data.topScorers}
          loading={data.loading}
          failed={data.failed.topScorers}
        />
      </main>

      <footer className="ld-footer">
        <span className="ld-brand">
          <span className="ld-crest" aria-hidden="true" />
          ClubManager
        </span>
        <nav className="ld-footer-links" aria-label="Footer">
          <Link to="/standings">Standings</Link>
          <Link to="/topscorers">Top scorers</Link>
          <Link to="/login">Login</Link>
        </nav>
      </footer>
    </div>
  );
}
