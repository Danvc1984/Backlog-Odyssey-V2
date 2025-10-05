
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const challengeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  goal: z.coerce.number().min(1, 'Goal must be at least 1.'),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

type ChallengeFormProps = {
  onSave: (data: ChallengeFormValues) => void;
};

const ChallengeForm: React.FC<ChallengeFormProps> = ({ onSave }) => {
  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      goal: 1,
    },
  });

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
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
          Create Challenge
        </Button>
      </form>
    </Form>
  );
};

export default ChallengeForm;
