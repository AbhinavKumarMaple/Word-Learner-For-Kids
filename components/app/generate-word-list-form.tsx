
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getPastPerformanceData } from '@/lib/storage';
import { generateWords } from '@/app/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '../ui/skeleton';

const formSchema = z.object({
  gradeLevel: z.coerce.number().int().min(1, 'Grade must be at least 1').max(12, 'Grade must be at most 12'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  vocabType: z.enum(['general', 'science', 'history']),
});

type FormValues = z.infer<typeof formSchema>;

export function GenerateWordListForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gradeLevel: 5,
      difficulty: 'medium',
      vocabType: 'general',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const pastPerformanceData = getPastPerformanceData();
      const result = await generateWords({ ...values, pastPerformanceData });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.wordList && result.wordList.length > 0) {
        sessionStorage.setItem('lexiLearnWordList', JSON.stringify(result.wordList));
        sessionStorage.setItem('lexiLearnTestConfig', JSON.stringify(values));
        router.push('/spelling-test');
      } else {
        throw new Error('The generated word list was empty.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error generating words',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      // Only set loading to false if there's an error
      setIsLoading(false);
    } 
    // We don't set isLoading to false on success, because the page will navigate away.
    // This prevents the button from flickering back to its original state.
  }

  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="gradeLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade Level</FormLabel>
                <FormControl>
                  <Input type="number" min="1" max="12" placeholder="e.g., 5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vocabType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vocabulary Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vocabulary type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="history">History</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Word List & Start Test'
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Press Enter in a form field to submit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>
    </Form>
  );
}
