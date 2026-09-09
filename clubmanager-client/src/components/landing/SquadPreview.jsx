import { Link } from 'react-router-dom';
import SectionHeading from './SectionHeading';
import EntityImage from '../ui/EntityImage';

const MAX_CARDS = 8;

/**
 * A horizontal squad rail. /api/players is Admin-or-Coach, so everyone else
 * gets a clean invitation instead of a permission error.
 */
export default function SquadPreview({ players, loading, failed, canRead }) {
  const squad = (players ?? []).slice(0, MAX_CARDS);

  return (
    <section className="ld-section" id="squad" aria-labelledby="squad-title">
      <SectionHeading kicker="Players" title={<span id="squad-title">The squad</span>} />

      {!canRead ? (
        <div className="ld-empty ld-empty-cta">
          <p>Squad lists are managed inside the club area.</p>
          <Link to="/login" className="ld-btn ld-btn-ghost">
            Sign in to view
          </Link>
        </div>
      ) : failed ? (
        <p className="ld-empty">Could not load the squad right now.</p>
      ) : loading ? (
        <p className="ld-empty">Loading squad…</p>
      ) : squad.length === 0 ? (
        <p className="ld-empty">No players registered yet.</p>
      ) : (
        <ul className="ld-squad-rail">
          {squad.map((player) => (
            <li className="ld-player-card" key={player.playerId} data-reveal-card>
              <EntityImage
                src={player.imageUrl}
                name={player.name}
                variant="avatar"
                className="ld-player-avatar"
              />
              <span className="ld-player-number">
                {player.jerseyNumber != null ? String(player.jerseyNumber).padStart(2, '0') : '--'}
              </span>
              <span className="ld-player-name">{player.name}</span>
              <span className="ld-player-meta">
                {player.position ?? 'Squad player'}
                <i aria-hidden="true"> · </i>
                {player.teamName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
