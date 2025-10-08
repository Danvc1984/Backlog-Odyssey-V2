
'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PlusCircle, Search, Layers, ArrowDownUp, ArrowDownAZ, ArrowUpZA, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { Game, Platform, GameList } from '@/lib/types';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useDeals } from '@/hooks/use-deals';
import { useGameLibrary } from '@/hooks/use-game-library';

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
import { SteamIcon } from '@/components/icons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const gameLists: GameList[] = ['Now Playing', 'Backlog', 'Wishlist', 'Recently Played'];

type SortBy = 'default' | 'alpha-asc' | 'alpha-desc';

export default function LibraryPage() {
  const { preferences, loading: prefsLoading } = useUserPreferences();
  const { deals } = useDeals();
  const {
    games,
    loading: dataLoading,
    allGenres,
    handleUpdateGame,
    handleMoveGame,
    handleDeleteGame,
    handleAddGame,
    handleAddGenre,
    confirmDeleteGame,
    setDeletingGame,
    deletingGame,
    editingGame,
    setEditingGame,
    isEditFormOpen,
    setEditFormOpen,
  } = useGameLibrary();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('default');
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  
  const [activeList, setActiveList] = useState<GameList>('Now Playing');
  
  const playsOnPC = useMemo(() => preferences?.platforms?.includes('PC') || false, [preferences]);

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
    setShowDealsOnly(false); // Reset deals filter when changing lists
    updateQueryParam('list', value);
  };

  const onAddGame = async (newGame: Omit<Game, 'id' | 'userId'>) => {
    await handleAddGame(newGame);
    setAddFormOpen(false);
  }

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || game.platform === platformFilter;
      const matchesGenre = genreFilter === 'all' || (game.genres && game.genres.includes(genreFilter));
      
      let matchesDeals = true;
      if (activeList === 'Wishlist' && showDealsOnly && preferences?.notifyDiscounts) {
          matchesDeals = !!(game.steamAppId && deals[game.steamAppId]);
      }

      return matchesSearch && matchesPlatform && matchesGenre && matchesDeals;
    });
  }, [games, searchTerm, platformFilter, genreFilter, activeList, showDealsOnly, deals, preferences]);

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
  
  if (prefsLoading || dataLoading) {
    return (
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Loading library...</p>
            </div>
        </div>
    );
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
                <GameForm onSave={onAddGame} defaultList={activeList} allGenres={allGenres} onAddGenre={handleAddGenre} />
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
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleSortToggle}>
              {sortIcon}
            </Button>
            <Select value={platformFilter} onValueChange={handlePlatformFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {allGenres.map((g,i) => (
                  <SelectItem key={`${g}-${i}`} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             {activeList === 'Wishlist' && playsOnPC && preferences?.notifyDiscounts && (
                <div className="flex items-center space-x-2">
                    <Switch
                        id="deals-only"
                        checked={showDealsOnly}
                        onCheckedChange={setShowDealsOnly}
                        className={cn(showDealsOnly && 'data-[state=checked]:bg-green-600')}
                    />
                    <Label htmlFor="deals-only">Show Deals Only</Label>
                </div>
            )}
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
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-muted-foreground col-span-full text-center py-10 flex flex-col items-center gap-4"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span>Loading games...</span>
                </motion.div>
                ) : (
                <motion.div
                  key={activeList}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                  <AnimatePresence>
                    {gamesByList[list].length > 0 ? (
                      gamesByList[list].map((game, index) => (
                          <GameCard 
                            key={game.id}
                            game={game}
                            deal={list === 'Wishlist' && game.steamAppId ? deals[game.steamAppId] : undefined}
                            onEdit={setEditingGame} 
                            onMove={handleMoveGame} 
                            onDelete={confirmDeleteGame}
                            priority={index === 0}
                          />
                      ))
                    ) : (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-muted-foreground col-span-full text-center py-10"
                      >
                        {showDealsOnly ? "No games with deals found." : "No games in this list."}
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
              <AlertDialogAction onClick={() => handleDeleteGame(deletingGame!)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
