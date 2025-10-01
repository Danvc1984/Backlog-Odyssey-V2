import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Game } from '@/lib/types';
import { platformIcons, genreIcons } from '@/components/icons';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

type GameCardProps = {
  game: Game;
};

const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const PlatformIcon = platformIcons[game.platform];
  const GenreIcon = genreIcons[game.genre];

  return (
    <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 border-transparent">
      <CardHeader className="p-0 relative">
        <Image
          src={game.imageUrl}
          alt={game.title}
          width={600}
          height={800}
          className="object-cover aspect-[3/4]"
        />
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
        <Badge variant="secondary" className="flex items-center gap-1">
          {GenreIcon && <GenreIcon className="h-3 w-3" />}
          {game.genre}
        </Badge>
      </CardFooter>
    </Card>
  );
};

export default GameCard;
