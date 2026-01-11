'use server';

/**
 * @fileOverview Generates a sentence for typing practice.
 *
 * - generateTypingSentence - A function that handles the sentence generation.
 * - GenerateTypingSentenceInput - The input type for the function.
 * - GenerateTypingSentenceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTypingSentenceInputSchema = z.object({
  wordCount: z.number().optional().default(20).describe('The approximate number of words in the sentence.'),
  randomWord: z.string().optional().describe('A random word to incorporate for variety.'),
});
export type GenerateTypingSentenceInput = z.infer<typeof GenerateTypingSentenceInputSchema>;

const GenerateTypingSentenceOutputSchema = z.object({
  sentence: z.string().describe('A single, engaging sentence for typing practice.'),
});
export type GenerateTypingSentenceOutput = z.infer<typeof GenerateTypingSentenceOutputSchema>;

export async function generateTypingSentence(
  input: GenerateTypingSentenceInput
): Promise<GenerateTypingSentenceOutput> {
  return generateTypingSentenceFlow(input);
}

const generateTypingSentencePrompt = ai.definePrompt({
  name: 'generateTypingSentencePrompt',
  input: { schema: GenerateTypingSentenceInputSchema },
  output: { schema: GenerateTypingSentenceOutputSchema },
  prompt: `You are an expert content creator for educational typing games.
  Generate a single, interesting, and grammatically correct sentence for a typing test based on the following criteria.
  You MUST generate a sentence that is STRICTLY {{wordCount}} words long. Count the words carefully.
  It should not contain overly complex punctuation, but commas and periods are acceptable.
  If the word count is large (e.g. >30), you MUST generate multiple sentences or a paragraph to meet the count.

  Word Count: {{wordCount}}
  {{#if randomWord}}
  Context/Theme Word: {{randomWord}} (incorporate this concept subtly or directly)
  {{/if}}

  Example: "The quick brown fox jumps over the lazy dog near the river."

  Return only the sentence in the specified JSON format.
  `,
});

const generateTypingSentenceFlow = ai.defineFlow(
  {
    name: 'generateTypingSentenceFlow',
    inputSchema: GenerateTypingSentenceInputSchema,
    outputSchema: GenerateTypingSentenceOutputSchema,
  },
  async input => {
    const { output } = await generateTypingSentencePrompt(input);
    return output!;
  }
);
