/** One KPI. Same shape every time - only the number and label change. */
export default function StatCard({ label, value, icon, foot, accent = false, loading = false }) {
  return (
    <div className={`stat-card ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        {icon && (
          <span className="stat-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <span className="skeleton" style={{ height: '1.9rem', width: '3.5rem' }} aria-hidden="true" />
      ) : (
        <span className="stat-value">{value}</span>
      )}

      {foot && <span className="stat-foot">{foot}</span>}
    </div>
  );
}
