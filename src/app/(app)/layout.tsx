
'use client';
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import AppHeader from '@/components/header';
import AppSidebar from '@/components/sidebar';
import {
  SidebarProvider,
  Sidebar,
  SidebarBody,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game } from '@/lib/types';
import { UserPreferencesProvider } from '@/hooks/use-user-preferences';
import { UserProfileProvider, useUserProfile } from '@/hooks/use-user-profile';

function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [allGames, setAllGames] = React.useState<Game[]>([]);
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !profileLoading) {
      setInitialLoadComplete(true);
    }
  }, [authLoading, profileLoading]);

  React.useEffect(() => {
    if (!initialLoadComplete) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!profile?.onboardingComplete && pathname !== '/settings/platform') {
      router.push('/settings/platform');
    }
  }, [user, profile, initialLoadComplete, router, pathname]);
  
  React.useEffect(() => {
    if (user) {
      const gamesCollection = collection(db, 'users', user.uid, 'games');
      const unsubscribe = onSnapshot(gamesCollection, snapshot => {
        const userGames = snapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Game)
        );
        setAllGames(userGames);
      });
      return () => unsubscribe();
    } else if (!authLoading) {
      setAllGames([]);
    }
  }, [user, authLoading]);
  
  if (!initialLoadComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting to login...
      </div>
    );
  }

  if (!profile?.onboardingComplete) {
    if (pathname === '/settings/platform') {
      return <>{children}</>;
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting to setup...
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen p-4 sm:p-6 lg:p-8">
          <AppHeader allGames={allGames} />
          <main className="flex-grow mt-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProfileProvider>
      <UserPreferencesProvider>
        <AppContent>{children}</AppContent>
      </UserPreferencesProvider>
    </UserProfileProvider>
  )
}
