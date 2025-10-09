
'use client';

import React, { useMemo } from 'react';
import { Game } from '@/lib/types';
import { ArrowBigRightDash } from 'lucide-react';
import Image from 'next/image';

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
    <div className="relative flex items-center justify-center gap-8">
      <Image 
        src="/hourglass.png" 
        alt="Hourglass flow" 
        width={96} 
        height={144}
        className="object-contain"
      />
      <div className="relative flex flex-col justify-between h-36 text-right">
        {/* Top: Backlog */}
        <div className="absolute top-0 right-0 flex items-center">
            <div className="text-right">
                <span className="text-2xl font-bold">{counts.backlog}</span>
                <p className="text-xs text-muted-foreground">Backlog</p>
            </div>
            <ArrowBigRightDash className="w-8 h-8 text-primary/70 -mr-2" />
        </div>

        {/* Middle: Now Playing */}
        <div className="absolute top-1/2 -translate-y-1/2 right-0 flex items-center">
             <div className="text-right">
                <span className="text-2xl font-bold">{counts.nowPlaying}</span>
                <p className="text-xs text-muted-foreground">Now Playing</p>
            </div>
            <ArrowBigRightDash className="w-8 h-8 text-accent/70 -mr-2" />
        </div>
        
        {/* Bottom: Recently Played */}
         <div className="absolute bottom-0 right-0 flex items-center">
             <div className="text-right">
                <span className="text-2xl font-bold">{counts.recentlyPlayed}</span>
                <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <ArrowBigRightDash className="w-8 h-8 text-green-500/70 -mr-2" />
        </div>
      </div>
    </div>
  );
};

export default BacklogFlow;
