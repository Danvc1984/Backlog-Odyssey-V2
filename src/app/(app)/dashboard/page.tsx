
'use client';
import { useMemo, useState, useEffect } from 'react';
import type { Game } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GameListPreview from '@/components/game-list-preview';

export default function DashboardPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const unsubscribe = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Game)
        );
        setGames(userGames);
        setDataLoading(false);
      });
      return () => unsubscribe();
    } else {
      setGames([]);
      setDataLoading(false);
    }
  }, [user]);

  const nowPlaying = useMemo(
    () => games.filter(g => g.list === 'Now Playing').slice(0, 5),
    [games]
  );
  const backlog = useMemo(
    () => games.filter(g => g.list === 'Backlog').slice(0, 5),
    [games]
  );
  const wishlist = useMemo(
    () => games.filter(g => g.list === 'Wishlist').slice(0, 5),
    [games]
  );

  if (dataLoading) {
    return <div className="text-center py-10">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-12">
      <Dashboard games={games} />
      <GameListPreview title="Now Playing" games={nowPlaying} />
      <GameListPreview title="Backlog" games={backlog} />
      <GameListPreview title="Wishlist" games={wishlist} />
    </div>
  );
}
