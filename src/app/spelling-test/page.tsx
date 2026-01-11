
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Volume2, CheckCircle, XCircle, ArrowRight, BookOpen, Ear, Eye, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveSpellingTestResult, type SpellingTestResult, getPastPerformanceData } from '@/lib/storage';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateWords } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type TestState = 'ongoing' | 'feedback' | 'finished' | 'revealed';
type WordStatus = { word: string; correct: boolean | null; userInput: string };

const MAX_ATTEMPTS = 3;

export default function SpellingTestPage() {
  const router = useRouter();
  const [wordList, setWordList] = useState<string[]>([]);
  const [testConfig, setTestConfig] = useState<{ gradeLevel: number; difficulty: string; vocabType: string; wordCount?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [testState, setTestState] = useState<TestState>('ongoing');
  const [wordHistory, setWordHistory] = useState<WordStatus[]>([]);
  const [attempts, setAttempts] = useState(0);
  
  const [wordStartTime, setWordStartTime] = useState(0);
  const [totalTypingTime, setTotalTypingTime] = useState(0);
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const congratulationsImage = PlaceHolderImages.find(img => img.id === 'congratulations');

  const speak = useCallback((text: string, rate = 1.0) => {
    if (synth && text) {
      synth.cancel(); // Clear the queue
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      synth.speak(utterance);
    }
  }, [synth]);

  const spellOutWord = useCallback((word: string) => {
    if (!synth || !word) return;

    synth.cancel();

    const parts = [word, ...word.split(''), word];
    const utterances = parts.map((part, index) => {
        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = 'en-US';
        utterance.rate = index > 0 && index < parts.length -1 ? 0.8 : 1.0; // Slower for individual letters
        return utterance;
    });

    for (let i = 0; i < utterances.length - 1; i++) {
        utterances[i].onend = () => {
            if (synth.speaking) { // Ensure synth is ready for next utterance
                synth.speak(utterances[i + 1]);
            }
        };
    }
    
    // A small delay to ensure cancel is processed before speaking
    setTimeout(() => synth.speak(utterances[0]), 100);

  }, [synth]);

  const startWord = useCallback((word: string) => {
    speak(word);
    setWordStartTime(Date.now());
  }, [speak]);

  useEffect(() => {
    try {
      const storedWords = sessionStorage.getItem('lexiLearnWordList');
      const storedConfig = sessionStorage.getItem('lexiLearnTestConfig');
      if (storedWords && storedConfig) {
        const parsedWords = JSON.parse(storedWords);
        if (parsedWords.length > 0) {
            setWordList(parsedWords);
            setTestConfig(JSON.parse(storedConfig));
            setWordHistory(parsedWords.map((word: string) => ({ word, correct: null, userInput: '' })));
            startWord(parsedWords[0]);
        } else {
             router.replace('/');
        }
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Failed to load test data', error);
      router.replace('/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (testState === 'ongoing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [testState, currentWordIndex]);

  const handleCheck = () => {
    if (!userInput.trim()) return;

    const currentWord = wordList[currentWordIndex];
    const isCorrect = userInput.trim().toLowerCase() === currentWord.toLowerCase();
    const currentAttempts = attempts + 1;
    
    setTestState('feedback');
    setAttempts(currentAttempts);

    if (isCorrect) {
      const newHistory = [...wordHistory];
      newHistory[currentWordIndex] = { word: currentWord, correct: true, userInput: userInput.trim() };
      setWordHistory(newHistory);
      
      const timeTaken = (Date.now() - wordStartTime) / 1000; // in seconds
      setTotalTypingTime(totalTypingTime + timeTaken);
      setTotalCharsTyped(totalCharsTyped + currentWord.length);

    } else {
       if (currentAttempts >= MAX_ATTEMPTS) {
        const newHistory = [...wordHistory];
        newHistory[currentWordIndex] = { word: currentWord, correct: false, userInput: userInput.trim() };
        setWordHistory(newHistory);
        spellOutWord(currentWord);
      } else {
        setTimeout(() => {
          setUserInput('');
          setTestState('ongoing');
          inputRef.current?.focus();
        }, 1000); 
      }
    }
  };

  const handleNext = () => {
    if (currentWordIndex < wordList.length - 1) {
      const nextIndex = currentWordIndex + 1;
      setCurrentWordIndex(nextIndex);
      setUserInput('');
      setTestState('ongoing');
      setAttempts(0); // Reset attempts for the new word
      startWord(wordList[nextIndex]);
    } else {
      setTestState('finished');
      saveResults();
    }
  };

  const handleReveal = () => {
    const currentWord = wordList[currentWordIndex];
    const newHistory = [...wordHistory];
    newHistory[currentWordIndex] = { word: currentWord, correct: false, userInput: userInput.trim() };
    setWordHistory(newHistory);
    setTestState('revealed');
    spellOutWord(currentWord);
  };

  const saveResults = () => {
    if (!testConfig) return;

    const minutes = totalTypingTime / 60;
    const wpm = minutes > 0 ? (totalCharsTyped / 5) / minutes : 0;

    const finalResult: SpellingTestResult = {
      date: new Date().toISOString(),
      gradeLevel: testConfig.gradeLevel,
      difficulty: testConfig.difficulty,
      vocabType: testConfig.vocabType,
      words: wordHistory.map(w => ({ word: w.word, correct: w.correct! })),
      accuracy: (wordHistory.filter(w => w.correct).length / wordList.length) * 100,
      typingSpeedWpm: wpm,
    };
    saveSpellingTestResult(finalResult);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.ctrlKey) {
      event.preventDefault();
      if (testState === 'ongoing' && userInput.trim()) {
        handleCheck();
      } else if (testState === 'feedback' || testState === 'revealed') {
        const feedback = wordHistory[currentWordIndex];
        const wordIsFinished = feedback.correct !== null || testState === 'revealed';
        if (wordIsFinished) {
          handleNext();
        }
      } 
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleReveal();
    } else if (event.key === 'r' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        speak(wordList[currentWordIndex]);
    }
  };

  const handleRestart = async () => {
    if (!testConfig) return;
    setIsLoading(true);
    try {
        const pastPerformanceData = getPastPerformanceData();
        // @ts-ignore - wordCount might be missing in older configs, but that's fine as per update
        const result = await generateWords({ ...testConfig, pastPerformanceData });
        
        if (result.wordList && result.wordList.length > 0) {
            sessionStorage.setItem('lexiLearnWordList', JSON.stringify(result.wordList));
             // Update state to restart
            setWordList(result.wordList);
            setWordHistory(result.wordList.map((word: string) => ({ word, correct: null, userInput: '' })));
            setCurrentWordIndex(0);
            setUserInput('');
            setTestState('ongoing');
            setAttempts(0);
            setWordStartTime(Date.now());
            setTotalTypingTime(0);
            setTotalCharsTyped(0);
            startWord(result.wordList[0]);
        }
    } catch (error) {
        console.error("Failed to restart test", error);
    } finally {
        setIsLoading(false);
    }
  };

  if (wordList.length === 0) {
    return <div className="flex h-screen items-center justify-center">Loading test...</div>;
  }

  const currentWord = wordList[currentWordIndex];
  const progress = ((currentWordIndex + 1) / wordList.length) * 100;
  const feedback = wordHistory[currentWordIndex];
  
  const wordIsFinished = feedback.correct !== null || testState === 'revealed';
  const hasAttemptsLeft = attempts < MAX_ATTEMPTS;

  if (testState === 'finished') {
    const correctCount = wordHistory.filter(w => w.correct).length;
    const accuracy = (correctCount / wordList.length) * 100;

    return (
      <div className="container mx-auto max-w-2xl py-8 text-center md:py-12">
        {congratulationsImage && (
            <Image src={congratulationsImage.imageUrl} alt={congratulationsImage.description} width={300} height={200} className="mx-auto rounded-lg" data-ai-hint={congratulationsImage.imageHint}/>
        )}
        <h1 className="font-headline mt-4 text-4xl font-bold">Test Complete!</h1>
        <p className="mt-2 text-xl text-muted-foreground">You scored {correctCount} out of {wordList.length} ({accuracy.toFixed(0)}%)</p>

        <Card className="mt-8 text-left">
          <CardHeader><CardTitle>Detailed Results</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {wordHistory.map((item, index) => (
                <li key={index} className="flex items-center gap-4">
                  {item.correct ? <CheckCircle className="text-green-500"/> : <XCircle className="text-red-500"/>}
                  <span className="font-medium">{item.word}</span>
                  {!item.correct && item.userInput && <span className="text-sm text-muted-foreground">(You wrote: {item.userInput})</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <div className="mt-8 flex justify-center gap-4">
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => router.push('/progress')}><BookOpen className="mr-2"/> View Full Progress</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Go to your progress page</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleRestart} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} 
                    Start New Test (Same Config)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Generate new words with current settings</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => router.push('/')} variant="outline">Back to Home</Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Return to the home page</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  const isInputDisabled = testState === 'feedback' || testState === 'revealed' || feedback.correct;

  return (
    <TooltipProvider>
      <div className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-8 md:py-12">
        <div className="w-full space-y-6 md:space-y-8">
          <div>
            <Progress value={progress} className="w-full" />
            <p className="mt-2 text-center text-sm text-muted-foreground">Word {currentWordIndex + 1} of {wordList.length}</p>
          </div>

          <div className="text-center">
              <h2 className="font-headline mb-4 text-2xl">Spell the word:</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="lg" variant="outline" onClick={() => speak(currentWord)}>
                      <Volume2 className="mr-4 h-8 w-8"/>
                      Click to Listen
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hear the word pronounced (Ctrl+R)</p>
                </TooltipContent>
              </Tooltip>
          </div>
          
          <div className="flex w-full items-center space-x-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Type the word here..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isInputDisabled}
              className="p-6 text-lg"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => speak(currentWord)} aria-label="Listen again">
                        <Ear />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Listen again (Ctrl+R)</p>
                </TooltipContent>
            </Tooltip>
          </div>
          
          {testState === 'ongoing' && (
            <div className="flex flex-col gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCheck} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!userInput.trim()}>Check Spelling</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check your spelling (Enter)</p>
                </TooltipContent>
              </Tooltip>
              {hasAttemptsLeft && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleReveal} className="w-full" variant="outline">
                          <Eye className="mr-2"/> Reveal Word
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Give up and see the correct spelling (Ctrl+Enter)</p>
                    </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          
          {testState === 'feedback' && wordIsFinished && feedback.correct && (
             <div className="space-y-4">
                <Alert variant="default" className="border-green-500 bg-green-500/10 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Correct!</AlertTitle>
                    <AlertDescription>Well done.</AlertDescription>
                </Alert>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNext} className="w-full" autoFocus>
                        Next Word
                         <ArrowRight className="ml-2"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Continue (Enter)</p>
                    </TooltipContent>
                </Tooltip>
             </div>
          )}

          {testState === 'feedback' && !wordIsFinished && hasAttemptsLeft && (
             <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Not quite.</AlertTitle>
                <AlertDescription>
                    You have {MAX_ATTEMPTS - attempts} {MAX_ATTEMPTS - attempts === 1 ? 'try' : 'tries'} left. Try again!
                </AlertDescription>
            </Alert>
          )}

          {(testState === 'revealed' || (testState === 'feedback' && !feedback.correct && !hasAttemptsLeft)) && (
             <div className="space-y-4">
                <Alert variant="destructive">
                    <HelpCircle className="h-4 w-4" />
                    <AlertTitle>The correct spelling is:</AlertTitle>
                    <AlertDescription>
                        <strong className="font-bold">{currentWord}</strong>
                    </AlertDescription>
                </Alert>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNext} className="w-full" autoFocus>
                        Next Word
                         <ArrowRight className="ml-2"/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Continue (Enter)</p>
                    </TooltipContent>
                </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
