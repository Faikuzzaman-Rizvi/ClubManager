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
        Showing {first}-{last} of {total} {noun}
      </span>

      {pageCount > 1 && (
        <span className="pager-controls">
          <button
            type="button"
            className="btn-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="btn-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            Next
          </button>
        </span>
      )}
    </div>
  );
}
