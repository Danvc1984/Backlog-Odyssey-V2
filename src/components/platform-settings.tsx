
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
import { ALL_PLATFORMS, Platform, UserPreferences } from '@/lib/types';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const platformSettingsSchema = z.object({
  platforms: z.array(z.string()).min(1, 'Please select at least one platform.'),
  favoritePlatform: z.string({ required_error: 'Please select a favorite platform.' }),
}).refine(data => data.platforms.includes(data.favoritePlatform), {
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
    },
  });

  useEffect(() => {
    if (preferences) {
      form.reset({
        platforms: preferences.platforms,
        favoritePlatform: preferences.favoritePlatform,
      });
    }
  }, [preferences, form]);

  const selectedPlatforms = form.watch('platforms');

  async function onSubmit(data: PlatformSettingsFormValues) {
    try {
      await savePreferences(data as UserPreferences);
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
                    {ALL_PLATFORMS.map((platform) => (
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
                        {selectedPlatforms.map((platform) => (
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
