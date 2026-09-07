import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { countUp } from '../../animations/gsapAnimations';
import { summariseStandings } from '../../api/useLandingData';

/*
 * League-wide totals, derived from the public standings endpoint so the section
 * works signed out. Nothing here is hardcoded: every figure is computed from the
 * same rows the standings table renders.
 */
export default function ClubStats({ standings, loading, failed }) {
  const scopeRef = useRef(null);
  const totals = summariseStandings(standings);

  const figures = [
    { key: 'played', label: 'Matches played', value: totals.played },
    { key: 'wins', label: 'Wins', value: totals.wins },
    { key: 'goals', label: 'Goals', value: totals.goals },
    { key: 'points', label: 'Points', value: totals.points },
  ];

  useEffect(() => {
    if (loading || failed || standings.length === 0) return undefined;

    const context = gsap.context((self) => {
      self.selector('[data-count]').forEach((element) => {
        countUp(element, Number(element.dataset.count));
      });
    }, scopeRef);

    return () => context.revert();
  }, [loading, failed, standings.length, totals.played, totals.wins, totals.goals, totals.points]);

  return (
    <section className="ld-section ld-stats-section" ref={scopeRef} aria-labelledby="stats-title">
      <h2 id="stats-title" className="ld-visually-hidden">
        Competition statistics
      </h2>

      {failed ? (
        <p className="ld-empty">Statistics are unavailable right now.</p>
      ) : (
        <div className="ld-stats">
          {figures.map((figure) => (
            <div className="ld-stat" key={figure.key}>
              <span className="ld-stat-value" data-count={figure.value}>
                {loading ? '—' : figure.value}
              </span>
              <span className="ld-stat-label">{figure.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
