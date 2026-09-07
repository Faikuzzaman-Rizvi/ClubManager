import { useCallback, useEffect, useState } from 'react';
import axiosClient from './axiosClient';

/*
 * Dashboard feed for Admin and Coach. Both roles may read teams, matches and
 * the stats endpoints; /api/players returns every squad for an Admin and the
 * coach's own squad for a Coach, which is exactly what each dashboard wants.
 *
 * Requests settle independently so one failing endpoint degrades a single
 * widget rather than the whole page.
 */
export default function useDashboardData() {
  const [data, setData] = useState({
    loading: true,
    teams: [],
    players: [],
    matches: [],
    standings: [],
    topScorers: [],
    failed: {},
  });

  const load = useCallback(async () => {
    const [teams, players, matches, standings, topScorers] = await Promise.allSettled([
      axiosClient.get('/api/teams'),
      axiosClient.get('/api/players'),
      axiosClient.get('/api/matches'),
      axiosClient.get('/api/stats/standings'),
      axiosClient.get('/api/stats/topscorers'),
    ]);

    const value = (result) => (result.status === 'fulfilled' ? result.value.data : []);

    setData({
      loading: false,
      teams: value(teams),
      players: value(players),
      matches: value(matches),
      standings: value(standings),
      topScorers: value(topScorers),
      failed: {
        teams: teams.status === 'rejected',
        players: players.status === 'rejected',
        matches: matches.status === 'rejected',
        standings: standings.status === 'rejected',
        topScorers: topScorers.status === 'rejected',
      },
    });
  }, []);

  useEffect(() => {
    // False positive: load() is async and awaits before its first setState.
    // eslint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  return { ...data, reload: load };
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Splits a fixture list into played and upcoming, newest/soonest first. */
export function splitMatches(matches) {
  const now = Date.now();

  const played = matches
    .filter((match) => match.status === 'Completed')
    .sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));

  const upcoming = matches
    .filter((match) => match.status === 'Scheduled' && new Date(match.matchDate).getTime() >= now)
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

  return { played, upcoming };
}
