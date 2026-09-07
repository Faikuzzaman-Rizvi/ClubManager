import MatchManager from '../../components/MatchManager';
import PageHeader from '../../components/ui/PageHeader';

export default function MatchesPage() {
  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="Schedule fixtures across every team, enter results and record goals. Coaches can do the same for their own team only."
      />

      <div className="card">
        <MatchManager />
      </div>
    </>
  );
}
