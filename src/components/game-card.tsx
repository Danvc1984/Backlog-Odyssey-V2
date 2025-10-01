
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Game } from '@/lib/types';
import { platformIcons } from '@/components/icons';
import { Calendar, ImageOff, Clock } from 'lucide-react';
import { format } from 'date-fns';

type GameCardProps = {
  game: Game;
};

const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const PlatformIcon = platformIcons[game.platform];

  return (
    <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 border-transparent">
      <CardHeader className="p-0 relative aspect-[3/4]">
        {game.imageUrl ? (
          <Image
            src={game.imageUrl}
            alt={game.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-card flex items-center justify-center">
            <ImageOff className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow space-y-2">
        <CardTitle className="text-base font-medium leading-tight line-clamp-2">
          {game.title}
        </CardTitle>
        <div className="text-xs text-muted-foreground space-y-1">
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
  );
};

export default GameCard;
