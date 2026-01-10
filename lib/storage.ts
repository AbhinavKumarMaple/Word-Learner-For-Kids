'use client';

const SPELLING_HISTORY_KEY = 'lexiLearnHistory';
const TYPING_HISTORY_KEY = 'lexiLearnTypingHistory';
const ANALYSIS_KEY = 'lexiLearnAnalysis';
const MAX_HISTORY_ITEMS = 50;
const MAX_PERFORMANCE_WORDS = 300;

export interface SpellingTestResult {
  date: string;
  gradeLevel: number;
  difficulty: string;
  vocabType: string;
  words: { word: string; correct: boolean }[];
  accuracy: number;
  typingSpeedWpm?: number;
}

export interface TypingTestResult {
    date: string;
    difficulty: string;
    topic: string;
    mode: 'read' | 'speech';
    wpm: number;
    accuracy: number;
    cpm: number;
    time: number; // in seconds
    errorCount: number;
}


export type MistakeCategory = {
  category: string;
  count: number;
};

export function getPastPerformanceData(): string {
  if (typeof window === 'undefined') return 'No past performance data available.';
  try {
    const historyJson = localStorage.getItem(SPELLING_HISTORY_KEY);
    if (!historyJson) return 'No past performance data available.';
    
    const history: SpellingTestResult[] = JSON.parse(historyJson);
    if (history.length === 0) return 'No past performance data available.';

    const summary = history.slice(0, 5).map(result => {
      const correctWords = result.words.filter(w => w.correct).map(w => w.word).join(', ');
      const incorrectWords = result.words.filter(w => !w.correct).map(w => w.word).join(', ');
      return `On ${new Date(result.date).toLocaleDateString()}, for grade ${result.gradeLevel} (${result.difficulty} ${result.vocabType}), accuracy was ${result.accuracy.toFixed(0)}%. Correct: [${correctWords}]. Incorrect: [${incorrectWords}].`;
    }).join('\n');
    
    const words = summary.split(/\s+/);
    if (words.length > MAX_PERFORMANCE_WORDS) {
        return words.slice(0, MAX_PERFORMANCE_WORDS).join(' ') + '...';
    }

    return summary;
  } catch (error) {
    console.error('Failed to get past performance data:', error);
    return 'Error retrieving past performance data.';
  }
}

export function saveSpellingTestResult(result: SpellingTestResult) {
  if (typeof window === 'undefined') return;
  try {
    const historyJson = localStorage.getItem(SPELLING_HISTORY_KEY);
    const history: SpellingTestResult[] = historyJson ? JSON.parse(historyJson) : [];
    history.unshift(result);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }
    localStorage.setItem(SPELLING_HISTORY_KEY, JSON.stringify(history));
    // Clear old analysis when new data comes in
    localStorage.removeItem(ANALYSIS_KEY);
  } catch (error) {
    console.error('Failed to save test result:', error);
  }
}

export function getSpellingTestHistory(): SpellingTestResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const historyJson = localStorage.getItem(SPELLING_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Failed to get test history:', error);
    return [];
  }
}


export function saveTypingTestResult(result: TypingTestResult) {
  if (typeof window === 'undefined') return;
  try {
    const historyJson = localStorage.getItem(TYPING_HISTORY_KEY);
    const history: TypingTestResult[] = historyJson ? JSON.parse(historyJson) : [];
    history.unshift(result);
    if (history.length > MAX_HISTORY_ITEMS) {
      history.pop();
    }
    localStorage.setItem(TYPING_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save typing test result:', error);
  }
}

export function getTypingTestHistory(): TypingTestResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const historyJson = localStorage.getItem(TYPING_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Failed to get typing test history:', error);
    return [];
  }
}


export function getCachedAnalysis(): MistakeCategory[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const analysisJson = localStorage.getItem(ANALYSIS_KEY);
    return analysisJson ? JSON.parse(analysisJson) : null;
  } catch (error) {
    console.error('Failed to get cached analysis:', error);
    return null;
  }
}

export function saveAnalysis(analysis: MistakeCategory[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(ANALYSIS_KEY, JSON.stringify(analysis));
    } catch (error) {
        console.error('Failed to save analysis:', error);
    }
}
