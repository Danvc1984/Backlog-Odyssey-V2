
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Game } from '@/lib/types';
import GameCard from '@/components/game-card';
import { Button } from '@/components/ui/button';

type GameListPreviewProps = {
  title: string;
  games: Game[];
};

const GameListPreview: React.FC<GameListPreviewProps> = ({ title, games }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          {title}
        </h2>
        <Button variant="link" asChild>
          <Link href="/library">
            View full library <ArrowRight className="ml-2" />
          </Link>
        </Button>
      </div>
      {games.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {games.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground bg-card rounded-lg">
          <p>No games in this list.</p>
           <Button variant="link" asChild className="mt-2">
              <Link href="/library">Add some games to get started!</Link>
            </Button>
        </div>
      )}
    </div>
  );
};

export default GameListPreview;
