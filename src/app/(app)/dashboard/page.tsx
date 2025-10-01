'use client';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Game } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import GameCard from '@/components/game-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  const recentlyPlayed = useMemo(
    () => games.filter(g => g.list === 'Recently Played').slice(0, 5),
    [games]
  );

  if (dataLoading) {
    return <div className="text-center py-10">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-12">
      <Dashboard games={games} />
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-primary">
            Recently Played
          </h2>
          <Button variant="link" asChild>
            <Link href="/library">
              View full library <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
        {recentlyPlayed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {recentlyPlayed.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-lg">
            <p>You haven&apos;t played any games recently.</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/library">Add some games to get started!</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
