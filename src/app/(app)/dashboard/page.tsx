
'use client';
import { useMemo, useState, useEffect } from 'react';
import type { Game, GameList } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import GameForm from '@/components/game-form';
import { useDeals } from '@/hooks/use-deals';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { deals } = useDeals();
  const [games, setGames] = useState<Game[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);
  const [allGenres, setAllGenres] = useState<string[]>([]);

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
