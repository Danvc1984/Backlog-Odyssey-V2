
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Game, Genre } from '@/lib/types';
import { useMemo } from 'react';
import BacklogFlow from './backlog-flow';

type DashboardProps = {
  games: Game[];
};

const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  
  const chartConfig = {
    total: {
      label: 'Games',
      color: 'hsl(var(--chart-1))',
    },
    playtime: {
        label: 'Playtime (h)',
        color: 'hsl(var(--chart-2))',
    }
  };

  const ownedGames = useMemo(() => games.filter(g => g.list !== 'Wishlist'), [games]);

  const genreData = useMemo(() => {
    const counts = ownedGames.reduce((acc, game) => {
      (game.genres || []).forEach(genre => {
        acc[genre] = (acc[genre] || 0) + 1;
      });
      return acc;
    }, {} as Record<Genre, number>);

    return Object.entries(counts)
      .map(([name, total]) => ({ name, total, fill: `var(--color-${name.replace(/ /g, '-')})` }))
      .sort((a, b) => b.total - a.total);
  }, [ownedGames]);

  const totalGames = ownedGames.length;
  
  const completionRate = useMemo(() => {
    if (totalGames === 0) return 0;
    const completedCount = ownedGames.filter(g => g.list === 'Recently Played').length;
    const relevantTotal = ownedGames.filter(g => g.list !== 'Wishlist').length;
    if (relevantTotal === 0) return 0;
    return Math.round((completedCount / relevantTotal) * 100);
  }, [ownedGames, totalGames]);

  const totalPlaytime = useMemo(() => ownedGames.reduce((acc, game) => acc + (game.playtimeNormally || 0), 0), [ownedGames]);
  
  const playtimeByGenreData = useMemo(() => {
    const data = ownedGames.reduce((acc, game) => {
        (game.genres || []).forEach(genre => {
            acc[genre] = (acc[genre] || 0) + (game.playtimeNormally || 0);
        });
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
        .map(([name, playtime]) => ({ name, playtime: Math.round(playtime), fill: `var(--color-${name.replace(/ /g, '-')})` }))
        .sort((a,b) => b.playtime - a.playtime);
  }, [ownedGames]);

  const genreColorConfig = useMemo(() => {
    const config: any = {};
    const chartColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];
    genreData.slice(0, 10).forEach((item, index) => {
      config[item.name.replace(/ /g, '-')] = {
        label: item.name,
        color: `hsl(var(--${chartColors[index % chartColors.length]}))`,
      };
    });
    return config;
  }, [genreData]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Owned Games</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGames}</div>
          <p className="text-xs text-muted-foreground">in your active library</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-muted-foreground">Based on owned games</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Playtime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPlaytime}h</div>
          <p className="text-xs text-muted-foreground">Estimated for owned games</p>
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
      
       <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Backlog Flow</CardTitle>
          <CardDescription>An overview of your gaming journey.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] w-full flex items-center justify-center">
          <BacklogFlow games={games} />
        </CardContent>
      </Card>

       <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Playtime by Genre</CardTitle>
          <CardDescription>Estimated hours for your top 5 genres.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={genreColorConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={playtimeByGenreData.slice(0,5)} layout="vertical" margin={{ right: 20, left: 10 }}>
              <CartesianGrid horizontal={false} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <XAxis type="number" hide />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="playtime" radius={4}>
                 {playtimeByGenreData.slice(0, 5).map((entry) => (
                    <Bar key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
