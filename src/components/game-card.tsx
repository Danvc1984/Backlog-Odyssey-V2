import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Game } from '@/lib/types';
import { platformIcons, genreIcons } from '@/components/icons';
import { Calendar, ImageOff } from 'lucide-react';
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
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-medium leading-tight line-clamp-2 mb-2">
          {game.title}
        </CardTitle>
        {game.releaseDate && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1.5" />
            {format(new Date(game.releaseDate), 'MMM yyyy')}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
        <Badge variant="secondary" className="flex items-center gap-1">
          {PlatformIcon && <PlatformIcon className="h-3 w-3" />}
          {game.platform}
        </Badge>
        {game.genres.map(genre => {
          const GenreIcon = genreIcons[genre];
          return (
            <Badge variant="secondary" key={genre} className="flex items-center gap-1">
              {GenreIcon && <GenreIcon className="h-3 w-3" />}
              {genre}
            </Badge>
          );
        })}
      </CardFooter>
    </Card>
  );
};

export default GameCard;
