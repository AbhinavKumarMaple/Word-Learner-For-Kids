'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { categorizeMistakes } from '@/app/actions';
import { getSpellingTestHistory, getTypingTestHistory, getCachedAnalysis, saveAnalysis, type SpellingTestResult, type TypingTestResult, type MistakeCategory } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const spellingChartConfig = {
  accuracy: {
    label: 'Accuracy',
    color: 'hsl(var(--chart-1))',
  },
  wpm: {
    label: 'WPM',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const typingChartConfig = {
  wpm: {
    label: 'WPM',
    color: 'hsl(var(--chart-1))',
  },
  accuracy: {
    label: 'Accuracy',
    color: 'hsl(var(--chart-2))',
  },
  errors: {
    label: 'Errors',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export default function ProgressPage() {
  const [spellingHistory, setSpellingHistory] = useState<SpellingTestResult[]>([]);
  const [typingHistory, setTypingHistory] = useState<TypingTestResult[]>([]);
  const [mistakeCategories, setMistakeCategories] = useState<MistakeCategory[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const progressChartImage = PlaceHolderImages.find(img => img.id === 'progress-chart');
  
  const commonMistakes = useMemo(() => spellingHistory
    .flatMap(test => test.words.filter(w => !w.correct).map(w => w.word.toLowerCase()))
    .reduce((acc, word) => {
      if (!acc.includes(word)) {
        acc.push(word);
      }
      return acc;
    }, [] as string[]), [spellingHistory]);

  const runAnalysis = useCallback(async (force = false) => {
    if (commonMistakes.length === 0) return;

    const cached = getCachedAnalysis();
    if (cached && !force) {
      setMistakeCategories(cached);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await categorizeMistakes({ misspelledWords: commonMistakes });
      if (result.categories) {
        setMistakeCategories(result.categories);
        saveAnalysis(result.categories);
      } else if (result.error) {
        setAnalysisError(result.error);
      }
    } catch {
      setAnalysisError('An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [commonMistakes]);
  
  useEffect(() => {
    const spellingTestHistory = getSpellingTestHistory();
    const typingTestHistory = getTypingTestHistory();
    setSpellingHistory(spellingTestHistory);
    setTypingHistory(typingTestHistory);

    const mistakesToAnalyze = spellingTestHistory
        .flatMap(test => test.words.filter(w => !w.correct))
        .length > 0;
      
    if (mistakesToAnalyze) {
        const cached = getCachedAnalysis();
        if (cached) {
            setMistakeCategories(cached);
        } else {
            // Automatically run analysis if there are mistakes but no cache
            const uniqueMistakes = spellingTestHistory
                .flatMap(test => test.words.filter(w => !w.correct).map(w => w.word.toLowerCase()))
                .reduce((acc, word) => {
                    if (!acc.includes(word)) {
                    acc.push(word);
                    }
                    return acc;
                }, [] as string[]);
            
            if (uniqueMistakes.length > 0) {
                (async () => {
                    await runAnalysis();
                })();
            }
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spellingChartData = useMemo(() => spellingHistory.map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    accuracy: Math.round(item.accuracy),
    wpm: item.typingSpeedWpm ? Math.round(item.typingSpeedWpm) : null,
  })).reverse(), [spellingHistory]);

  const typingChartData = useMemo(() => typingHistory.map(item => ({
    date: format(new Date(item.date), 'MMM d'),
    wpm: Math.round(item.wpm),
    accuracy: Math.round(item.accuracy),
    errors: item.errorCount || 0,
  })).reverse(), [typingHistory]);

  const mistakeCounts = useMemo(() => spellingHistory
    .flatMap(test => test.words.filter(w => !w.correct).map(w => w.word.toLowerCase()))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>), [spellingHistory]);

  const sortedMistakes = useMemo(() => Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10), [mistakeCounts]);
  
  const averageSpellingWpm = useMemo(() => {
    const wpmTests = spellingHistory.filter(h => h.typingSpeedWpm !== undefined && h.typingSpeedWpm > 0);
    if (wpmTests.length === 0) return 0;
    const totalWpm = wpmTests.reduce((sum, test) => sum + test.typingSpeedWpm!, 0);
    return Math.round(totalWpm / wpmTests.length);
  }, [spellingHistory]);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-headline text-4xl font-bold">Your Progress</h1>
        <p className="text-lg text-muted-foreground">
          Track your journey, celebrate improvements, and identify areas to focus on.
        </p>
      </div>

      <Tabs defaultValue="spelling" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="spelling">Spelling</TabsTrigger>
          <TabsTrigger value="typing">Typing</TabsTrigger>
        </TabsList>
        <TabsContent value="spelling" className="mt-6">
          <div className="grid gap-8">
             <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Spelling Performance</CardTitle>
                <CardDescription>Your test accuracy and typing speed (WPM) for recent spelling tests.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 pt-4 md:grid-cols-2">
                {spellingHistory.length > 0 ? (
                  <>
                    <div>
                      <h3 className="mb-4 text-center font-medium">Accuracy (%)</h3>
                      <ChartContainer config={spellingChartConfig} className="h-[250px] w-full">
                        <BarChart data={spellingChartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                          <YAxis unit="%" domain={[0, 100]} tickLine={false} axisLine={false} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                          <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                    <div>
                      <h3 className="mb-4 flex items-center justify-center gap-2 font-medium">Typing Speed (WPM) <Badge variant="secondary">{averageSpellingWpm} avg</Badge></h3>
                      <ChartContainer config={spellingChartConfig} className="h-[250px] w-full">
                        <LineChart data={spellingChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                          <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                          <Line type="monotone" dataKey="wpm" stroke="var(--color-wpm)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </>
                ) : (
                    <div className="col-span-2 flex h-[300px] flex-col items-center justify-center text-center">
                        {progressChartImage && (
                            <Image src={progressChartImage.imageUrl} alt={progressChartImage.description} width={200} height={133} className="mb-4 rounded-lg opacity-50" data-ai-hint={progressChartImage.imageHint} />
                        )}
                        <p className="text-muted-foreground">No spelling test data yet. Complete a test to see your progress!</p>
                    </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>AI-Powered Mistake Analysis</CardTitle>
                    <CardDescription>Common themes in the words you misspell.</CardDescription>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => runAnalysis(true)} disabled={isAnalyzing || commonMistakes.length === 0}>
                          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Re-analyze your mistakes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Analyzing your mistakes...</span>
                    </div>
                  ) : analysisError ? (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Analysis Failed</AlertTitle>
                          <AlertDescription>{analysisError}</AlertDescription>
                      </Alert>
                  ) : mistakeCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                          {mistakeCategories.map((cat) => (
                              <Badge key={cat.category} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-sm">
                                  {cat.category}
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-foreground text-xs">{cat.count}</span>
                              </Badge>
                          ))}
                      </div>
                  ) : sortedMistakes.length > 0 ? (
                      <p className="pt-8 text-center text-sm text-muted-foreground">Could not determine specific categories. Click the refresh button to try again!</p>
                  ) : (
                      <p className="pt-8 text-center text-sm text-muted-foreground">You haven't made any mistakes yet. Great job!</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Spelling Mistakes</CardTitle>
                  <CardDescription>Words you frequently misspell.</CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedMistakes.length > 0 ? (
                      <ul className="space-y-2">
                          {sortedMistakes.map(([word, count]) => (
                              <li key={word} className="flex items-center justify-between text-sm">
                                  <span className="font-medium capitalize">{word}</span>
                                  <span className="text-muted-foreground">{count} time{count > 1 ? 's' : ''}</span>
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <p className="pt-8 text-center text-sm text-muted-foreground">You haven't made any mistakes yet. Keep it up!</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                  <CardTitle>Spelling Test History</CardTitle>
                  <CardDescription>A log of all your completed spelling tests.</CardDescription>
              </CardHeader>
              <CardContent>
                  {spellingHistory.length > 0 ? (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Grade</TableHead>
                                  <TableHead>Difficulty</TableHead>
                                  <TableHead>Vocab Type</TableHead>
                                  <TableHead className="text-right">Accuracy</TableHead>
                                  <TableHead className="text-right">WPM</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {spellingHistory.map((test) => (
                                  <TableRow key={test.date}>
                                      <TableCell>{format(new Date(test.date), 'PP')}</TableCell>
                                      <TableCell>{test.gradeLevel}</TableCell>
                                      <TableCell className="capitalize">{test.difficulty}</TableCell>
                                      <TableCell className="capitalize">{test.vocabType}</TableCell>
                                      <TableCell className="text-right font-medium">{test.accuracy.toFixed(0)}%</TableCell>
                                      <TableCell className="text-right font-medium">{test.typingSpeedWpm ? test.typingSpeedWpm.toFixed(0) : 'N/A'}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">No spelling tests taken yet.</p>
                  )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="typing" className="mt-6">
            <div className="grid gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Typing Performance</CardTitle>
                  <CardDescription>Your speed and accuracy across typing practice sessions.</CardDescription>
                </CardHeader>
                 <CardContent className="grid gap-8 pt-4 md:grid-cols-2">
                  {typingHistory.length > 0 ? (
                    <>
                      <div>
                        <h3 className="mb-4 text-center font-medium">Typing Speed (WPM)</h3>
                        <ChartContainer config={typingChartConfig} className="h-[250px] w-full">
                          <LineChart data={typingChartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Line type="monotone" dataKey="wpm" stroke="var(--color-wpm)" strokeWidth={2} dot={true} />
                          </LineChart>
                        </ChartContainer>
                      </div>
                      <div>
                        <h3 className="mb-4 text-center font-medium">Accuracy (%)</h3>
                        <ChartContainer config={typingChartConfig} className="h-[250px] w-full">
                          <BarChart data={typingChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis unit="%" domain={[0, 100]} tickLine={false} axisLine={false} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={4} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                      <div className="md:col-span-2">
                        <h3 className="mb-4 text-center font-medium">Errors per Session</h3>
                         <ChartContainer config={typingChartConfig} className="h-[250px] w-full">
                          <BarChart data={typingChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Bar dataKey="errors" fill="var(--color-errors)" radius={4} />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 flex h-[300px] flex-col items-center justify-center text-center">
                        {progressChartImage && (
                            <Image src={progressChartImage.imageUrl} alt={progressChartImage.description} width={200} height={133} className="mb-4 rounded-lg opacity-50" data-ai-hint={progressChartImage.imageHint} />
                        )}
                        <p className="text-muted-foreground">No typing practice data yet. Complete a session to see your stats!</p>
                    </div>
                  )}
                 </CardContent>
              </Card>

              <Card>
                <CardHeader>
                    <CardTitle>Typing Practice History</CardTitle>
                    <CardDescription>A log of all your completed typing sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {typingHistory.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Mode</TableHead>
                                    <TableHead>Difficulty</TableHead>
                                    <TableHead>Topic</TableHead>
                                    <TableHead className="text-right">WPM</TableHead>
                                    <TableHead className="text-right">Accuracy</TableHead>
                                    <TableHead className="text-right">Errors</TableHead>
                                    <TableHead className="text-right">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {typingHistory.map((test) => (
                                    <TableRow key={test.date}>
                                        <TableCell>{format(new Date(test.date), 'PP')}</TableCell>
                                        <TableCell className="capitalize">{test.mode}</TableCell>
                                        <TableCell className="capitalize">{test.difficulty}</TableCell>
                                        <TableCell className="capitalize">{test.topic}</TableCell>
                                        <TableCell className="text-right font-medium">{test.wpm.toFixed(0)}</TableCell>
                                        <TableCell className="text-right font-medium">{test.accuracy.toFixed(0)}%</TableCell>
                                        <TableCell className="text-right font-medium">{test.errorCount}</TableCell>
                                        <TableCell className="text-right font-medium">{test.time}s</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">No typing practice sessions completed yet.</p>
                    )}
                </CardContent>
              </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
