import Link from 'next/link';
import { BookOpenCheck, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          <span className="font-headline text-xl font-bold">
            LexiLearn AI
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <Link href="/">Spelling</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to the spelling test page</p>
              </TooltipContent>
            </Tooltip>
             <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <Link href="/typing-test">Typing</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to the typing practice page</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" asChild>
                  <Link href="/progress">Progress</Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View your test history and progress</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </div>
    </header>
  );
}
