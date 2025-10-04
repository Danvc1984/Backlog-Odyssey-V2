
'use client';

import * as React from 'react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PlusCircle, Search, Layers, Import, ArrowDownUp, ArrowDownAZ, ArrowUpZA } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';

import type { Game, Platform, Genre, GameList, SteamDeckCompat } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { getSteamDeckCompat } from '@/app/api/steam/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GameCard from '@/components/game-card';
import GameForm from '@/components/game-form';
import BatchAddGames from '@/components/batch-add-games';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SteamIcon } from '@/components/icons';

const gameLists: GameList[] = ['Now Playing', 'Backlog', 'Wishlist', 'Recently Played'];

type SortBy = 'default' | 'alpha-asc' | 'alpha-desc';

export default function LibraryPage() {
  const { user } = useAuth();
  const { preferences, loading: prefsLoading } = useUserPreferences();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [games, setGames] = useState<Game[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);

  const [activeList, setActiveList] = useState<GameList>('Now Playing');
  const [allGenres, setAllGenres] = useState<string[]>([]);
  
  const playsOnPC = useMemo(() => preferences?.platforms?.includes('PC') || false, [preferences]);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const unsubscribe = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Game)
        );
        setGames(userGames);
        
        const uniqueGenres = new Set(userGames.flatMap(game => game.genres || []).filter(g => g).map(g => g.trim()));
        setAllGenres(Array.from(uniqueGenres).sort());
        
        setDataLoading(false);
      });
      return () => unsubscribe();
    } else {
      setGames([]);
      setAllGenres([]);
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const list = searchParams.get('list') as GameList | null;
    const platform = searchParams.get('platform') as Platform | 'all' | null;
    const genre = searchParams.get('genre') as string | 'all' | null;
    
    if (list && gameLists.includes(list)) {
      setActiveList(list);
    }
    setPlatformFilter(platform || 'all');
    setGenreFilter(genre || 'all');
  }, [searchParams]);

  const updateQueryParam = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (value === 'all' || !value) {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`, { scroll: false });
  };
  
  const handlePlatformFilterChange = (value: Platform | 'all') => {
    setPlatformFilter(value);
    updateQueryParam('platform', value);
  };
  
  const handleGenreFilterChange = (value: string | 'all') => {
    setGenreFilter(value);
    updateQueryParam('genre', value);
  };

  const handleActiveListChange = (value: GameList) => {
    setActiveList(value);
    updateQueryParam('list', value);
  };

  const handleAddGame = async (newGame: Omit<Game, 'id' | 'userId'>) => {
    if (user && preferences) {
      let gameData: any = { ...newGame, userId: user.uid };
      if (gameData.platform === 'PC') {
         try {
            const response = await fetch(`/api/get-steam-details?title=${encodeURIComponent(gameData.title)}&checkCompat=${preferences.playsOnSteamDeck}`);
            const steamDetails = await response.json();
            if (steamDetails.steamAppId) {
                gameData.steamAppId = steamDetails.steamAppId;
            }
            if (steamDetails.steamDeckCompat) {
                gameData.steamDeckCompat = steamDetails.steamDeckCompat;
            }
        } catch (error) {
            console.error('Failed to fetch steam details', error);
        }
      }
      await addDoc(collection(db, 'users', user.uid, 'games'), gameData);
      setAddFormOpen(false);
    }
  };

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setEditFormOpen(true);
  };

  const handleUpdateGame = async (updatedGame: Omit<Game, 'id' | 'userId'>) => {
    if (user && editingGame && preferences) {
      const gameRef = doc(db, 'users', user.uid, 'games', editingGame.id);
      let gameData: any = { ...updatedGame };
       if (gameData.platform === 'PC') {
         try {
            const response = await fetch(`/api/get-steam-details?title=${encodeURIComponent(gameData.title)}&checkCompat=${preferences.playsOnSteamDeck}`);
            const steamDetails = await response.json();
            if (steamDetails.steamAppId) {
                gameData.steamAppId = steamDetails.steamAppId;
            } else {
                delete gameData.steamAppId;
            }
            if (steamDetails.steamDeckCompat) {
                gameData.steamDeckCompat = steamDetails.steamDeckCompat;
            } else {
                delete gameData.steamDeckCompat;
            }
        } catch (error) {
            console.error('Failed to fetch steam details', error);
        }
      }
      await updateDoc(gameRef, gameData);
      setEditFormOpen(false);
      setEditingGame(null);
      toast({
        title: 'Game Updated!',
        description: `${updatedGame.title} has been updated.`,
      });
    }
  };

  const handleMoveGame = async (game: Game, newList: GameList) => {
    if (user) {
      const gameRef = doc(db, 'users', user.uid, 'games', game.id);
      await updateDoc(gameRef, { list: newList });
      toast({
        title: 'Game Moved!',
        description: `${game.title} moved to ${newList}.`,
      });
    }
  };

  const confirmDeleteGame = (game: Game) => {
    setDeletingGame(game);
  };

  const handleDeleteGame = async () => {
    if (user && deletingGame) {
      await deleteDoc(doc(db, 'users', user.uid, 'games', deletingGame.id));
      toast({
        title: 'Game Deleted',
        description: `${deletingGame.title} has been removed from your library.`,
        variant: 'destructive'
      });
      setDeletingGame(null);
    }
  };

  const handleAddGenre = (newGenre: string) => {
    if (newGenre && !allGenres.map(g => g.toLowerCase()).includes(newGenre.toLowerCase())) {
        setAllGenres(prev => [...prev, newGenre].sort());
    }
  };
  
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || game.platform === platformFilter;
      const matchesGenre = genreFilter === 'all' || (game.genres && game.genres.includes(genreFilter));
      return matchesSearch && matchesPlatform && matchesGenre;
    });
  }, [games, searchTerm, platformFilter, genreFilter]);

  const gamesByList = useMemo(() => {
    return gameLists.reduce((acc, list) => {
      let listGames = filteredGames.filter(game => game.list === list);
      if (sortBy === 'alpha-asc') {
        listGames = listGames.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'alpha-desc') {
        listGames = listGames.sort((a, b) => b.title.localeCompare(a.title));
      }
      acc[list] = listGames;
      return acc;
    }, {} as Record<GameList, Game[]>);
  }, [filteredGames, sortBy]);


  const sortedPlatforms = useMemo(() => {
    if (!preferences?.platforms) return [];
    return [...preferences.platforms].sort((a, b) => {
      if (a === 'Others/ROMs') return 1;
      if (b === 'Others/ROMs') return -1;
      return a.localeCompare(b);
    });
  }, [preferences?.platforms]);

  const handleSortToggle = () => {
    setSortBy(prev => {
      if (prev === 'default') return 'alpha-asc';
      if (prev === 'alpha-asc') return 'alpha-desc';
      return 'default';
    });
  };

  const sortIcon = useMemo(() => {
    if (sortBy === 'alpha-asc') return <ArrowDownAZ />;
    if (sortBy === 'alpha-desc') return <ArrowUpZA />;
    return <ArrowDownUp />;
  }, [sortBy]);
  
  if (prefsLoading) {
    return <div className="text-center py-10">Loading library...</div>;
  }

  return (
    <TooltipProvider>
      <div>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-primary">My Library</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {playsOnPC && (
              <Button variant="outline" onClick={() => router.push('/profile')}>
                <SteamIcon className="mr-2 h-4 w-4" />
                Import from Steam
              </Button>
            )}
            <BatchAddGames onAddGenre={handleAddGenre} defaultList={activeList} />
            <Dialog open={isAddFormOpen} onOpenChange={setAddFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add a New Game</DialogTitle>
                </DialogHeader>
                <GameForm onSave={handleAddGame} defaultList={activeList} allGenres={allGenres} onAddGenre={handleAddGenre} />
              </DialogContent>
            </Dialog>

            <Dialog open={isEditFormOpen} onOpenChange={setEditFormOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Game</DialogTitle>
                </DialogHeader>
                <GameForm 
                  onSave={handleUpdateGame} 
                  allGenres={allGenres} 
                  onAddGenre={handleAddGenre}
                  gameToEdit={editingGame} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              className="pl-10"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="icon" onClick={handleSortToggle}>
              {sortIcon}
            </Button>
            <Select value={platformFilter} onValueChange={handlePlatformFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {sortedPlatforms.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genreFilter} onValueChange={handleGenreFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {allGenres.map((g,i) => (
                  <SelectItem key={`${g}-${i}`} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeList} onValueChange={(value) => handleActiveListChange(value as GameList)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            {gameLists.map(list => (
              <TabsTrigger key={list} value={list}>{list}</TabsTrigger>
            ))}
          </TabsList>
          {gameLists.map(list => (
            <TabsContent key={list} value={list}>
               {dataLoading ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground col-span-full text-center py-10"
                >
                  Loading games...
                </motion.p>
               ) : (
                <motion.div
                  key={activeList}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                  <AnimatePresence>
                    {gamesByList[list].length > 0 ? (
                      gamesByList[list].map((game) => (
                          <GameCard 
                            key={game.id}
                            game={game} 
                            onEdit={handleEditGame} 
                            onMove={handleMoveGame} 
                            onDelete={confirmDeleteGame} 
                          />
                      ))
                    ) : (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-muted-foreground col-span-full text-center py-10"
                      >
                        No games in this list.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
               )}
            </TabsContent>
          ))}
        </Tabs>
        <AlertDialog open={!!deletingGame} onOpenChange={() => setDeletingGame(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete "{deletingGame?.title}" from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingGame(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGame}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

    