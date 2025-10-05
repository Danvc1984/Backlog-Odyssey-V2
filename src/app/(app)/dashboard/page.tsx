
'use client';
import { useMemo, useState } from 'react';
import type { Game, ChallengeIdea } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { useGameLibrary } from '@/hooks/use-game-library';

import GameListPreview from '@/components/game-list-preview';
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
  const {
    games,
    challenges,
    allGenres,
    loading,
    handleUpdateGame,
    handleMoveGame,
    handleDeleteGame,
    handleAddGenre,
    handleAddChallenge,
    confirmDeleteGame,
    setDeletingGame,
    deletingGame,
    editingGame,
    setEditingGame,
    isEditFormOpen,
    setEditFormOpen,
  } = useGameLibrary();

  const { deals } = useDeals();
  const [isChallengeFormOpen, setChallengeFormOpen] = useState(false);

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

  const onAddChallenge = async (data: ChallengeIdea) => {
    await handleAddChallenge(data);
    setChallengeFormOpen(false);
  };

  if (loading) {
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
                    <ChallengeForm onSave={onAddChallenge} allGames={games} />
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

      <GameListPreview title="Now Playing" games={nowPlaying} onEdit={setEditingGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Backlog" games={backlog} onEdit={setEditingGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Wishlist" games={wishlist} deals={deals} onEdit={setEditingGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />
      <GameListPreview title="Recently Played" games={recentlyPlayed} onEdit={setEditingGame} onMove={handleMoveGame} onDelete={confirmDeleteGame} />

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
            <AlertDialogAction onClick={() => handleDeleteGame(deletingGame!)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
