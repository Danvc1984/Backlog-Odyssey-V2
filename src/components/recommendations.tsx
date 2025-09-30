'use client';

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateGameRecommendations } from '@/ai/flows/generate-game-recommendations';
import type { Game, Recommendation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type RecommendationsProps = {
  allGames: Game[];
};

const Recommendations: React.FC<RecommendationsProps> = ({ allGames }) => {
  const [gamingHabits, setGamingHabits] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGetRecommendations = async () => {
    if (!gamingHabits) {
      toast({
        title: 'Missing Info',
        description: 'Please describe your gaming habits.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setRecommendations([]);
    try {
      const result = await generateGameRecommendations({
        gameLibrary: allGames,
        gamingHabits,
      });
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to get recommendations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <Wand2 className="mr-2 h-4 w-4" /> Get AI Recommendations
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>AI Game Recommendations</SheetTitle>
          <SheetDescription>
            Describe your current gaming mood or what you're looking for, and our AI will suggest games from your library or new ones to try.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
          <Textarea
            placeholder="e.g., 'I want a relaxing game I can play in short bursts.' or 'Looking for a deep RPG with a great story.'"
            value={gamingHabits}
            onChange={(e) => setGamingHabits(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <SheetFooter>
          <Button onClick={handleGetRecommendations} disabled={isLoading} className="w-full">
            {isLoading ? 'Thinking...' : 'Generate Recommendations'}
          </Button>
        </SheetFooter>
        <ScrollArea className="h-[calc(100%-250px)] mt-6">
          <div className="space-y-4 pr-6">
            {isLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-5 w-3/4 bg-muted rounded"></div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-4 w-full bg-muted rounded"></div>
                      <div className="h-4 w-5/6 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {recommendations.map((rec, index) => (
              <Card key={index} className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">{rec.title}</CardTitle>
                  <div className="flex gap-2 pt-1">
                    <Badge variant="outline">{rec.platform}</Badge>
                    <Badge variant="outline">{rec.genre}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default Recommendations;
