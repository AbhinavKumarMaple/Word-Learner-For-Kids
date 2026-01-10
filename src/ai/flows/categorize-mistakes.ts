'use server';

/**
 * @fileOverview Analyzes a list of misspelled words and categorizes them into common error types.
 *
 * - categorizeMistakes - A function that handles the mistake categorization process.
 * - CategorizeMistakesInput - The input type for the categorizeMistakes function.
 * - CategorizeMistakesOutput - The return type for the categorizeMistakes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CategorizeMistakesInputSchema = z.object({
  misspelledWords: z.array(z.string()).describe('A list of words that the user has misspelled.'),
});
export type CategorizeMistakesInput = z.infer<typeof CategorizeMistakesInputSchema>;

const CategorizeMistakesOutputSchema = z.object({
  categories: z
    .array(
      z.object({
        category: z.string().describe('A descriptive category for the type of spelling error (e.g., "Silent Letters", "Vowel Teams", "Doubled Consonants").'),
        count: z.number().describe('The number of words from the input list that fall into this category.'),
      })
    )
    .describe('A list of categories representing the user\'s common spelling mistakes, sorted by frequency.'),
});
export type CategorizeMistakesOutput = z.infer<typeof CategorizeMistakesOutputSchema>;

export async function categorizeMistakes(input: CategorizeMistakesInput): Promise<CategorizeMistakesOutput> {
  if (!input.misspelledWords || input.misspelledWords.length === 0) {
    return { categories: [] };
  }
  return categorizeMistakesFlow(input);
}

const categorizeMistakesPrompt = ai.definePrompt({
  name: 'categorizeMistakesPrompt',
  input: { schema: CategorizeMistakesInputSchema },
  output: { schema: CategorizeMistakesOutputSchema },
  prompt: `You are an expert linguistic analyst specializing in spelling errors.
  Given the following list of misspelled words, analyze them and group them into 3-5 distinct, descriptive categories based on the likely reason for the error.

  Focus on these specific types of error categories:
  - Phonetic Errors: Homophones (e.g., their/there), Vowel Teams (e.g., ie/ei), Silent Letters (e.g., knight).
  - Orthographic Errors: Suffix/Prefix Rules (e.g., hoping vs. hopping), Doubled Consonants (e.g., beginning), Irregular Plurals (e.g., mice).
  - Etymological Errors: Words of foreign origin with unusual spellings (e.g., bouquet, psychology).

  Misspelled Words:
  {{#each misspelledWords}}- {{{this}}}
  {{/each}}

  Your task is to identify the most common patterns of mistakes from the list. For each category you create, provide a count of how many words from the list fit into it.
  Return a list of these categories and their counts, sorted from the most frequent to the least frequent. Do not include categories with a count of zero.
  `,
});

const categorizeMistakesFlow = ai.defineFlow(
  {
    name: 'categorizeMistakesFlow',
    inputSchema: CategorizeMistakesInputSchema,
    outputSchema: CategorizeMistakesOutputSchema,
  },
  async input => {
    const { output } = await categorizeMistakesPrompt(input);
    return output!;
  }
);
