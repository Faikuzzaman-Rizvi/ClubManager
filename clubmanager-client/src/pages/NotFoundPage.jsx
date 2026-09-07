import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States';

export default function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon="⚑"
        title="Page not found"
        message="Nothing lives at this address."
        action={
          <Link to="/standings" className="btn-secondary btn-small">
            Back to standings
          </Link>
        }
      />
    </div>
  );
}
