'use server';

/**
 * @fileOverview Provides personalized "Up Next" game suggestions based on a user's library, preferences, and active deals.
 * 
 * - getUpNextSuggestions - A function that generates a ranked list of games to play next.
 * - GetUpNextSuggestionsInput - The input type for the function.
 * - GetUpNextSuggestionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GameSchema = z.object({
  id: z.string().describe('The unique ID of the game.'),
  title: z.string().describe('The title of the game.'),
  platform: z.string().describe('The platform the game is played on.'),
  genres: z.array(z.string()).describe('The genres of the game.'),
  list: z
    .enum(['Wishlist', 'Backlog', 'Now Playing', 'Recently Played'])
    .describe('The list the game is in.'),
  rating: z
    .number()
    .optional()
    .describe("The user's personal rating for the game, from 1 to 5. If not provided, it should be considered a neutral 3/5."),
  playtimeNormally: z.number().optional().describe("The estimated time to beat the main story in hours."),
});

const DealSchema = z.object({
    discountPercent: z.number(),
    finalFormatted: z.string(),
});

const GetUpNextSuggestionsInputSchema = z.object({
  gameLibrary: z.array(GameSchema).describe("The user's entire game library."),
  gamingHabits: z.string().describe("A string describing the user's current gaming mood or preferences."),
  deals: z.record(z.string(), DealSchema).describe("A map of Steam App IDs to active deals."),
});
export type GetUpNextSuggestionsInput = z.infer<
  typeof GetUpNextSuggestionsInputSchema
>;

const SuggestionSchema = z.object({
  gameId: z.string().describe("The unique ID of the suggested game from the user's library."),
  reason: z.string().describe('A short, compelling, and personalized reason why this specific game is being recommended for the user to play next. Max 1-2 sentences.'),
});

const GetUpNextSuggestionsOutputSchema = z.object({
  suggestions: z
    .array(SuggestionSchema)
    .max(5)
    .describe('A ranked list of 5 game suggestions for the user to play next.'),
});
export type GetUpNextSuggestionsOutput = z.infer<
  typeof GetUpNextSuggestionsOutputSchema
>;

export async function getUpNextSuggestions(
  input: GetUpNextSuggestionsInput
): Promise<GetUpNextSuggestionsOutput> {
  return getUpNextSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getUpNextSuggestionsPrompt',
  input: { schema: GetUpNextSuggestionsInputSchema },
  output: { schema: GetUpNextSuggestionsOutputSchema },
  prompt: `You are an expert gaming curator. Your task is to analyze a user's game library, their stated gaming habits, and any available discounts to create a compelling, ranked "Up Next" queue of 5 games for them to play.

You must prioritize games from the 'Backlog' and 'Wishlist' lists.

**CRITICAL SELECTION CRITERIA:**
1.  **Backlog Games:** These are top candidates. Prioritize them based on genre match, playtime, and user ratings.
2.  **Wishlist Games:** Only suggest these if they meet one of the following conditions:
    *   They have an explicit user rating of 4 or 5.
    *   They have a discount of 70% or more (you can identify these from the 'deals' input).

**RANKING & REASONING FACTORS:**
-   **User Ratings:** This is a strong signal. A rating of 5 is a huge indicator of taste. A rating of 1 or 2 means you should probably avoid similar games. **If a game has no rating, assume a neutral interest level of 3/5.**
-   **Play History:** Analyze 'Now Playing' and 'Recently Played' games. Suggest games with similar genres, platforms, or playtimes. For example, if they just finished a long RPG, maybe suggest a shorter action game.
-   **Stated Habits:** The 'gamingHabits' input is a direct request from the user. Give this high priority in your reasoning.
-   **Playtime:** Consider suggesting shorter games from the backlog to help the user feel a sense of accomplishment. Mentioning this in the reason is a good idea (e.g., "A perfect short adventure to clear from your backlog.").
-   **Genre & Platform:** Look for patterns. If they play a lot of RPGs on PC, that's a strong signal.
-   **Variety:** The final list of 5 should be varied. Don't suggest five 100-hour RPGs. Mix it up.

**OUTPUT:**
-   Return a ranked list of exactly 5 suggestions.
-   For each suggestion, provide a concise, personalized 'reason' that explains *why* it's a great choice for them *right now*, referencing the factors above.
-   Ensure the 'gameId' for each suggestion correctly matches the ID from the input library.

**USER DATA:**

**Gaming Habits:**
"{{gamingHabits}}"

**Game Deals (by Steam App ID):**
{{#each deals}}
- AppID {{ @key }}: {{this.discountPercent}}% off
{{/each}}

**Game Library:**
{{#each gameLibrary}}
- id: {{id}}, title: "{{title}}", list: "{{list}}", platform: "{{platform}}", genres: [{{#each genres}}"{{.}}"{{#unless @last}}, {{/unless}}{{/each}}], {{#if rating}}rating: {{rating}}/5, {{/if}}{{#if playtimeNormally}}playtime: {{playtimeNormally}}h{{/if}}
{{/each}}
`,
});


const getUpNextSuggestionsFlow = ai.defineFlow(
  {
    name: 'getUpNextSuggestionsFlow',
    inputSchema: GetUpNextSuggestionsInputSchema,
    outputSchema: GetUpNextSuggestionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
