
'use client';
import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, PlayCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';

import { getUpNextSuggestions, GetUpNextSuggestionsOutput } from '@/ai/flows/get-up-next-suggestions';
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
import { useToast } from '@/hooks/use-toast';

interface UpNextQueueProps {
  games: Game[];
  onMoveGame: (game: Game, list: GameList) => void;
}

const UpNextQueue: React.FC<UpNextQueueProps> = ({ games, onMoveGame }) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<GetUpNextSuggestionsOutput['suggestions']>([]);
  const [loading, setLoading] = useState(true);

  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (games.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = await getUpNextSuggestions({
          gameLibrary: games.map(g => ({
            id: g.id,
            title: g.title,
            platform: g.platform,
            genres: g.genres,
            list: g.list,
            rating: g.rating,
            playtimeNormally: g.playtimeNormally,
          })),
          gamingHabits: "I'm looking for something fun to play next.", 
        });
        setSuggestions(result.suggestions || []);
      } catch (error) {
        console.error("Failed to get 'Up Next' suggestions:", error);
        toast({
          title: "Couldn't Load Up Next Suggestions",
          description: "There was an error getting suggestions. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [games, toast]);


  const upNextGames = useMemo(() => {
    return suggestions
      .map(suggestion => {
        const game = games.find(g => g.id === suggestion.gameId);
        return game ? { ...game, reason: suggestion.reason } : null;
      })
      .filter((g): g is Game & { reason: string } => g !== null);
  }, [suggestions, games]);

  if (loading) {
     return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold tracking-tight">Up Next</h2>
            </div>
             <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Curating your next adventure...</p>
             </div>
        </div>
     )
  }

  if (upNextGames.length === 0) {
    return null; 
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Up Next</h2>
        </div>
        <p className="text-muted-foreground ml-11">Based on your library and preferences, here are some games we think you'll love next.</p>
      </div>
      <Carousel
        plugins={[plugin.current]}
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {upNextGames.map((game, index) => {
            const PlatformIcon = platformIcons[game.platform];
            return (
              <CarouselItem key={game.id} className="md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2, ease: "circOut" }}
                  className="p-1 h-full"
                >
                  <Card className="h-full flex flex-col group border-transparent">
                    <div className="relative aspect-video overflow-hidden rounded-t-lg">
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
                        <p className="text-sm text-muted-foreground italic mb-3">"{game.reason}"</p>
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
