
'use client';

import React, { useMemo } from 'react';
import { Game } from '@/lib/types';
import { Card, CardContent } from './ui/card';
import Image from 'next/image';

type BacklogFlowProps = {
  games: Game[];
};

const StatCard = ({ count, label }: { count: number, label: string }) => (
  <Card className="bg-card/1 backdrop-blur-xs text-center border-none shadow-none py-1 px-1">
        <CardContent className="p-0">
            <span className="text-3xl font-bold text-primary">{count}</span>
            <p className="text-s font-bold text-foreground">{label}</p>
        </CardContent>
    </Card>
);

const BacklogFlow: React.FC<BacklogFlowProps> = ({ games }) => {
  const counts = useMemo(() => {
    return {
      backlog: games.filter(g => g.list === 'Backlog').length,
      nowPlaying: games.filter(g => g.list === 'Now Playing').length,
      recentlyPlayed: games.filter(g => g.list === 'Recently Played').length,
    };
  }, [games]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      
      <Image 
        src="/hourglass.webp" 
        alt="Hourglass flow" 
        width={450} 
        height={550}
        className="object-contain"
      />
      
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2">
        <StatCard count={counts.backlog} label="Games to Play" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <StatCard count={counts.nowPlaying} label="Now Playing" />
      </div>

      <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2">
        <StatCard count={counts.recentlyPlayed} label="Completed" />
      </div>
    </div>
  );
};

export default BacklogFlow;
