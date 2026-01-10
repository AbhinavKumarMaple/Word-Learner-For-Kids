
import Image from 'next/image';
import { GenerateWordListForm } from '@/components/app/generate-word-list-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-reading');
  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
        <div className="space-y-4">
          <h1 className="font-headline text-4xl font-bold tracking-tighter md:text-5xl">
            Master Spelling with AI
          </h1>
          <p className="text-lg text-muted-foreground">
            LexiLearn AI creates personalized spelling lists just for you.
            Practice with audio, track your progress, and become a spelling
            champion.
          </p>
          {heroImage && (
            <div className="overflow-hidden rounded-lg shadow-xl md:hidden">
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={600}
                height={400}
                className="h-auto w-full object-cover"
                data-ai-hint={heroImage.imageHint}
              />
            </div>
          )}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="font-headline">
                Start a New Spelling Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GenerateWordListForm />
            </CardContent>
          </Card>
        </div>
        <div className="hidden md:block">
          {heroImage && (
            <div className="overflow-hidden rounded-lg shadow-xl">
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={600}
                height={400}
                className="h-auto w-full object-cover"
                data-ai-hint={heroImage.imageHint}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
