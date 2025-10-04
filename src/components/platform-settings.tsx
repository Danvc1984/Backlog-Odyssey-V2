
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ALL_PLATFORMS, USER_SELECTABLE_PLATFORMS, Platform, UserPreferences } from '@/lib/types';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { useUserProfile } from '@/hooks/use-user-profile.tsx';
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { SteamIcon } from './icons';

const platformSettingsSchema = z.object({
  platforms: z.array(z.string()).min(1, 'Please select at least one platform.'),
  favoritePlatform: z.string({ required_error: 'Please select a favorite platform.' }),
  notifyDiscounts: z.boolean().optional(),
  playsOnSteamDeck: z.boolean().optional(),
}).refine(data => [...data.platforms, 'Others/ROMs'].includes(data.favoritePlatform), {
  message: 'Favorite platform must be one of the selected platforms.',
  path: ['favoritePlatform'],
});

type PlatformSettingsFormValues = z.infer<typeof platformSettingsSchema>;

type PlatformSettingsProps = {
  isOnboarding?: boolean;
};

export default function PlatformSettings({ isOnboarding = false }: PlatformSettingsProps) {
  const router = useRouter();
  const { user, getAuthToken } = useAuth();
  const { preferences, savePreferences, loading: prefsLoading } = useUserPreferences();
  const { profile, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isUpdatingCompat, setIsUpdatingCompat] = useState(false);
  const [steamVanityId, setSteamVanityId] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  const form = useForm<PlatformSettingsFormValues>({
    resolver: zodResolver(platformSettingsSchema),
    defaultValues: {
      platforms: preferences?.platforms || [],
      favoritePlatform: preferences?.favoritePlatform || '',
      notifyDiscounts: preferences?.notifyDiscounts || false,
      playsOnSteamDeck: preferences?.playsOnSteamDeck || false,
    },
  });
  
  useEffect(() => {
    if (profile?.steamId) {
      setSteamVanityId(profile.steamId);
    }
  }, [profile]);

  useEffect(() => {
    if (preferences) {
      form.reset({
        platforms: preferences.platforms,
        favoritePlatform: preferences.favoritePlatform,
        notifyDiscounts: preferences.notifyDiscounts,
        playsOnSteamDeck: preferences.playsOnSteamDeck,
      });
    }
  }, [preferences, form]);

  const selectedPlatforms = form.watch('platforms');
  const playsOnPC = useMemo(() => selectedPlatforms?.includes('PC') || false, [selectedPlatforms]);
  const playsOnSteamDeck = form.watch('playsOnSteamDeck');

  useEffect(() => {
    if (!playsOnPC) {
      form.setValue('playsOnSteamDeck', false);
    }
  }, [playsOnPC, form]);

  async function onSubmit(data: PlatformSettingsFormValues) {
    if (!user) return;
    
    const finalPreferences = {
      ...data,
      platforms: [...new Set([...data.platforms, 'Others/ROMs'])]
    }
    await savePreferences(finalPreferences as UserPreferences);
    
    if (steamVanityId && steamVanityId !== profile?.steamId) {
      const userProfileRef = doc(db, 'users', user.uid);
      await updateDoc(userProfileRef, { steamId: steamVanityId });
    }

    if (isOnboarding && !profile?.onboardingComplete) {
      const userProfileRef = doc(db, 'users', user.uid);
      await updateDoc(userProfileRef, { onboardingComplete: true });
    }
  }
  
  const handleSteamImport = async (importMode: 'full' | 'new') => {
    setShowImportDialog(false);
    
    // Programmatically trigger form validation and submission
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: 'Form Incomplete',
        description: 'Please fix the errors on the form before importing.',
        variant: 'destructive',
      });
      return;
    }
    
    // Save settings before importing
    await onSubmit(form.getValues());
    
    const currentSteamId = form.getValues().platforms.includes('PC') ? steamVanityId : '';

    if (!currentSteamId) {
      toast({
        title: 'Steam ID required',
        description: 'Please enter your Steam vanity URL or ID and save it before importing.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You must be logged in to import your library.');
      }

      const response = await fetch('/api/import-steam', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ steamId: currentSteamId, importMode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to import Steam library.');
      }
      
       toast({
        title: 'Steam Library Import Complete!',
        description: `Successfully imported ${result.importedCount} games. ${result.failedCount > 0 ? `${result.failedCount} games could not be found.` : ''}`,
      });

      if (isOnboarding) {
        router.push('/dashboard');
      }

    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }

  const handleUpdateCompat = async () => {
    setIsUpdatingCompat(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('You must be logged in.');
      }
      const response = await fetch('/api/update-deck-compat', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      toast({
        title: 'Update Complete',
        description: 'Steam Deck compatibility status has been updated for your PC games.',
      });
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCompat(false);
    }
  }

  const handleSaveAndContinue = async (data: PlatformSettingsFormValues) => {
    await onSubmit(data);
    toast({
      title: 'Preferences Saved',
      description: 'Your platform and profile settings have been updated.',
    });
    if (isOnboarding) {
      router.push('/dashboard');
    }
  }


  const sortedFavoritePlatforms = useMemo(() => {
    if (!selectedPlatforms) return [];
    const uniquePlatforms = Array.from(new Set([...selectedPlatforms, "Others/ROMs"]));
    return uniquePlatforms.sort((a, b) => {
        if (a === 'Others/ROMs') return 1;
        if (b === 'Others/ROMs') return -1;
        return a.localeCompare(b);
    });
  }, [selectedPlatforms]);


  return (
    <div className='space-y-6'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveAndContinue)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Preferences</CardTitle>
              <CardDescription>
                Select the gaming platforms you use and pick your favorite. This will help us tailor your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="platforms"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Your Platforms</FormLabel>
                      <FormDescription>
                        Select all the platforms you currently play on.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {USER_SELECTABLE_PLATFORMS.map((platform) => (
                        <FormField
                          key={platform}
                          control={form.control}
                          name="platforms"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={platform}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(platform)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, platform])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== platform
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {platform}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={true}
                              disabled={true}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-muted-foreground">
                            Others/ROMs
                          </FormLabel>
                        </FormItem>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPlatforms && selectedPlatforms.length > 0 && (
                <FormField
                  control={form.control}
                  name="favoritePlatform"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Favorite Platform</FormLabel>
                      <FormDescription>
                        This will be the default platform when adding new games.
                      </FormDescription>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {sortedFavoritePlatforms.map((platform) => (
                            <FormItem key={platform} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={platform} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {platform}
                            </FormLabel>
                          </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Separator />

              <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="notifyDiscounts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Notify me about discounts for games on my Wishlist.
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {playsOnPC && (
                    <>
                      <FormField
                        control={form.control}
                        name="playsOnSteamDeck"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                I play on a Steam Deck.
                              </FormLabel>
                              <FormDescription>
                                This helps us recommend Steam Deck compatible games.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      {playsOnSteamDeck && (
                        <div className="pl-4">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleUpdateCompat}
                            disabled={isUpdatingCompat}
                          >
                            {isUpdatingCompat ? 'Updating...' : 'Update Compatibility Status'}
                          </Button>
                          <FormDescription className="mt-2">
                              Check for the latest Steam Deck compatibility status for all your PC games.
                          </FormDescription>
                        </div>
                      )}
                    </>
                  )}
              </div>
            </CardContent>
          </Card>
          
          {playsOnPC && (
            <Card>
              <CardHeader>
                <CardTitle>Steam Integration</CardTitle>
                <CardDescription>
                  Save your Steam vanity URL or 64-bit ID to enable library imports. Your profile must be public.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-2">
                  <FormLabel htmlFor='steamId'>Steam Profile URL or ID</FormLabel>
                  <Input 
                    id='steamId'
                    placeholder="e.g., https://steamcommunity.com/id/your-vanity-id/"
                    value={steamVanityId}
                    onChange={(e) => setSteamVanityId(e.target.value)}
                    disabled={isImporting}
                  />
                </div>
              </CardContent>
               <CardFooter className="justify-end">
                 <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="default" size="lg" disabled={isImporting || profileLoading || !steamVanityId} className="h-12 px-10 text-base bg-accent hover:bg-accent/90">
                      <SteamIcon className="mr-2 h-5 w-5" />
                      {isImporting ? 'Importing...' : 'Import Steam Library'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Import Steam Library</AlertDialogTitle>
                      <AlertDialogDescription>
                       A 'Full Import' will add all games from your Steam library, which may create duplicates if you have imported before. 'Add New Games' will only import games you don't already have.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={!profile?.steamId} onClick={() => handleSteamImport('new')}>
                        Add New Games
                      </AlertDialogAction>
                      <AlertDialogAction onClick={() => handleSteamImport('full')}>
                        Full Import
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          )}

          <Button type="submit" disabled={prefsLoading}>
            {prefsLoading ? 'Saving...' : isOnboarding ? 'Continue' : 'Save Preferences'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
