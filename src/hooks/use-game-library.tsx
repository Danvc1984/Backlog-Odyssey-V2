

'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { useUserPreferences } from './use-user-preferences';
import type { Game, GameList, Challenge, ChallengeIdea, Genre } from '@/lib/types';

interface GameLibraryContextType {
  games: Game[];
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  allGenres: Genre[];
  loading: boolean;
  handleAddGame: (newGame: Omit<Game, 'id' | 'userId'>) => Promise<void>;
  handleUpdateGame: (updatedGame: Omit<Game, 'id' | 'userId'>) => Promise<void>;
  handleMoveGame: (game: Game, newList: GameList) => Promise<void>;
  handleDeleteGame: (game: Game) => Promise<void>;
  confirmDeleteGame: (game: Game) => void;
  deletingGame: Game | null;
  setDeletingGame: React.Dispatch<React.SetStateAction<Game | null>>;
  editingGame: Game | null;
  setEditingGame: React.Dispatch<React.SetStateAction<Game | null>>;
  isEditFormOpen: boolean;
  setEditFormOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddGenre: (newGenre: Genre) => void;
  handleAddChallenge: (data: ChallengeIdea) => Promise<void>;
}

const GameLibraryContext = createContext<GameLibraryContextType | undefined>(undefined);

