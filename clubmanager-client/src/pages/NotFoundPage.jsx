import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="card">
      <h1>Page not found</h1>
      <p className="muted">
        Nothing lives at this address. <Link to="/standings">Back to standings</Link>.
      </p>
    </div>
  );
}
