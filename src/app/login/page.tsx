'use client';

import { Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  if (loading || user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex items-center gap-3 text-primary mb-8">
        <Swords className="h-12 w-12" />
        <h1 className="text-5xl font-bold tracking-tight text-white">
          Backlog <span className="text-primary">Odyssey V2</span>
        </h1>
      </div>
      <div className="w-full max-w-sm p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-card-foreground">Welcome Back</h2>
          <p className="text-muted-foreground">Sign in to continue to your backlog</p>
        </div>
        <Button onClick={signInWithGoogle} className="w-full" variant="outline">
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
