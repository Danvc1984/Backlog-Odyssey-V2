
'use client';
import { useMemo, useState, useEffect } from 'react';
import type { Game, GameList, Challenge, ChallengeIdea } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GameListPreview from '@/components/game-list-preview';
import { useToast } from '@/hooks/use-toast';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import GameForm from '@/components/game-form';
import ChallengeForm from '@/components/challenge-form';
import ChallengeCard from '@/components/challenge-card';
import { useDeals } from '@/hooks/use-deals';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { deals } = useDeals();
  const [games, setGames] = useState<Game[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [isChallengeFormOpen, setChallengeFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [allGenres, setAllGenres] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const challengesCollection = collection(db, 'users', user.uid, 'challenges');

      const unsubscribeGames = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Game)
        );
        setGames(userGames);
        
        const uniqueGenres = new Set(userGames.flatMap(game => game.genres || []).filter(g => g).map(g => g.trim()));
        setAllGenres(Array.from(uniqueGenres).sort());
      });

      const unsubscribeChallenges = onSnapshot(challengesCollection, snapshot => {
        const userChallenges = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Challenge)
        );
        setChallenges(userChallenges.filter(c => c.status === 'active'));
        setDataLoading(false);
      });

      return () => {
        unsubscribeGames();
        unsubscribeChallenges();
      };
    } else {
      setGames([]);
      setChallenges([]);
      setDataLoading(false);
    }
  }, [user]);
  
  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setEditFormOpen(true);
  };
  
  const handleUpdateGame = async (updatedGame: Omit<Game, 'id' | 'userId'>) => {
    if (user && editingGame) {
      const gameRef = doc(db, 'users', user.uid, 'games', editingGame.id);
      await updateDoc(gameRef, updatedGame);
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

      // Update challenges if a game is 'completed'
      if (newList === 'Recently Played') {
        await updateChallengesProgress(game);
      }
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

  const handleAddChallenge = async (data: ChallengeIdea) => {
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
        setChallengeFormOpen(false);
        toast({
            title: 'Challenge Created!',
            description: `Your new challenge "${data.title}" has been set.`
        });
    }
  };
  
  const updateChallengesProgress = async (completedGame: Game) => {
    if (!user || challenges.length === 0) return;
  
    const batch = writeBatch(db);
    let challengesUpdated = false;
    let progressMadeOn: string | null = null;
  
    // Helper to extract criteria (genres, platforms) from challenge text
    const getCriteria = (text: string): { genres: string[], platforms: string[] } => {
      const allGenres = new Set(games.flatMap(game => game.genres || []));
      const allPlatforms = new Set(games.map(game => game.platform));
      
      const foundGenres = [...allGenres].filter(genre => new RegExp(`\\b${genre}\\b`, 'i').test(text));
      const foundPlatforms = [...allPlatforms].filter(platform => new RegExp(`\\b${platform}\\b`, 'i').test(text));
      
      return { genres: foundGenres, platforms: foundPlatforms };
    };

    for (const challenge of challenges) {
        if (challenge.progress >= challenge.goal) continue;

        const combinedText = `${challenge.title} ${challenge.description}`;
        const criteria = getCriteria(combinedText);

        const genreMatch = criteria.genres.length === 0 || criteria.genres.some(cg => completedGame.genres.includes(cg));
        const platformMatch = criteria.platforms.length === 0 || criteria.platforms.includes(completedGame.platform);
        
        // If there are no specific criteria, any game counts. Otherwise, check match.
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
              // Reset progressMadeOn if it was just completed
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
  };

  const nowPlaying = useMemo(
    () => games.filter(g => g.list === 'Now Playing').slice(0, 5),
    [games]
  );
  const backlog = useMemo(
    () => games.filter(g => g.list === 'Backlog').slice(0, 5),
    [games]
  );
  const wishlist = useMemo(
    () => games.filter(g => g.list === 'Wishlist').slice(0, 5),
    [games]
  );
  const recentlyPlayed = useMemo(
    () => games.filter(g => g.list === 'Recently Played').slice(0, 5),
    [games]
  );

  if (dataLoading) {
    return <div className="text-center py-10">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-12">
      <Dashboard games={games} />
      
       <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight text-primary">Personal Challenges</h2>
            <Dialog open={isChallengeFormOpen} onOpenChange={setChallengeFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Challenge</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create a New Challenge</DialogTitle>
                    </DialogHeader>
                    <ChallengeForm onSave={handleAddChallenge} allGames={games} />
                </DialogContent>
            </Dialog>
        </div>
        {challenges.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {challenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
            </div>
        ) : (
            <div className="text-center py-10 text-muted-foreground bg-card rounded-lg">
                <p>No active challenges. Why not create one?</p>
            </div>
        )}
      </div>

      <GameListPreview title="Now Playing" games={nowPlaying} onEdit={handleEditGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Backlog" games={backlog} onEdit={handleEditGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Wishlist" games={wishlist} deals={deals} onEdit={handleEditGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Recently Played" games={recentlyPlayed} onEdit={handleEditGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />

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
  );
}
