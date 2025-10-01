'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

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
import type { Game, GameList, Platform, Genre } from '@/lib/types';
import { PLATFORMS, GENRES } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import Image from 'next/image';

const gameSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  platform: z.enum(PLATFORMS),
  genre: z.enum(GENRES),
  list: z.enum(["Wishlist", "Backlog", "Now Playing", "Recently Played"]),
});

type GameFormValues = z.infer<typeof gameSchema>;

type GameFormProps = {
  onAddGame: (game: Omit<Game, 'id' | 'userId'>) => void;
  defaultList?: GameList;
};

const API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

const GameForm: React.FC<GameFormProps> = ({ onAddGame, defaultList = 'Wishlist' }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedGameImageUrl, setSelectedGameImageUrl] = useState<string | null>(null);
  
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: '',
      list: defaultList,
    },
  });
  
  useEffect(() => {
    form.reset({ title: '', platform: undefined, genre: undefined, list: defaultList });
  }, [defaultList, form]);

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
    const platform = game.platforms?.map((p: any) => p.platform.name).find((p: any) => PLATFORMS.includes(p as any)) as Platform | undefined;
    if (platform) form.setValue('platform', platform);
    const genre = game.genres?.map((g: any) => g.name).find((g: any) => GENRES.includes(g as any)) as Genre | undefined;
    if (genre) form.setValue('genre', genre);
    setSelectedGameImageUrl(game.background_image);
    setSearchTerm('');
    setSearchResults([]);
  };

  function onSubmit(data: GameFormValues) {
    const imageUrl = selectedGameImageUrl || `https://picsum.photos/seed/${uuidv4()}/600/800`;
    const imageHint = selectedGameImageUrl ? `${data.title} game cover` : `${data.genre.toLowerCase()} game`;
    const newGame = { ...data, imageUrl, imageHint };
    onAddGame(newGame);
    toast({
      title: 'Game Added!',
      description: `${data.title} has been added to your library.`,
    });
    form.reset({ title: '', platform: undefined, genre: undefined, list: defaultList });
    setSelectedGameImageUrl(null);
  }

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
                  className="flex items-center justify-start gap-2 h-auto p-2"
                  onClick={() => handleSelectGame(game)}
                >
                  <Image
                    src={game.background_image}
                    alt={game.name}
                    width={40}
                    height={53}
                    className="object-cover rounded-sm aspect-[3/4]"
                  />
                  <span className="text-sm font-medium text-left">{game.name}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Genre</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a genre" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90">Add Game</Button>
      </form>
    </Form>
  );
};

export default GameForm;
