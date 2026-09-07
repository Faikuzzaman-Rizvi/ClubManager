import MatchManager from '../../components/MatchManager';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/useAuth';

export default function MatchResultEntry() {
  const { user } = useAuth();

  // Users.TeamId is only set for a Coach; without it the API refuses every
  // match write with 403, so say that rather than showing an empty board.
  if (user?.teamId == null) {
    return (
      <>
        <PageHeader title="Fixtures &amp; Results" />
        <div className="card">
          <p className="error" role="alert">
            This coach account is not linked to a team, so it cannot manage fixtures. Ask an admin
            to assign one.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Fixtures &amp; Results"
        subtitle="Matches your team is playing in. Enter the final score, then credit each goal to its scorer."
      />

      <div className="card">
        <MatchManager scopeTeamId={user.teamId} />
      </div>
    </>
  );
}
