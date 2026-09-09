import Icon from '../ui/Icon';

const SYMBOL_MAP = {
  '⬢': 'teams',
  '⚉': 'players',
  '⚔': 'matches',
  '◷': 'clock',
  '◎': 'topscorers',
  '◈': 'chart',
  '▤': 'standings',
};

/**
 * Modern Football Club KPI Card with variant coloring and subtle glow.
 */
export default function StatCard({
  label,
  value,
  icon,
  foot,
  accent = false,
  loading = false,
  variant,
}) {
  let renderedIcon = null;
  const iconKey = typeof icon === 'string' ? (SYMBOL_MAP[icon] || icon) : null;

  if (iconKey) {
    renderedIcon = <Icon name={iconKey} size={18} />;
  } else if (icon) {
    renderedIcon = icon;
  }

  // Derive variant if not explicitly given
  const resolvedVariant = variant || iconKey || (accent ? 'goals' : 'default');

  return (
    <div className={`stat-card stat-variant-${resolvedVariant} ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        {renderedIcon && (
          <span className="stat-icon-emblem" aria-hidden="true">
            {renderedIcon}
          </span>
        )}
      </div>

      <div className="stat-card-body">
        {loading ? (
          <span className="skeleton" style={{ height: '2.2rem', width: '4rem' }} aria-hidden="true" />
        ) : (
          <span className="stat-value">{value}</span>
        )}
      </div>

      {foot && (
        <div className="stat-foot-wrap">
          <span className="stat-foot">{foot}</span>
        </div>
      )}
    </div>
  );
}
