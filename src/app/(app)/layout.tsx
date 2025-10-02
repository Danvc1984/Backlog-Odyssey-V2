
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
  SidebarRail,
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
    // Wait for auth to finish loading
    if (authLoading) return;

    // If no user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If user is logged in, but profile is still loading, wait
    if(profileLoading) return;

    // If user is logged in, profile is loaded, but onboarding is not complete, redirect to setup
    if (user && !profile?.onboardingComplete && pathname !== '/settings/platform') {
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
  
  const isLoading = authLoading || profileLoading;

  // Show a global loading state while auth or profile is loading
  if (isLoading && pathname !== '/settings/platform') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }
  
  // If no user is authenticated, show a redirecting message or a blank screen
  if (!user) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        Redirecting to login...
      </div>
    );
  }
  
  // Allow the onboarding page to render without the full layout
  if (pathname === '/settings/platform' && !profile?.onboardingComplete) {
      return children;
  }
  
  // If onboarding is not complete but user tries to access other pages, show a redirecting message
  if (!profile?.onboardingComplete) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            Redirecting to setup...
        </div>
    );
  }

  // Render the full app layout
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
