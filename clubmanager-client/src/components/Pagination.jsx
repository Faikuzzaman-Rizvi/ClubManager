import Icon from './ui/Icon';

/**
 * Client-side pager for the list screens. The API returns whole collections, so
 * the slicing happens in the page component and this only renders the controls.
 */
export default function Pagination({ page, pageSize, total, onPageChange, noun = 'rows' }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="pager">
      <span className="muted">
        Showing <strong>{first}–{last}</strong> of <strong>{total}</strong> {noun}
      </span>

      {pageCount > 1 && (
        <span className="pager-controls">
          <button
            type="button"
            className="btn-secondary btn-small pager-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={14} />
            <span>Prev</span>
          </button>
          <span className="pager-indicator">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn-secondary btn-small pager-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <span>Next</span>
            <Icon name="chevronRight" size={14} />
          </button>
        </span>
      )}
    </div>
  );
}
