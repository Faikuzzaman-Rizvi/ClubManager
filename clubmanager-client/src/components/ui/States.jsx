/*
 * The three states every data view needs, sharing one frame so a page reads
 * the same whether it is waiting, empty or broken.
 */
import Icon from './Icon';

const SYMBOL_MAP = {
  '⬢': 'teams',
  '⚉': 'players',
  '⚔': 'matches',
  '◷': 'clock',
  '◎': 'topscorers',
  '◈': 'chart',
  '▤': 'standings',
  '⚿': 'users',
  '○': 'empty',
  '∅': 'empty',
};

/** Shape-only placeholder. Avoids the spinner flash on a fast response. */
export function LoadingState({ rows = 4, label = 'Loading…' }) {
  return (
    <div className="skeleton-stack" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span className="skeleton skeleton-row" key={index} aria-hidden="true" />
      ))}
    </div>
  );
}

/** Says what is missing and, where possible, offers the way out. */
export function EmptyState({ icon = 'empty', title, message, action }) {
  let iconElement = null;
  if (icon) {
    const iconName = typeof icon === 'string' ? (SYMBOL_MAP[icon] || icon) : null;
    iconElement = iconName ? <Icon name={iconName} size={30} /> : icon;
  }

  return (
    <div className="state-block">
      {iconElement && (
        <span className="state-icon" aria-hidden="true">
          {iconElement}
        </span>
      )}
      {title && <h3>{title}</h3>}
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

/** Carries the API's own message where there is one, plus a way to retry. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-block state-block-error" role="alert">
      <span className="state-icon" aria-hidden="true">
        <Icon name="alert" size={30} />
      </span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary btn-small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
