
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
    try {
      const response = await axios.get('https://store.steampowered.com/api/storesearch/', {
        params: {
          term: title,
          l: 'english',
          cc: 'US',
        },
      });

      if (response.data && response.data.items && response.data.items.length > 0) {
        // Find an exact match if possible
        const exactMatch = response.data.items.find((item: any) => item.name.toLowerCase() === title.toLowerCase());
        const game = exactMatch || response.data.items[0];
        
        if (game.id) {
          const steamAppId = parseInt(game.id, 10);
          if (!isNaN(steamAppId)) {
            return { steamAppId };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from Steam API:', error);
    }

    return { steamAppId: undefined };
  }
);
