'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game } from '@/lib/types';
import AppHeader from '@/components/header';
import AppSidebar from '@/components/sidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarBody,
  SidebarContent,
  SidebarRail,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = React.useState<Game[]>([]);
  const [dataLoading, setDataLoading] = React.useState(true);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  React.useEffect(() => {
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
    } else if (!authLoading) {
      // If no user and not loading, reset games and loading state
      setGames([]);
      setDataLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || (!user && !authLoading && typeof window !== 'undefined' && window.location.pathname !== '/login')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8">
          <AppHeader allGames={games} />
          <main className="flex-grow mt-8">
            {React.cloneElement(children as React.ReactElement, {
              games,
              dataLoading,
              setGames,
            })}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
