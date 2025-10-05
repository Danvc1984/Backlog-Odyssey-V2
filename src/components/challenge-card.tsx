
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Challenge } from '@/lib/types';
import { Target } from 'lucide-react';

type ChallengeCardProps = {
  challenge: Challenge;
};

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => {
  const progressPercentage = challenge.goal > 0 ? (challenge.progress / challenge.goal) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Target className="mr-3 h-5 w-5 text-primary" />
          {challenge.title}
        </CardTitle>
        <CardDescription>
          {challenge.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={progressPercentage} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{challenge.progress} / {challenge.goal}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeCard;
