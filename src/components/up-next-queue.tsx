
'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, PlayCircle } from 'lucide-react';
import Image from 'next/image';

import type { Game, GameList } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from './ui/badge';
import { platformIcons } from './icons';

interface UpNextQueueProps {
  games: Game[];
  onMoveGame: (game: Game, list: GameList) => void;
}

const UpNextQueue: React.FC<UpNextQueueProps> = ({ games, onMoveGame }) => {
  // Placeholder logic for selecting games
  const upNextGames = useMemo(() => {
    const backlogGames = games.filter(g => g.list === 'Backlog');
    const wishlistGames = games.filter(g => g.list === 'Wishlist');
    
    // Simple placeholder logic: take some from backlog, some from wishlist
    return [...backlogGames.slice(0, 3), ...wishlistGames.slice(0, 2)];
  }, [games]);

  if (upNextGames.length === 0) {
    return null;
  }

  const reasons = [
    "Because you loved other open-world RPGs.",
    "A perfect short adventure to play next.",
    "It's a highly-rated classic in a genre you enjoy.",
    "Based on your recent activity, this seems like a great fit.",
    "A great game to tackle from your wishlist."
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Up Next Queue</h2>
      </div>
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {upNextGames.map((game, index) => {
            const PlatformIcon = platformIcons[game.platform];
            return (
              <CarouselItem key={game.id} className="md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-1 h-full"
                >
                  <Card className="overflow-hidden h-full flex flex-col group">
                    <div className="relative aspect-video">
                      {game.imageUrl ? (
                        <Image
                          src={game.imageUrl}
                          alt={game.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="bg-muted w-full h-full" />
                      )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                       <div className="absolute bottom-4 left-4">
                        <h3 className="text-xl font-bold text-white shadow-black [text-shadow:0_2px_4px_var(--tw-shadow-color)]">{game.title}</h3>
                       </div>
                    </div>
                    <CardContent className="p-4 flex-grow flex flex-col justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground italic mb-3">"{reasons[index % reasons.length]}"</p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                                {PlatformIcon && <PlatformIcon className="h-3 w-3" />}
                                {game.platform}
                            </Badge>
                           {(game.genres || []).slice(0, 2).map(genre => (
                                <Badge key={genre} variant="secondary">{genre}</Badge>
                           ))}
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-accent hover:bg-accent/90" onClick={() => onMoveGame(game, 'Now Playing')}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Move to Now Playing
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="ml-14" />
        <CarouselNext className="mr-14" />
      </Carousel>
    </div>
  );
};

export default UpNextQueue;
