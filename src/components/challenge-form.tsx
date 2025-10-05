
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Game } from '@/lib/types';
import { useState } from 'react';
import { Wand2, Loader2, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const challengeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  goal: z.coerce.number().min(1, 'Goal must be at least 1.'),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

type ChallengeFormProps = {
  onSave: (data: ChallengeFormValues) => void;
  allGames: Game[];
};

const ChallengeForm: React.FC<ChallengeFormProps> = ({ onSave, allGames }) => {
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      goal: 1,
    },
  });

  const handleGetIdeas = async () => {
    setIsLoadingIdeas(true);
    setIdeas([]);
    try {
      const { generateChallengeIdeas } = await import('@/ai/flows/generate-challenge-ideas');
      const result = await generateChallengeIdeas({ gameLibrary: allGames });
      setIdeas(result.ideas);
    } catch (error) {
      console.error('Failed to get challenge ideas:', error);
      toast({
        title: 'Error',
        description: 'Could not generate ideas. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const handleIdeaClick = (idea: string) => {
    form.setValue('title', idea);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Challenge Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Clear my PS5 backlog" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many games to complete?</FormLabel>
              <FormControl>
                <Input type="number" min="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-4">
          <Button type="button" variant="outline" className="w-full" onClick={handleGetIdeas} disabled={isLoadingIdeas}>
            {isLoadingIdeas ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Suggest Ideas
          </Button>

          {ideas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">AI Suggestions:</h4>
              <div className="flex flex-col gap-2">
                {ideas.map((idea, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="ghost"
                    className="justify-start text-left h-auto py-2"
                    onClick={() => handleIdeaClick(idea)}
                  >
                    <Lightbulb className="mr-2 h-4 w-4 text-primary" />
                    {idea}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
          Create Challenge
        </Button>
      </form>
    </Form>
  );
};

export default ChallengeForm;
