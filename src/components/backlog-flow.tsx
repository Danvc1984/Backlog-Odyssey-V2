
'use client';

import React, { useMemo } from 'react';
import { Game } from '@/lib/types';
import { ArrowBigRightDash, ArrowBigDownDash, ArrowBigUpDash } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from './ui/card';

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
    <div className="relative w-full h-full flex items-center justify-center">
      
      <Image 
        src="/hourglass.webp" 
        alt="Hourglass flow" 
        width={300} 
        height={400}
        className="object-contain"
      />
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64">
        <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-right">
                        <span className="text-2xl font-bold">{counts.backlog}</span>
                        <p className="text-xs text-muted-foreground">Games to Play</p>
                    </div>
                    <ArrowBigDownDash className="w-8 h-8 text-primary/70"/>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-right">
                        <span className="text-2xl font-bold">{counts.nowPlaying}</span>
                        <p className="text-xs text-muted-foreground">Now Playing</p>
                    </div>
                    <ArrowBigDownDash className="w-8 h-8 text-accent/70" />
                </div>
                <div className="flex items-center justify-between">
                     <div className="text-right">
                        <span className="text-2xl font-bold">{counts.recentlyPlayed}</span>
                        <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <ArrowBigUpDash className="w-8 h-8 text-green-500/70" />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BacklogFlow;