export const GameLibraryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences } = useUserPreferences();
  
  const [games, setGames] = useState<Game[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [isEditFormOpen, setEditFormOpen] = useState(false);

  useEffect(() => {
    if (editingGame) {
      setEditFormOpen(true);
    } else {
      setEditFormOpen(false);
    }
  }, [editingGame]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const challengesCollection = collection(db, 'users', user.uid, 'challenges');

      const unsubscribeGames = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
        setGames(userGames);
        
        const uniqueGenres = new Set(userGames.flatMap(game => game.genres || []).filter(g => g).map(g => g.trim()));
        setAllGenres(Array.from(uniqueGenres).sort());
      });

      const unsubscribeChallenges = onSnapshot(challengesCollection, snapshot => {
        const userChallenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
        const sortedChallenges = userChallenges
          .filter(c => c.createdAt) // Ensure createdAt is not null
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setChallenges(sortedChallenges);
        setLoading(false);
      });

      return () => {
        unsubscribeGames();
        unsubscribeChallenges();
      };
    } else {
      setGames([]);
      setChallenges([]);
      setAllGenres([]);
      setLoading(false);
    }
  }, [user]);

  const activeChallenges = useMemo(() => challenges.filter(c => c.status === 'active'), [challenges]);
  const completedChallenges = useMemo(() => challenges.filter(c => c.status === 'completed'), [challenges]);


  const updateChallengesProgress = useCallback(async (completedGame: Game) => {
    if (!user || activeChallenges.length === 0) return;
  
    const batch = writeBatch(db);
    let challengesUpdated = false;
    let progressMadeOn: string | null = null;
  
    const getCriteria = (text: string): { genres: string[], platforms: string[] } => {
      const uniqueGenres = new Set(games.flatMap(game => game.genres || []));
      const uniquePlatforms = new Set(games.map(game => game.platform));
      
      const foundGenres = [...uniqueGenres].filter(genre => new RegExp(`\\b${genre}\\b`, 'i').test(text));
      const foundPlatforms = [...uniquePlatforms].filter(platform => new RegExp(`\\b${platform}\\b`, 'i').test(text));
      
      return { genres: foundGenres, platforms: foundPlatforms };
    };

    for (const challenge of activeChallenges) {
        if (challenge.progress >= challenge.goal) continue;

        const combinedText = `${challenge.title} ${challenge.description}`;
        const criteria = getCriteria(combinedText);

        const genreMatch = criteria.genres.length === 0 || (completedGame.genres && criteria.genres.some(cg => completedGame.genres.includes(cg)));
        const platformMatch = criteria.platforms.length === 0 || criteria.platforms.includes(completedGame.platform);
        
        const isMatch = (criteria.genres.length === 0 && criteria.platforms.length === 0) || (genreMatch && platformMatch);

        if (isMatch) {
            const newProgress = Math.min(challenge.progress + 1, challenge.goal);
            const challengeRef = doc(db, 'users', user.uid, 'challenges', challenge.id);
            
            batch.update(challengeRef, { progress: newProgress });
            challengesUpdated = true;
            progressMadeOn = challenge.title;
    
            if (newProgress === challenge.goal) {
              batch.update(challengeRef, { status: 'completed' });
              toast({
                title: 'Challenge Complete!',
                description: `You've completed the challenge: "${challenge.title}"`,
              });
              progressMadeOn = null;
            }
        }
    }
  
    if (challengesUpdated) {
      await batch.commit();
      if (progressMadeOn) {
        toast({
          title: 'Challenge Progress Made!',
          description: `You're one step closer on "${progressMadeOn}".`,
        });
      }
    }
  }, [user, activeChallenges, games, toast]);

  const handleAddGame = useCallback(async (newGame: Omit<Game, 'id' | 'userId'>) => {
    if (user && preferences) {
      let gameData: any = { ...newGame, userId: user.uid };

      if (gameData.platform === 'PC') {
         try {
            const response = await fetch('/api/steam/get-batch-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: [gameData.title],
                    checkCompat: preferences.playsOnSteamDeck
                })
            });
            const steamData = await response.json();
            if (response.ok && steamData.details[gameData.title]) {
                const steamDetails = steamData.details[gameData.title];
                if (steamDetails.steamAppId) gameData.steamAppId = steamDetails.steamAppId;
                if (steamDetails.steamDeckCompat) gameData.steamDeckCompat = steamDetails.steamDeckCompat;
            }
        } catch (error) {
            console.error('Failed to fetch steam details', error);
        }
      }
      await addDoc(collection(db, 'users', user.uid, 'games'), gameData);
    }
  }, [user, preferences]);

  const handleUpdateGame = useCallback(async (updatedGame: Omit<Game, 'id' | 'userId'>) => {
    if (user && editingGame && preferences) {
      const gameRef = doc(db, 'users', user.uid, 'games', editingGame.id);
      let gameData: any = { ...updatedGame };

      if (gameData.rating === 0 || !gameData.rating) {
        delete gameData.rating;
      }
      
      // Assume steamAppId and compat are managed. If platform changes from PC, they should be cleared.
      if (gameData.platform !== 'PC') {
        delete gameData.steamAppId;
        delete gameData.steamDeckCompat;
      } else {
         try {
            const response = await fetch('/api/steam/get-batch-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: [gameData.title],
                    checkCompat: preferences.playsOnSteamDeck
                })
            });
             const steamData = await response.json();
             if (response.ok && steamData.details[gameData.title]) {
                const steamDetails = steamData.details[gameData.title];
                gameData.steamAppId = steamDetails.steamAppId || null;
                gameData.steamDeckCompat = steamDetails.steamDeckCompat || null;
             } else {
                gameData.steamAppId = null;
                gameData.steamDeckCompat = null;
             }
        } catch (error) {
            console.error('Failed to fetch steam details on update', error);
            gameData.steamAppId = null;
            gameData.steamDeckCompat = null;
        }
      }
      await updateDoc(gameRef, gameData);
      setEditingGame(null);
      toast({
        title: 'Game Updated!',
        description: `${updatedGame.title} has been updated.`,
      });
    }
  }, [user, editingGame, preferences, toast]);

  const handleMoveGame = useCallback(async (game: Game, newList: GameList) => {
    if (user) {
      const gameRef = doc(db, 'users', user.uid, 'games', game.id);
      await updateDoc(gameRef, { list: newList });
      toast({
        title: 'Game Moved!',
        description: `${game.title} moved to ${newList}.`,
      });

      if (newList === 'Recently Played') {
        await updateChallengesProgress(game);
      }
    }
  }, [user, toast, updateChallengesProgress]);

  const handleDeleteGame = useCallback(async (game: Game) => {
    if (user && game) {
      await deleteDoc(doc(db, 'users', user.uid, 'games', game.id));
      toast({
        title: 'Game Deleted',
        description: `${game.title} has been removed from your library.`,
        variant: 'destructive'
      });
      setDeletingGame(null);
    }
  }, [user, toast]);

  const confirmDeleteGame = useCallback((game: Game) => {
    setDeletingGame(game);
  }, []);

  const handleAddGenre = useCallback((newGenre: Genre) => {
    if (newGenre && !allGenres.map(g => g.toLowerCase()).includes(newGenre.toLowerCase())) {
        setAllGenres(prev => [...prev, newGenre].sort());
    }
  }, [allGenres]);

  const handleAddChallenge = useCallback(async (data: ChallengeIdea) => {
    if (user) {
        await addDoc(collection(db, 'users', user.uid, 'challenges'), {
            userId: user.uid,
            title: data.title,
            description: data.description,
            goal: data.goal,
            progress: 0,
            status: 'active',
            createdAt: serverTimestamp(),
        });
        toast({
            title: 'Challenge Created!',
            description: `Your new challenge "${data.title}" has been set.`
        });
    }
  }, [user, toast]);

  return (
    <GameLibraryContext.Provider value={{
      games,
      activeChallenges,
      completedChallenges,
      allGenres,
      loading,
      handleAddGame,
      handleUpdateGame,
      handleMoveGame,
      handleDeleteGame,
      confirmDeleteGame,
      deletingGame,
      setDeletingGame,
      editingGame,
      setEditingGame,
      isEditFormOpen,
      setEditFormOpen,
      handleAddGenre,
      handleAddChallenge
    }}>
      {children}
    </GameLibraryContext.Provider>
  );
};

export const useGameLibrary = () => {
  const context = useContext(GameLibraryContext);
  if (context === undefined) {
    throw new Error('useGameLibrary must be used within a GameLibraryProvider');
  }
  return context;
};
