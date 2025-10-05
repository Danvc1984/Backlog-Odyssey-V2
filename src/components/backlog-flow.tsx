
'use client';

import React, { useMemo } from 'react';
import { Game } from '@/lib/types';
import { Cog, Package, PackageCheck } from 'lucide-react';
import { Card } from './ui/card';

type BacklogFlowProps = {
  games: Game[];
};

const BacklogFlow: React.FC<BacklogFlowProps> = ({ games }) => {
  const counts = useMemo(() => {
    return {
      backlog: games.filter(g => g.list === 'Backlog').length,
      nowPlaying: games.filter(g => g.list === 'Now Playing').length,
      recentlyPlayed: games.filter(g => g.list === 'Recently Played').length,
    };
  }, [games]);

  return (
    <div className="relative w-48 h-64 flex flex-col items-center justify-between">
      {/* Hourglass SVG background */}
      <svg
        className="absolute w-full h-full text-border"
        viewBox="0 0 100 160"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 5 L95 5" />
        <path d="M5 5 L50 80 L5 155" />
        <path d="M95 5 L50 80 L95 155" />
        <path d="M5 155 L95 155" />
      </svg>
      
      {/* Top Section: Backlog */}
      <div className="z-10 flex flex-col items-center text-center pt-4">
        <Package className="w-8 h-8 text-primary" />
        <span className="text-2xl font-bold">{counts.backlog}</span>
        <span className="text-xs text-muted-foreground">Backlog</span>
      </div>

      {/* Middle Section: Now Playing */}
      <div className="z-10 flex flex-col items-center text-center">
        <Cog className="w-8 h-8 text-accent animate-spin" style={{ animationDuration: '5s' }}/>
        <span className="text-2xl font-bold">{counts.nowPlaying}</span>
        <span className="text-xs text-muted-foreground">Now Playing</span>
      </div>

      {/* Bottom Section: Recently Played */}
      <div className="z-10 flex flex-col items-center text-center pb-4">
         <PackageCheck className="w-8 h-8 text-green-500" />
        <span className="text-2xl font-bold">{counts.recentlyPlayed}</span>
        <span className="text-xs text-muted-foreground">Completed</span>
      </div>
    </div>
  );
};

export default BacklogFlow;
