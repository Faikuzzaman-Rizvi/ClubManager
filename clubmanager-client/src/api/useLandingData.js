import { useCallback, useEffect, useState } from 'react';
import axiosClient from './axiosClient';
import { useAuth } from '../context/useAuth';

/*
 * Feeds the landing page from the existing API.
 *
 * Only /api/stats/* is anonymous. /api/matches needs any token, and /api/players
 * is Admin-or-Coach. Those calls are gated on what the current visitor may
 * actually read, which matters twice over: it avoids a guaranteed 403, and a 401
 * would otherwise trip the axios interceptor and eject a signed-out visitor to
 * /login just for opening the home page.
 *
 * Each request settles independently, so one failure leaves the rest of the page
 * intact rather than blanking it.
 */
export default function useLandingData() {
  const { isAuthenticated, role } = useAuth();
  const canReadMatches = isAuthenticated;
  const canReadPlayers = role === 'Admin' || role === 'Coach';

  const [data, setData] = useState({
    loading: true,
    standings: [],
    topScorers: [],
    matches: null,
    players: null,
    failed: {},
  });

  const load = useCallback(async () => {
    const requests = [
      axiosClient.get('/api/stats/standings'),
      axiosClient.get('/api/stats/topscorers'),
      canReadMatches ? axiosClient.get('/api/matches') : Promise.resolve(null),
      canReadPlayers ? axiosClient.get('/api/players') : Promise.resolve(null),
    ];

    const [standings, topScorers, matches, players] = await Promise.allSettled(requests);
    const value = (result) => (result.status === 'fulfilled' ? result.value?.data ?? null : null);

    setData({
      loading: false,
      standings: value(standings) ?? [],
      topScorers: value(topScorers) ?? [],
      matches: value(matches),
      players: value(players),
      failed: {
        standings: standings.status === 'rejected',
        topScorers: topScorers.status === 'rejected',
        matches: matches.status === 'rejected',
        players: players.status === 'rejected',
      },
    });
  }, [canReadMatches, canReadPlayers]);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  return { ...data, canReadMatches, canReadPlayers };
}

/** League-wide totals. Each match appears once per side, hence the halving. */
export function summariseStandings(standings) {
  const totals = standings.reduce(
    (sum, row) => ({
      played: sum.played + row.played,
      wins: sum.wins + row.won,
      goals: sum.goals + row.goalsFor,
      points: sum.points + row.points,
    }),
    { played: 0, wins: 0, goals: 0, points: 0 },
  );

  return { ...totals, played: Math.round(totals.played / 2) };
}
