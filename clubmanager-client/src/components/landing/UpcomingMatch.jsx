import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EntityImage from '../ui/EntityImage';
import { formatMatchDate } from '../../helpers/datetime';

const UNITS = [
  ['days', 86400000],
  ['hours', 3600000],
  ['minutes', 60000],
  ['seconds', 1000],
];

function breakdown(msRemaining) {
  let rest = Math.max(0, msRemaining);

  return UNITS.map(([label, size]) => {
    const value = Math.floor(rest / size);
    rest -= value * size;
    return { label, value };
  });
}

/**
 * The next scheduled fixture with a live countdown. No fixture is a real state,
 * not something to paper over with invented data.
 *
 * `now` lives in state and ticks once a second; the fixture is then picked
 * during render as the first future one. That keeps the render pure, and means
 * the card rolls on to the following fixture by itself once kick-off passes.
 */
export default function UpcomingMatch({ matches, loading, canRead }) {
  const scheduled = useMemo(
    () =>
      (matches ?? [])
        .filter((match) => match.status === 'Scheduled')
        .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate)),
    [matches],
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (scheduled.length === 0) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [scheduled.length]);

  const next = scheduled.find((match) => new Date(match.matchDate).getTime() > now) ?? null;

  if (!canRead || loading) {
    return null;
  }

  return (
    <section className="ld-section ld-next" aria-labelledby="next-title">
      <p className="ld-eyebrow">Up next</p>
      <h2 className="ld-section-title" id="next-title" data-reveal>
        Next match
      </h2>

      {!next ? (
        <div className="ld-empty ld-empty-cta">
          <p>No upcoming fixture is scheduled.</p>
          <Link to="/standings" className="ld-btn ld-btn-ghost">
            View the table
          </Link>
        </div>
      ) : (
        <div className="ld-next-card" data-reveal>
          <div className="ld-next-teams">
            <span className="ld-next-team">
              <EntityImage
                src={next.homeTeamLogoUrl}
                name={next.homeTeamName}
                variant="logo"
                className="ld-crest ld-crest-lg"
              />
              {next.homeTeamName}
            </span>
            <span className="ld-next-vs" aria-hidden="true">
              vs
            </span>
            <span className="ld-next-team">
              <EntityImage
                src={next.awayTeamLogoUrl}
                name={next.awayTeamName}
                variant="logo"
                className="ld-crest ld-crest-lg"
              />
              {next.awayTeamName}
            </span>
          </div>

          <p className="ld-next-when">
            <time dateTime={next.matchDate}>{formatMatchDate(next.matchDate)}</time>
            <span aria-hidden="true"> · </span>
            <span>{next.homeTeamName} home</span>
          </p>

          <ul className="ld-countdown" aria-label="Time until kick-off">
            {breakdown(new Date(next.matchDate).getTime() - now).map((unit) => (
              <li key={unit.label}>
                <span className="ld-countdown-value">{String(unit.value).padStart(2, '0')}</span>
                <span className="ld-countdown-label">{unit.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
