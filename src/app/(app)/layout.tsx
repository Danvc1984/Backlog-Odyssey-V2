
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

  React.useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user) {
      router.push('/login');
      return;
    }
    
    if (profileLoading) return; // Wait for profile to resolve

    if (!profile?.onboardingComplete && pathname !== '/settings/platform') {
      router.push('/settings/platform');
    }
  }, [user, authLoading, profile, profileLoading, router, pathname]);

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
  
  const isLoading = authLoading || (user && profileLoading);

  // 1. Handle primary loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  // 2. Handle unauthenticated state
  if (!user) {
    // The useEffect above will handle the redirect, this is a fallback UI.
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting to login...
      </div>
    );
  }

  // 3. Handle onboarding state for authenticated users
  if (!profile?.onboardingComplete) {
    if (pathname === '/settings/platform') {
      return children; // Render the onboarding page
    }
    // The useEffect above will handle the redirect, this is a fallback UI.
    return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting to setup...
      </div>
    );
  }

  // 4. Render the full app layout for authenticated and onboarded users
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
