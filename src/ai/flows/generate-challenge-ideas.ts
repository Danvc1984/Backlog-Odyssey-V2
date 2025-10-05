'use server';

/**
 * @fileOverview Provides creative and trackable challenge ideas based on the user's game library.
 *
 * - generateChallengeIdeas - A function that generates challenge ideas.
 * - GenerateChallengeIdeasInput - The input type for the function.
 * - GenerateChallengeIdeasOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GameSchema = z.object({
  title: z.string().describe('The title of the game.'),
  platform: z.string().describe('The platform the game is played on.'),
  genres: z.array(z.string()).describe('The genres of the game.'),
  list: z
    .enum(['Wishlist', 'Backlog', 'Now Playing', 'Recently Played'])
    .describe('The list the game is in.'),
});

const GenerateChallengeIdeasInputSchema = z.object({
  gameLibrary: z.array(GameSchema).describe("The user's game library."),
});
export type GenerateChallengeIdeasInput = z.infer<
  typeof GenerateChallengeIdeasInputSchema
>;

const ChallengeIdeaSchema = z.object({
    title: z.string().describe('A short, catchy title for the challenge. e.g., "RPG Backlog Blitz"'),
    description: z.string().describe('A brief, one-sentence description of the challenge. e.g., "Conquer 3 unplayed RPGs from your daunting backlog."'),
    goal: z.number().describe('The number of games to complete for this challenge.')
});

const GenerateChallengeIdeasOutputSchema = z.object({
  ideas: z
    .array(ChallengeIdeaSchema)
    .describe('A list of 3-5 creative and trackable challenge ideas.'),
});
export type GenerateChallengeIdeasOutput = z.infer<
  typeof GenerateChallengeIdeasOutputSchema
>;

export async function generateChallengeIdeas(
  input: GenerateChallengeIdeasInput
): Promise<GenerateChallengeIdeasOutput> {
  return generateChallengeIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChallengeIdeasPrompt',
  input: {schema: GenerateChallengeIdeasInputSchema},
  output: {schema: GenerateChallengeIdeasOutputSchema},
  prompt: `You are an expert in gaming culture and personal goal setting. Analyze the user's game library to generate creative, fun, and ACHIEVABLE challenge ideas.

IMPORTANT: The challenges must be trackable by simply counting how many games are moved to a "completed" list. DO NOT suggest challenges that require external information like "achievements", "endings", "no-kill runs", or any specific in-game objectives. The ideas must be short, punchy, and sound like a real gaming challenge.

Consider the following when generating ideas:
- Focus on genres with many games in the user's backlog (e.g., "Clear out 3 RPGs from the backlog").
- Suggest platform-specific challenges (e.g., "Beat a classic on PlayStation").
- Look at games on the 'Now Playing' list and suggest a related goal.
- Create variety in the types of challenges.
- The goal for each challenge should be a number between 1 and 5.

Game Library:
{{#each gameLibrary}}
- {{title}} ({{platform}}, {{#each genres}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}, {{list}})
{{/each}}

Based on this library, generate a list of 3 to 5 distinct and compelling challenge ideas, each with a title, description, and a numerical goal.
`,
});

const generateChallengeIdeasFlow = ai.defineFlow(
  {
    name: 'generateChallengeIdeasFlow',
    inputSchema: GenerateChallengeIdeasInputSchema,
    outputSchema: GenerateChallengeIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
