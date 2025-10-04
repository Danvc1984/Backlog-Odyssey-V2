
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { Layers, Search, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { db } from '@/lib/firebase';
import type { Game, GameList, Platform, Genre, SteamDeckCompat } from '@/lib/types';
import { Badge } from './ui/badge';
import { getSteamAppId } from '@/ai/flows/get-steam-app-id';
import { getSteamDeckCompat } from '@/app/api/steam/utils';

const API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

type RawgGame = {
  id: number;
  name: string;
  background_image: string | null;
  platforms: { platform: { name: string } }[];
  genres: { name: string }[];
  released: string;
  playtime: number;
};

type BatchAddGamesProps = {
  onAddGenre: (genre: Genre) => void;
  defaultList: GameList;
};

const BatchAddGames: React.FC<BatchAddGamesProps> = ({ onAddGenre, defaultList }) => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<RawgGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<RawgGame[]>([]);
  const [targetList, setTargetList] = useState<GameList>('Wishlist');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  
  useEffect(() => {
    if (defaultList) {
      setTargetList(defaultList);
    }
  }, [defaultList]);


  const searchGames = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await axios.get('https://api.rawg.io/api/games', {
        params: { key: API_KEY, search: query, page_size: 10 },
      });
      setSearchResults(response.data.results);
    } catch (error) {
      console.error('Error fetching from RAWG API:', error);
      toast({
        title: 'API Error',
        description: 'Could not fetch games. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);
  
  const searchSingleGame = useCallback(async (query: string): Promise<RawgGame | null> => {
    if (!query) return null;
    try {
      const response = await axios.get('https://api.rawg.io/api/games', {
        params: { key: API_KEY, search: query, page_size: 1 },
      });
      if (response.data.results.length > 0) {
        return response.data.results[0];
      }
      return null;
    } catch (error) {
      console.error(`Error fetching game "${query}":`, error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'search') return;
    const delayDebounceFn = setTimeout(() => {
      searchGames(searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchGames, activeTab]);

  const handleSelectGame = (game: RawgGame, checked: boolean) => {
    if (checked) {
      setSelectedGames(prev => [...prev, game]);
    } else {
      setSelectedGames(prev => prev.filter(g => g.id !== game.id));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
      toast({ title: 'Invalid File Type', description: 'Please upload a .txt file.', variant: 'destructive' });
      return;
    }

    setIsSearching(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const gameTitles = content.split('\n').map(title => title.trim()).filter(Boolean);
      
      const searchPromises = gameTitles.map(title => 
        searchSingleGame(title).then(game => ({ title, game }))
      );

      const results = await Promise.all(searchPromises);

      const foundGames: RawgGame[] = [];
      results.forEach(({ title, game }) => {
        if (game) {
          foundGames.push(game);
        } else {
          toast({ title: 'Game Not Found', description: `Could not find a match for "${title}".`, variant: 'destructive' });
        }
      });
      
      setSelectedGames(prev => [...prev, ...foundGames]);
      setIsSearching(false);
      
      if(foundGames.length > 0) {
        toast({ title: 'Games Found', description: `Found and selected ${foundGames.length} games from your file.`});
      }
    };
    reader.readAsText(file);
  };


  const handleBatchAdd = async () => {
    if (!user || !preferences) {
      toast({ title: 'Error', description: 'You must be logged in to add games.', variant: 'destructive' });
      return;
    }
    if (selectedGames.length === 0) {
      toast({ title: 'No Games Selected', description: 'Please select at least one game to add.', variant: 'destructive' });
      return;
    }

    setIsAdding(true);
    try {
      const batch = writeBatch(db);
      const gamesCollectionRef = collection(db, 'users', user.uid, 'games');

      const gameProcessingPromises = selectedGames.map(async (game) => {
        const gamePlatforms = game.platforms?.map(p => p.platform.name as Platform) || [];
        const userPlatforms = preferences.platforms || [];
        let platformToSet: Platform | undefined;

        if (preferences.favoritePlatform && gamePlatforms.includes(preferences.favoritePlatform)) {
          platformToSet = preferences.favoritePlatform;
        } else {
          platformToSet = gamePlatforms.find(p => userPlatforms.includes(p));
        }

        if (!platformToSet) {
          platformToSet = 'Others/ROMs';
        }

        const gameGenres = game.genres?.map(g => g.name as Genre) || [];
        gameGenres.forEach(onAddGenre);

        const newGame: Omit<Game, 'id'> = {
          userId: user.uid,
          title: game.name,
          platform: platformToSet,
          genres: gameGenres,
          list: targetList,
          imageUrl: game.background_image || '',
          releaseDate: game.released,
          estimatedPlaytime: game.playtime || 0,
        };

        if (newGame.platform === 'PC') {
          const { steamAppId } = await getSteamAppId({ title: newGame.title });
          if (steamAppId) {
            newGame.steamAppId = steamAppId;
            if (preferences.playsOnSteamDeck) {
              const steamDeckCompat = await getSteamDeckCompat(steamAppId);
              newGame.steamDeckCompat = steamDeckCompat;
            }
          }
        }
        return newGame;
      });

      const processedGames = await Promise.all(gameProcessingPromises);

      for (const gameData of processedGames) {
        const docRef = doc(gamesCollectionRef);
        batch.set(docRef, gameData);
      }

      await batch.commit();

      toast({
        title: 'Games Added!',
        description: `${selectedGames.length} games have been added to your ${targetList} list.`,
      });

      // Reset state
      setSearchTerm('');
      setSearchResults([]);
      setSelectedGames([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding games in batch:', error);
      toast({ title: 'Error', description: 'Could not add games. Please try again.', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };
  
   const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setSearchTerm('');
      setSearchResults([]);
      setSelectedGames([]);
      setTargetList(defaultList || 'Wishlist');
      setActiveTab('upload');
    }
    setIsOpen(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" /> Batch Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Batch Add Games</DialogTitle>
          <DialogDescription>
            Search for games or upload a file to add multiple games at once.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="upload">Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="search">
                 <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search for games to add..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="h-60 w-full rounded-md border">
                        <div className="p-4">
                        {isSearching && <p className="text-center text-muted-foreground">Searching...</p>}
                        {!isSearching && searchResults.length === 0 && (
                            <p className="text-center text-muted-foreground">
                            {searchTerm.length < 3 ? 'Enter at least 3 characters to search' : 'No results found.'}
                            </p>
                        )}
                        {searchResults.map(game => (
                            <div key={game.id} className="flex items-center space-x-4 p-2 rounded-md hover:bg-muted">
                            <Checkbox
                                id={`batch-game-${game.id}`}
                                checked={selectedGames.some(g => g.id === game.id)}
                                onCheckedChange={(checked) => handleSelectGame(game, !!checked)}
                                className="h-5 w-5"
                            />
                            <label htmlFor={`batch-game-${game.id}`} className="flex items-center gap-3 cursor-pointer flex-grow">
                                {game.background_image ? (
                                    <Image
                                        src={game.background_image}
                                        alt={game.name}
                                        width={45}
                                        height={60}
                                        className="object-cover rounded-sm aspect-[3/4]"
                                    />
                                ) : (
                                    <div className="w-[45px] h-[60px] bg-card rounded-sm flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground"/>
                                    </div>
                                )}
                                <span className="font-medium">{game.name}</span>
                            </label>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                 </div>
            </TabsContent>
            <TabsContent value="upload">
                <div className="space-y-4 py-4">
                    <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/50 p-8 text-center h-[296px]">
                        {isSearching ? (
                            <>
                                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
                                <h3 className="text-lg font-semibold">Searching for games...</h3>
                                <p className="text-sm text-muted-foreground">Please wait while we process your file.</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-10 w-10 text-muted-foreground mb-4"/>
                                <h3 className="text-lg font-semibold">Upload a file</h3>
                                <p className="text-sm text-muted-foreground mb-4">Upload a .txt file with one game title per line.</p>
                                <Input id="file-upload" type="file" className="w-auto" onChange={handleFileUpload} accept=".txt"/>
                            </>
                        )}
                    </div>
                </div>
            </TabsContent>
        </Tabs>
       
        <div className='space-y-2'>
            <p className='text-sm font-medium'>Selected Games ({selectedGames.length}):</p>
            <ScrollArea className="h-24 w-full rounded-md border p-2">
                {selectedGames.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {selectedGames.map(game => (
                        <Badge key={game.id} variant="secondary" className="flex items-center gap-2">
                            {game.name}
                             <button onClick={() => handleSelectGame(game, false)} className="text-muted-foreground hover:text-foreground">
                                <span className="sr-only">Remove {game.name}</span>
                                &times;
                            </button>
                        </Badge>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No games selected yet.</p>
                )}
            </ScrollArea>
        </div>
        
        <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-medium">{selectedGames.length} game(s) to be added to:</span>
            <Select value={targetList} onValueChange={(value: GameList) => setTargetList(value)}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add to a list" />
                </SelectTrigger>
                <SelectContent>
                    {(["Wishlist", "Backlog", "Now Playing", "Recently Played"] as GameList[]).map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleBatchAdd} disabled={isAdding || isSearching || selectedGames.length === 0}>
            {isAdding ? `Adding ${selectedGames.length} games...` : `Add ${selectedGames.length} Game(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchAddGames;

    