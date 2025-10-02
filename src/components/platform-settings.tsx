
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { ALL_PLATFORMS, USER_SELECTABLE_PLATFORMS, Platform, UserPreferences } from '@/lib/types';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { Separator } from './ui/separator';

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
  const { preferences, savePreferences, loading } = useUserPreferences();
  const { toast } = useToast();

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
  const playsOnPC = selectedPlatforms && selectedPlatforms.includes('PC');

  useEffect(() => {
    if (!playsOnPC) {
      form.setValue('playsOnSteamDeck', false);
    }
  }, [playsOnPC, form]);

  async function onSubmit(data: PlatformSettingsFormValues) {
    try {
      const finalPreferences = {
        ...data,
        platforms: [...new Set([...data.platforms, 'Others/ROMs'])]
      }
      await savePreferences(finalPreferences as UserPreferences);
      toast({
        title: 'Preferences Saved',
        description: 'Your platform settings have been updated.',
      });
      if (isOnboarding) {
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Preferences</CardTitle>
        <CardDescription>
          Select the gaming platforms you use and pick your favorite. This will help us tailor your experience.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                        {Array.from(new Set([...selectedPlatforms, "Others/ROMs"])).map((platform) => (
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
                )}
            </div>


          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : isOnboarding ? 'Continue to Dashboard' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
