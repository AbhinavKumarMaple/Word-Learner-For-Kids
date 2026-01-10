'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-word-list.ts';
import '@/ai/flows/categorize-mistakes.ts';
import '@/ai/flows/generate-typing-sentence.ts';
