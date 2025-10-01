'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';

import type { Game, Platform, Genre, GameList } from '@/lib/types';
import { GENRES, PLATFORMS } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GameCard from '@/components/game-card';
import GameForm from '@/components/game-form';

const gameLists: GameList[] = ['Now Playing', 'Backlog', 'Wishlist', 'Recently Played'];

export default function LibraryPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [genreFilter, setGenreFilter] = useState<Genre | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeList, setActiveList] = useState<GameList>('Now Playing');

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const unsubscribe = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Game)
        );
        setGames(userGames);
        setDataLoading(false);
      });
      return () => unsubscribe();
    } else {
      setGames([]);
      setDataLoading(false);
    }
  }, [user]);

  const handleAddGame = async (newGame: Omit<Game, 'id' | 'userId'>) => {
    if (user) {
      const gameWithUser = { ...newGame, userId: user.uid };
      const userGamesCollection = collection(db, 'users', user.uid, 'games');
      await addDoc(userGamesCollection, gameWithUser);
      setIsFormOpen(false);
    }
  };

  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || game.platform === platformFilter;
      const matchesGenre = genreFilter === 'all' || game.genre === genreFilter;
      return matchesSearch && matchesPlatform && matchesGenre;
    });
  }, [games, searchTerm, platformFilter, genreFilter]);

  const gamesByList = (list: GameList) => {
    return filteredGames.filter(game => game.list === list);
  };
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-primary">My Library</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Game
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add a New Game</DialogTitle>
              </DialogHeader>
              <GameForm onAddGame={handleAddGame} defaultList={activeList} />
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
          <Select value={platformFilter} onValueChange={(value: Platform | 'all') => setPlatformFilter(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORMS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={genreFilter} onValueChange={(value: Genre | 'all') => setGenreFilter(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {GENRES.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeList} onValueChange={(value) => setActiveList(value as GameList)} className="w-full">
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
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-6">
                <AnimatePresence>
                  {gamesByList(list).length > 0 ? (
                    gamesByList(list).map((game, index) => (
                      <motion.div
                        key={game.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <GameCard game={game} />
                      </motion.div>
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
    </div>
  );
}
