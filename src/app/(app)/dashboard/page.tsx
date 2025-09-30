'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Game } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import GameCard from '@/components/game-card';
import { Button } from '@/components/ui/button';

type DashboardPageProps = {
  games: Game[];
  dataLoading: boolean;
};

export default function DashboardPage({
  games = [],
  dataLoading,
}: DashboardPageProps) {
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
