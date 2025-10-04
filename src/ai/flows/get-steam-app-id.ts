'use server';
/**
 * @fileOverview A flow to retrieve the Steam App ID for a given game title.
 *
 * - getSteamAppId - A function that fetches the Steam App ID from the RAWG API.
 * - GetSteamAppIdInput - The input type for the getSteamAppId function.
 * - GetSteamAppIdOutput - The return type for the getSteamAppId function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

const GetSteamAppIdInputSchema = z.object({
  title: z.string().describe('The title of the game.'),
});
export type GetSteamAppIdInput = z.infer<typeof GetSteamAppIdInputSchema>;

const GetSteamAppIdOutputSchema = z.object({
  steamAppId: z.number().optional().describe('The Steam App ID of the game.'),
});
export type GetSteamAppIdOutput = z.infer<typeof GetSteamAppIdOutputSchema>;

export async function getSteamAppId(
  input: GetSteamAppIdInput
): Promise<GetSteamAppIdOutput> {
  return getSteamAppIdFlow(input);
}

const getSteamAppIdFlow = ai.defineFlow(
  {
    name: 'getSteamAppIdFlow',
    inputSchema: GetSteamAppIdInputSchema,
    outputSchema: GetSteamAppIdOutputSchema,
  },
  async ({ title }) => {
    if (!API_KEY) {
        console.error('RAWG API Key is not configured.');
        return { steamAppId: undefined };
    }
    try {
      const response = await axios.get('https://api.rawg.io/api/games', {
        params: {
          key: API_KEY,
          search: title,
          page_size: 1,
        },
      });

      if (response.data.results.length > 0) {
        const game = response.data.results[0];
        const steamStore = game.stores?.find((s: any) => s.store.slug === 'steam');

        if (steamStore) {
            const storeUrl = steamStore.url_en || Object.keys(steamStore).reduce((acc, key) => {
                if(key.startsWith('url_')) return steamStore[key];
                return acc;
            }, '');
          
            if (storeUrl) {
                const urlParts = storeUrl.split('/');
                const appIdIndex = urlParts.indexOf('app');
                if (appIdIndex > -1 && urlParts.length > appIdIndex + 1) {
                    const appId = parseInt(urlParts[appIdIndex + 1], 10);
                    if (!isNaN(appId)) {
                        return { steamAppId: appId };
                    }
                }
            }
        }
      }
    } catch (error) {
      console.error('Error fetching from RAWG API:', error);
    }

    return { steamAppId: undefined };
  }
);
