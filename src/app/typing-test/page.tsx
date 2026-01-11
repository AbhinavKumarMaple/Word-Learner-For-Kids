
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateSentence } from '@/app/actions';
import { saveTypingTestResult, type TypingTestResult } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Volume2, CheckCircle, XCircle, RefreshCw, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const formSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  topic: z.enum(['general', 'science', 'history', 'facts']),
  mode: z.enum(['read', 'speech']),
  wordCount: z.coerce.number().min(5).max(100).default(20),
});

const STORED_CONFIG_KEY = 'lexiLearnTypingConfig';

type FormValues = z.infer<typeof formSchema>;

type TestStatus = 'configuring' | 'loading' | 'ready' | 'typing' | 'finished';

const CharacterSpan = ({ char, state }: { char: string; state: 'correct' | 'incorrect' | 'pending' }) => {
  const color = state === 'correct' ? 'text-green-500' : state === 'incorrect' ? 'text-red-500' : 'text-muted-foreground';
  const decoration = state === 'incorrect' ? 'underline' : '';
  return <span className={`${color} ${decoration}`}>{char}</span>;
};

export default function TypingTestPage() {
  const [testStatus, setTestStatus] = useState<TestStatus>('configuring');
  const [sentence, setSentence] = useState('');
  const [userInput, setUserInput] = useState('');
  const [testConfig, setTestConfig] = useState<FormValues | null>(null);

  const [time, setTime] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();
  const router = useRouter();
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      difficulty: 'medium',
      topic: 'general',
      mode: 'read',
      wordCount: 20,
    },
  });

  useEffect(() => {
     if (isClient) {
        const stored = localStorage.getItem(STORED_CONFIG_KEY);
        if (stored) {
           try {
              const parsed = JSON.parse(stored);
              form.reset(parsed);
           } catch(e) {
              console.error("Failed to parse stored typing config", e);
           }
        }
     }
  }, [isClient, form]);

  const speak = useCallback((text: string) => {
    if (synth && text) {
        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        synth.speak(utterance);
    }
  }, [synth]);

  async function onSubmit(values: FormValues) {
    localStorage.setItem(STORED_CONFIG_KEY, JSON.stringify(values));
    setTestStatus('loading');
    setTestConfig(values);
    try {
      const result = await generateSentence(values);
      if (result.error) throw new Error(result.error);
      if (!result.sentence) throw new Error('AI did not return a sentence.');
      
      setSentence(result.sentence);
      setUserInput('');
      setTime(0);
      setErrorCount(0);
      setTestStatus('ready');
      if (values.mode === 'speech') {
        speak(result.sentence);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to start test',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      setTestStatus('configuring');
    }
  }

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTime((prevTime) => prevTime + 1);
    }, 1000);
  };
  
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (testStatus === 'typing' && !intervalRef.current) {
      startTimer();
    }
    if (testStatus === 'finished') {
      stopTimer();
    }
    return () => stopTimer();
  }, [testStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (testStatus === 'finished') {
             if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                restartTest();
             } else if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
                 e.preventDefault();
                 resetTest();
             }
        }
        // Add more shortcuts as needed
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testStatus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (testStatus === 'ready') {
      setTestStatus('typing');
    }
    
    if (userInput.length > value.length) {
      // User is deleting, just update the input
      setUserInput(value);
      return;
    }

    const lastTypedChar = value[value.length - 1];
    const expectedChar = sentence[value.length - 1];

    if (lastTypedChar !== expectedChar) {
      setErrorCount(prev => prev + 1);
    }

    setUserInput(value);
    
    if (value.length === sentence.length) {
        setTestStatus('finished');
        saveResults(value);
    }
  };

  const saveResults = (finalInput: string) => {
    if (!testConfig || !sentence || time === 0) return;
    
    const wordsTyped = finalInput.split(' ').length;
    const wpm = Math.round((wordsTyped / time) * 60);
    const cpm = Math.round((finalInput.length / time) * 60);

    let correctChars = 0;
    for(let i = 0; i < finalInput.length; i++) {
        if(finalInput[i] === sentence[i]) {
            correctChars++;
        }
    }
    const accuracy = (correctChars / sentence.length) * 100;

    const result: TypingTestResult = {
        date: new Date().toISOString(),
        wpm,
        accuracy,
        cpm,
        time,
        errorCount,
        ...testConfig,
    };
    saveTypingTestResult(result);
  }

  const renderedSentence = useMemo(() => {
    return sentence.split('').map((char, index) => {
      let state: 'correct' | 'incorrect' | 'pending' = 'pending';
      if (index < userInput.length) {
        state = userInput[index] === char ? 'correct' : 'incorrect';
      }
      return <CharacterSpan key={index} char={char} state={state} />;
    });
  }, [sentence, userInput]);

  const resetTest = () => {
    stopTimer();
    setTestStatus('configuring');
    setSentence('');
    setUserInput('');
    setTime(0);
    setErrorCount(0);
  }

  const restartTest = () => {
     if (testConfig) {
        onSubmit(testConfig);
     } else {
        resetTest();
     }
  }

  const wpm = time > 0 ? Math.round((userInput.length / 5) / (time / 60)) : 0;
  const accuracy = sentence.length > 0 ? ((userInput.length - errorCount) / userInput.length) * 100 : 100;


  if (testStatus === 'finished') {
    const finalWpm = Math.round((sentence.split(' ').length / time) * 60);
    let correctChars = 0;
    for(let i = 0; i < userInput.length; i++) {
        if(userInput[i] === sentence[i]) {
            correctChars++;
        }
    }
    const finalAccuracy = (correctChars / sentence.length) * 100;

    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-3xl">Practice Complete!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">WPM</p>
                        <p className="text-3xl font-bold">{finalWpm}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Accuracy</p>
                        <p className="text-3xl font-bold">{finalAccuracy.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Errors</p>
                        <p className="text-3xl font-bold">{errorCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="text-3xl font-bold">{time}s</p>
                    </div>
                </div>
                <div className="flex justify-center gap-4">
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button onClick={restartTest} className="bg-primary text-primary-foreground hover:bg-primary/90">Restart (Same Settings)</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Restart with current config (Ctrl+R)</p>
                        </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                         <TooltipTrigger asChild>
                             <Button onClick={resetTest} variant="secondary">New Config</Button>
                         </TooltipTrigger>
                         <TooltipContent>
                             <p>Setup a new test (Ctrl+N)</p>
                         </TooltipContent>
                    </Tooltip>

                    <Button variant="outline" onClick={() => router.push('/progress')}>View Progress</Button>
                  </TooltipProvider>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  if (testStatus === 'configuring' || testStatus === 'loading') {
    return (
      <div className="container mx-auto max-w-xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Typing Speed Practice</CardTitle>
            <CardDescription>Hone your typing skills with custom-generated sentences.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isClient ? (
               <div className="space-y-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" suppressHydrationWarning>
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Practice Mode</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="read" />
                              </FormControl>
                              <FormLabel className="font-normal">Read: See the sentence and type it.</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="speech" />
                              </FormControl>
                              <FormLabel className="font-normal">Speech: Listen to the sentence and type it.</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="topic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="facts">Random Facts</SelectItem>
                              <SelectItem value="science">Science</SelectItem>
                              <SelectItem value="history">History</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="wordCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Word Count (Approx. 5-100)</FormLabel>
                        <FormControl>
                          <Input type="number" min="5" max="100" placeholder="e.g., 20" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={testStatus === 'loading'}>
                    {testStatus === 'loading' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Start Practice'}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
           <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2 text-xl">
                  <Timer className="h-6 w-6" />
                  <span className="font-bold">{time}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">WPM:</span>
                  <span>{wpm}</span>
                </div>
                 <div className="flex items-center gap-2">
                  <span className="font-semibold">Accuracy:</span>
                  <span>{accuracy.toFixed(1)}%</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={resetTest}>
                  <RefreshCw className="h-4 w-4" />
              </Button>
           </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {testConfig?.mode === 'read' && (
            <div className="text-2xl font-mono p-4 bg-muted rounded-md tracking-wider leading-relaxed">
              {renderedSentence}
            </div>
          )}
          {testConfig?.mode === 'speech' && (
             <div className="text-center">
                <Button onClick={() => speak(sentence)}>
                    <Volume2 className="mr-2" /> Listen Again
                </Button>
             </div>
          )}
          <Input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            placeholder="Start typing here..."
            className="w-full p-4 text-xl font-mono tracking-wider"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
        </CardContent>
      </Card>
    </div>
  );
}
