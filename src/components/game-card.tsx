

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Game, GameList } from '@/lib/types';
import { platformIcons, steamDeckCompatIcons, steamDeckCompatTooltips } from '@/components/icons';
import { Calendar, Clock, ImageOff, FolderKanban, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { motion } from 'framer-motion';
import React from 'react';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

type GameCardProps = {
  game: Game;
  onEdit: (game: Game) => void;
  onMove: (game: Game, newList: GameList) => void;
  onDelete: (game: Game) => void;
};

const gameLists: GameList[] = ["Now Playing", "Backlog", "Wishlist", "Recently Played"];

const GameCard: React.FC<GameCardProps> = ({ game, onEdit, onMove, onDelete }) => {
  const { preferences } = useUserPreferences();
  const PlatformIcon = platformIcons[game.platform];
  const SteamDeckCompatIcon = game.steamDeckCompat ? steamDeckCompatIcons[game.steamDeckCompat] : null;

  const compatIconColor = {
    verified: 'text-green-500',
    playable: 'text-yellow-500',
    unsupported: 'text-red-500',
    borked: 'text-red-700',
    unknown: 'text-muted-foreground',
  };

  return (
    <motion.div layout>
      <Card className="h-full group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 border-transparent hover:scale-105">
        <CardHeader className="p-0 relative aspect-[3/4]">
          {game.imageUrl ? (
            <Image
              src={game.imageUrl}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-card flex items-center justify-center">
              <ImageOff className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          {preferences?.playsOnSteamDeck && game.platform === 'PC' && SteamDeckCompatIcon && game.steamDeckCompat && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute top-2 right-2 bg-background/80 rounded-full p-1 backdrop-blur-sm">
                    <SteamDeckCompatIcon className={cn("h-5 w-5", compatIconColor[game.steamDeckCompat])} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{steamDeckCompatTooltips[game.steamDeckCompat]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow space-y-2">
          <CardTitle className="text-base font-medium leading-tight line-clamp-2">
            {game.title}
          </CardTitle>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className="space-y-1">
              {game.releaseDate && (
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1.5" />
                  {format(new Date(game.releaseDate), 'MMM yyyy')}
                </div>
              )}
              {game.estimatedPlaytime ? (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1.5" />
                  {game.estimatedPlaytime}h
                </div>
              ) : null}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onEdit(game)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" className="h-7 w-7 bg-primary/80 hover:bg-primary text-primary-foreground">
                    <FolderKanban className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {gameLists.filter(l => l !== game.list).map(list => (
                    <DropdownMenuItem key={list} onClick={() => onMove(game, list)}>
                      Move to {list}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500" onClick={() => onDelete(game)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
          <Link href={`/library?platform=${game.platform}`}>
            <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-primary/20">
              {PlatformIcon && <PlatformIcon className="h-3 w-3" />}
              {game.platform}
            </Badge>
          </Link>
          {(game.genres || []).map(genre => {
            return (
              <Link href={`/library?genre=${genre}`} key={genre}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
                      {genre}
                  </Badge>
              </Link>
            );
          })}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default React.memo(GameCard);
