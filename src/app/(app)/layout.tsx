
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
    // This single effect handles all redirection logic based on auth and profile state.
    
    // Do nothing until authentication has been checked.
    if (authLoading) {
      return;
    }

    // If auth is checked and there's no user, redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }

    // If we have a user, but their profile is still loading, do nothing yet.
    if (profileLoading) {
      return;
    }
    
    // Now we have a user and their profile has been checked.
    // If onboarding is not complete and they aren't on the setup page, redirect them.
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

  if (isLoading) {
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

  // If user is not onboarded, only render the setup page.
  // For any other route, show a redirecting message until the effect kicks in.
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

  // User is authenticated and onboarded, render the full app.
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
