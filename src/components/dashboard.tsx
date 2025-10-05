
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Game, Genre } from '@/lib/types';
import { useMemo } from 'react';

type DashboardProps = {
  games: Game[];
};

const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  const genreData = useMemo(() => {
    const counts = games.reduce((acc, game) => {
      (game.genres || []).forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {} as Record<Genre, number>);

    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [games]);

  const totalGames = games.length;
  
  const completionRate = useMemo(() => {
    const gamesToConsider = games.filter(g => g.list !== 'Wishlist');
    const totalGamesToConsider = gamesToConsider.length;
    return totalGamesToConsider > 0 
      ? Math.round((games.filter(g => g.list === 'Recently Played').length / totalGamesToConsider) * 100) 
      : 0;
  }, [games]);

  const totalPlaytime = useMemo(() => games.reduce((acc, game) => acc + (game.playtimeMain || 0), 0), [games]);

  const chartConfig = {
    total: {
      label: 'Games',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGames}</div>
          <p className="text-xs text-muted-foreground">in your library</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">Based on recently played</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Playtime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPlaytime}h</div>
          <p className="text-xs text-muted-foreground">Estimated main story playtime</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Genre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{genreData[0]?.name || 'N/A'}</div>
          <p className="text-xs text-muted-foreground">{genreData[0]?.total || 0} games in this genre</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Genre Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={genreData.slice(0, 10)} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
