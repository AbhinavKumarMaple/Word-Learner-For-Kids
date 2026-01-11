'use server';

import { generatePersonalizedWordList, type GeneratePersonalizedWordListInput } from '@/ai/flows/generate-personalized-word-list';
import { categorizeMistakes as categorizeMistakesFlow, type CategorizeMistakesInput } from '@/ai/flows/categorize-mistakes';
import { generateTypingSentence as generateTypingSentenceFlow, type GenerateTypingSentenceInput } from '@/ai/flows/generate-typing-sentence';
import { z } from 'zod';

const spellingFormSchema = z.object({
  gradeLevel: z.coerce.number().min(1).max(12),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  vocabType: z.enum(['general', 'science', 'history']),
  pastPerformanceData: z.string(),
  wordCount: z.number().min(1).max(100).optional(),
});

export async function generateWords(data: GeneratePersonalizedWordListInput) {
  const parsedData = spellingFormSchema.safeParse(data);
  if (!parsedData.success) {
    return { error: 'Invalid input data.' };
  }
  
  try {
    const result = await generatePersonalizedWordList(parsedData.data);
    return { wordList: result.wordList };
  } catch (error) {
    console.error('AI generation failed:', error);
    return { error: 'Failed to generate word list. Please try again.' };
  }
}

export async function categorizeMistakes(data: CategorizeMistakesInput) {
    try {
        const result = await categorizeMistakesFlow(data);
        return { categories: result.categories };
    } catch (error) {
        console.error('AI categorization failed:', error);
        return { error: 'Failed to categorize mistakes.' };
    }
}

export async function generateSentence(data: GenerateTypingSentenceInput) {
  try {
    let randomWord: string | undefined;
    try {
       const response = await fetch('https://random-word-api.herokuapp.com/word?number=1', { cache: 'no-store' });
       if (response.ok) {
           const words = await response.json();
           if (Array.isArray(words) && words.length > 0) {
               randomWord = words[0];
           }
       }
    } catch (e) {
        console.warn('Failed to fetch random word:', e);
    }

    const result = await generateTypingSentenceFlow({ ...data, randomWord });
    return { sentence: result.sentence };
  } catch (error) {
    console.error('AI sentence generation failed:', error);
    return { error: 'Failed to generate a sentence. Please try again.' };
  }
}
