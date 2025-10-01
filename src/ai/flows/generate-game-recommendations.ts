// This is a server-side file.
'use server';

/**
 * @fileOverview Provides personalized game recommendations based on the user's game library and gaming habits.
 *
 * - generateGameRecommendations - A function that generates game recommendations.
 * - GenerateGameRecommendationsInput - The input type for the generateGameRecommendations function.
 * - GenerateGameRecommendationsOutput - The return type for the generateGameRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameSchema = z.object({
  title: z.string().describe('The title of the game.'),
  platform: z.string().describe('The platform the game is played on.'),
  genres: z.array(z.string()).describe('The genres of the game.'),
  list: z.enum(['Wishlist', 'Backlog', 'Now Playing', 'Recently Played']).describe('The list the game is in.'),
});

const GenerateGameRecommendationsInputSchema = z.object({
  gameLibrary: z.array(GameSchema).describe('The user game library.'),
  gamingHabits: z.string().describe('The user gaming habits.'),
});
export type GenerateGameRecommendationsInput = z.infer<
  typeof GenerateGameRecommendationsInputSchema
>;

const GenerateGameRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(
      z.object({
        title: z.string().describe('The title of the recommended game.'),
        platform: z.string().describe('The platform of the recommended game.'),
        genre: z.string().describe('The genre of the recommended game.'),
        reason: z.string().describe('The reason for the recommendation.'),
      })
    )
    .describe('A list of personalized game recommendations.'),
});
export type GenerateGameRecommendationsOutput = z.infer<
  typeof GenerateGameRecommendationsOutputSchema
>;

export async function generateGameRecommendations(
  input: GenerateGameRecommendationsInput
): Promise<GenerateGameRecommendationsOutput> {
  return generateGameRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGameRecommendationsPrompt',
  input: {schema: GenerateGameRecommendationsInputSchema},
  output: {schema: GenerateGameRecommendationsOutputSchema},
  prompt: `You are an expert game recommender. Analyze the user's game library and gaming habits to provide personalized game recommendations.

Game Library:
{{#each gameLibrary}}
- {{title}} ({{platform}}, {{#each genres}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}, {{list}})
{{/each}}

Gaming Habits: {{gamingHabits}}

Provide a list of game recommendations with the title, platform, genre and a brief explanation of why each game was recommended.  Consider the player’s different lists when formulating the recommendations.  For example, recommend games similar to what they are currently playing, or recommend games that would be good additions to their Wishlist or Backlog.
`,
});

const generateGameRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateGameRecommendationsFlow',
    inputSchema: GenerateGameRecommendationsInputSchema,
    outputSchema: GenerateGameRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
