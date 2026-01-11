'use server';

/**
 * @fileOverview Generates a list of spelling words tailored to the user's grade level and past performance.
 *
 * - generatePersonalizedWordList - A function that handles the word list generation process.
 * - GeneratePersonalizedWordListInput - The input type for the generatePersonalizedWordList function.
 * - GeneratePersonalizedWordListOutput - The return type for the generatePersonalizedWordList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedWordListInputSchema = z.object({
  gradeLevel: z.number().describe('The grade level of the user.'),
  pastPerformanceData: z
    .string()
    .describe(
      'The user past performance data including correct and incorrect words. CORRECT WORDS MUST BE EXCLUDED FROM THE GENERATED LIST.'
    ),
  difficulty: z.string().optional().describe('The difficulty level of the words (easy, medium, hard).'),
  vocabType: z.string().optional().describe('The vocabulary type (e.g., science, history, general).'),
  wordCount: z.number().optional().default(50).describe('The number of words to generate.'),
});
export type GeneratePersonalizedWordListInput = z.infer<typeof GeneratePersonalizedWordListInputSchema>;

const GeneratePersonalizedWordListOutputSchema = z.object({
  wordList: z.array(z.string()).describe('A list of approximately 50 spelling words tailored to the user.'),
});
export type GeneratePersonalizedWordListOutput = z.infer<typeof GeneratePersonalizedWordListOutputSchema>;

export async function generatePersonalizedWordList(
  input: GeneratePersonalizedWordListInput
): Promise<GeneratePersonalizedWordListOutput> {
  return generatePersonalizedWordListFlow(input);
}

const generatePersonalizedWordListPrompt = ai.definePrompt({
  name: 'generatePersonalizedWordListPrompt',
  input: {schema: GeneratePersonalizedWordListInputSchema},
  output: {schema: GeneratePersonalizedWordListOutputSchema},
  prompt: `You are an expert spelling word list generator.
  Your task is to generate a list of approximately {{wordCount}} spelling words based on the user's inputs.
  The word list should be challenging yet appropriate for the user's skill level.

  CRITICAL INSTRUCTION: Analyze the Past Performance Data. It contains history entries in the format "Correct: [word1, word2, ...]. Incorrect: [word3, ...].".
  You MUST EXCLUDE any words found in the "Correct" lists. These are mastered words.
  You MAY re-introduce words found in "Incorrect" lists if they need practice.
  Focus on generating NEW words that fit the grade level and difficulty, or re-testing incorrect words.
  DO NOT include any word that appears inside a "Correct: [...]" bracket.

  User Inputs:
  - Grade Level: {{{gradeLevel}}}
  - Difficulty: {{difficulty}}
  - Vocabulary Type: {{vocabType}}
  - Past Performance Data: {{{pastPerformanceData}}}
  - Word Count: {{wordCount}}

  You MUST return the list of words as a JSON object with a single key "wordList" containing an array of strings.

  Example Output:
  {
    "wordList": ["excellent", "bicycle"]
  }
  `,
});

const generatePersonalizedWordListFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedWordListFlow',
    inputSchema: GeneratePersonalizedWordListInputSchema,
    outputSchema: GeneratePersonalizedWordListOutputSchema,
  },
  async input => {
    const {output} = await generatePersonalizedWordListPrompt(input);
    return output!;
  }
);
