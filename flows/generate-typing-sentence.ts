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
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the sentence.'),
  topic: z.enum(['general', 'science', 'history', 'facts']).describe('The topic of the sentence.'),
});
export type GenerateTypingSentenceInput = z.infer<typeof GenerateTypingSentenceInputSchema>;

const GenerateTypingSentenceOutputSchema = z.object({
  sentence: z.string().describe('A single, engaging sentence for typing practice that is between 15 and 30 words long.'),
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
  The sentence should be between 15 and 30 words long. It should not contain overly complex punctuation, but commas and periods are acceptable.

  Difficulty: {{{difficulty}}}
  Topic: {{{topic}}}

  Example for 'hard' difficulty and 'science' topic: "The process of photosynthesis in plants converts light energy into chemical energy, creating glucose and oxygen as byproducts."
  Example for 'easy' difficulty and 'general' topic: "The quick brown fox jumps over the lazy dog near the river."

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
