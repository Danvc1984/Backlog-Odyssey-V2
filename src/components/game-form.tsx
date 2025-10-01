'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';

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
import type { Game, GameList } from '@/lib/types';
import { PLATFORMS, GENRES } from '@/lib/constants';

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

const GameForm: React.FC<GameFormProps> = ({ onAddGame, defaultList = 'Wishlist' }) => {
  const { toast } = useToast();
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: '',
      list: defaultList,
    },
  });

  function onSubmit(data: GameFormValues) {
    const seed = uuidv4();
    const newGame = { ...data, imageUrl: `https://picsum.photos/seed/${seed}/600/800`, imageHint: `${data.genre.toLowerCase()} game` };
    onAddGame(newGame);
    toast({
      title: 'Game Added!',
      description: `${data.title} has been added to your library.`,
    });
    form.reset({ title: '', platform: undefined, genre: undefined, list: defaultList });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="The Legend of Zelda..." {...field} />
              </FormControl>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
