
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, Image as ImageIcon, Calendar as CalendarIcon, Star } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import type { Game, GameList, Platform, Genre, SteamDeckCompat } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Image from 'next/image';
import { MultiSelect } from './ui/multi-select';
import { cn } from '@/lib/utils';
import { Calendar } from './ui/calendar';
import { getSteamDeckCompat } from '@/app/api/steam/utils';

const gameSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  platform: z.custom<Platform>(val => typeof val === 'string' && val.length > 0, 'Platform is required.'),
  genres: z.array(z.string()).min(1, 'Please select at least one genre.'),
  list: z.enum(["Wishlist", "Backlog", "Now Playing", "Recently Played"]),
  releaseDate: z.string().optional(),
  estimatedPlaytime: z.coerce.number().optional(),
  steamAppId: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
});

type GameFormValues = z.infer<typeof gameSchema>;

type GameFormProps = {
  onSave: (game: Omit<Game, 'id' | 'userId'>) => void;
  defaultList?: GameList;
  allGenres: Genre[];
  onAddGenre: (genre: Genre) => void;
  gameToEdit?: Game | null;
};

const API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

const GameForm: React.FC<GameFormProps> = ({ onSave, defaultList = 'Wishlist', allGenres, onAddGenre, gameToEdit }) => {
  const { toast } = useToast();
  const { preferences } = useUserPreferences();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGameImageUrl, setSelectedGameImageUrl] = useState<string | null>(null);
  const [newGenre, setNewGenre] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: gameToEdit?.title || '',
      platform: gameToEdit?.platform || preferences?.favoritePlatform,
      genres: gameToEdit?.genres || [],
      list: gameToEdit?.list || defaultList,
      releaseDate: gameToEdit?.releaseDate || '',
      estimatedPlaytime: gameToEdit?.estimatedPlaytime || 0,
      steamAppId: gameToEdit?.steamAppId || undefined,
      rating: gameToEdit?.rating || 0,
    },
  });

  const currentRating = form.watch('rating');

  useEffect(() => {
    if (gameToEdit) {
      form.reset({
        title: gameToEdit.title,
        platform: gameToEdit.platform,
        genres: gameToEdit.genres,
        list: gameToEdit.list,
        releaseDate: gameToEdit.releaseDate,
        estimatedPlaytime: gameToEdit.estimatedPlaytime,
        steamAppId: gameToEdit.steamAppId,
        rating: gameToEdit.rating,
      });
      setSelectedGameImageUrl(gameToEdit.imageUrl);
    } else {
      form.reset({
        title: '',
        platform: preferences?.favoritePlatform,
        genres: [],
        list: defaultList,
        releaseDate: '',
        estimatedPlaytime: 0,
        steamAppId: undefined,
        rating: 0,
      });
      setSelectedGameImageUrl(null);
    }
  }, [gameToEdit, defaultList, form, preferences]);

  const searchGames = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await axios.get('https://api.rawg.io/api/games', {
        params: {
          key: API_KEY,
          search: query,
          page_size: 5,
          stores: 'steam',
        },
      });
      setSearchResults(response.data.results);
    } catch (error) {
      console.error('Error fetching from RAWG API:', error);
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchGames(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchGames]);

  const handleSelectGame = (game: any) => {
    form.setValue('title', game.name);
    
    const favoritePlatform = preferences?.favoritePlatform;
    const userPlatforms = preferences?.platforms || [];
    const gamePlatforms = game.platforms?.map((p: any) => p.platform.name as Platform) || [];
    
    let platformToSet: Platform | undefined;

    if (favoritePlatform && gamePlatforms.includes(favoritePlatform)) {
      platformToSet = favoritePlatform;
    } else {
      platformToSet = gamePlatforms.find((p: Platform) => userPlatforms.includes(p));
    }
    
    if (platformToSet) {
      form.setValue('platform', platformToSet);
    } else if (userPlatforms.includes('Others/ROMs')) {
      form.setValue('platform', 'Others/ROMs');
    }

    const gameGenres = game.genres?.map((g: any) => g.name) as Genre[] || [];
    if (gameGenres.length > 0) {
      gameGenres.forEach(genre => onAddGenre(genre));
      form.setValue('genres', gameGenres);
    }

    if (game.released) form.setValue('releaseDate', game.released);
    if (game.playtime) form.setValue('estimatedPlaytime', game.playtime);
    if (game.background_image) {
      setSelectedGameImageUrl(game.background_image);
    } else {
      setSelectedGameImageUrl(null);
    }

    const steamStore = game.stores?.find((s: any) => s.store.slug === 'steam');
    if (steamStore) {
        const urlParts = steamStore.url.split('/');
        const appIdIndex = urlParts.indexOf('app');
        if (appIdIndex > -1 && urlParts.length > appIdIndex + 1) {
            const steamAppId = parseInt(urlParts[appIdIndex + 1], 10);
            form.setValue('steamAppId', steamAppId);
        }
    }


    setSearchTerm('');
    setSearchResults([]);
  };

  async function onSubmit(data: GameFormValues) {
    let steamDeckCompat: SteamDeckCompat = 'unknown';
    if (preferences?.playsOnSteamDeck && data.platform === 'PC' && data.steamAppId) {
      steamDeckCompat = await getSteamDeckCompat(data.steamAppId);
    }

    const newGame = { 
      ...data,
      imageUrl: selectedGameImageUrl || '',
      steamDeckCompat,
      rating: data.rating === 0 ? undefined : data.rating,
    };
    
    onSave(newGame as Omit<Game, 'id' | 'userId'>);
    if(!gameToEdit) {
      toast({
        title: 'Game Added!',
        description: `${data.title} has been added to your library.`,
      });
      form.reset({ title: '', platform: preferences?.favoritePlatform, genres: [], list: defaultList, releaseDate: '', estimatedPlaytime: 0, steamAppId: undefined, rating: 0 });
      setSelectedGameImageUrl(null);
    }
  }

  const handleAddNewGenre = () => {
    if (newGenre && !allGenres.includes(newGenre as Genre)) {
      onAddGenre(newGenre as Genre);
      form.setValue('genres', [...form.getValues('genres'), newGenre]);
      setNewGenre('');
    }
  };

  const sortedPlatforms = useMemo(() => {
    if (!preferences?.platforms) return [];
    return [...preferences.platforms].sort((a, b) => {
      if (a === 'Others/ROMs') return 1;
      if (b === 'Others/ROMs') return -1;
      return a.localeCompare(b);
    });
  }, [preferences?.platforms]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <Popover open={searchTerm.length > 0 && searchResults.length > 0}>
          <PopoverTrigger asChild>
            <div className="relative">
               <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Search for a game..." 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          setSearchTerm(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Search className="absolute top-9 right-3 h-4 w-4 text-muted-foreground" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <div className="flex flex-col gap-1">
              {searchResults.map((game) => (
                <Button
                  key={game.id}
                  variant="ghost"
                  type="button"
                  className="flex items-center justify-start gap-2 h-auto p-2"
                  onClick={() => handleSelectGame(game)}
                >
                  {game.background_image ? <Image
                    src={game.background_image}
                    alt={game.name}
                    width={40}
                    height={53}
                    className="object-cover rounded-sm aspect-[3/4]"
                  /> : <div className="w-10 h-[53px] bg-muted rounded-sm flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground"/></div>}
                  <span className="text-sm font-medium text-left">{game.name}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
         <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Rating</FormLabel>
              <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-6 w-6 cursor-pointer transition-colors',
                      (hoverRating || currentRating || 0) >= star
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground'
                    )}
                    onMouseEnter={() => setHoverRating(star)}
                    onClick={() => field.onChange(star === currentRating ? 0 : star)}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Platform</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sortedPlatforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="genres"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genres</FormLabel>
                 <MultiSelect
                  options={allGenres.map(g => ({ value: g, label: g }))}
                  onValueChange={field.onChange}
                  value={field.value}
                  placeholder="Select genres"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <FormLabel>Add Another Genre</FormLabel>
          <div className="flex gap-2">
            <Input 
              placeholder="e.g. Metroidvania" 
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={handleAddNewGenre}>Add</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="releaseDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Release Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(new Date(field.value), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      captionLayout="dropdown-buttons"
                      fromYear={1900}
                      toYear={new Date().getFullYear() + 5}
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimatedPlaytime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Est. Playtime (hrs)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 40" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="list"
          render={({ field }) => (
            <FormItem>
              <FormLabel>List</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Add to a list" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["Wishlist", "Backlog", "Now Playing", "Recently Played"] as GameList[]).map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90">{gameToEdit ? 'Save Changes' : 'Add Game'}</Button>
      </form>
    </Form>
  );
};

export default GameForm;
