
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Game, Genre } from '@/lib/types';
import { useMemo } from 'react';

type DashboardProps = {
  games: Game[];
};

const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  
  const chartConfig = {
    total: {
      label: 'Games',
      color: 'hsl(var(--primary))',
    },
    playtime: {
        label: 'Playtime (h)',
        color: 'hsl(var(--accent))',
    }
  };

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

  const totalPlaytime = useMemo(() => games.reduce((acc, game) => acc + (game.estimatedPlaytime || 0), 0), [games]);
  
  const playtimeByListData = useMemo(() => {
    const data = games.reduce((acc, game) => {
        if(game.list === 'Now Playing' || game.list === 'Backlog') {
            acc[game.list] = (acc[game.list] || 0) + (game.estimatedPlaytime || 0);
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data).map(([name, playtime]) => ({ name, playtime: Math.round(playtime) }));
  }, [games]);

  const playtimeByGenreData = useMemo(() => {
    const data = games.reduce((acc, game) => {
        (game.genres || []).forEach(genre => {
            acc[genre] = (acc[genre] || 0) + (game.estimatedPlaytime || 0);
        });
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data)
        .map(([name, playtime]) => ({ name, playtime: Math.round(playtime) }))
        .sort((a,b) => b.playtime - a.playtime);
  }, [games]);


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
      
       <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Playtime by List</CardTitle>
          <CardDescription>Estimated hours in your Now Playing and Backlog lists.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={playtimeByListData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="playtime" fill="var(--color-playtime)" radius={8} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

       <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Playtime by Genre</CardTitle>
          <CardDescription>Estimated hours for your top 5 genres.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={playtimeByGenreData.slice(0,5)} layout="vertical" margin={{ right: 20 }}>
              <CartesianGrid horizontal={false} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} />
              <XAxis type="number" hide />
              <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="playtime" fill="var(--color-playtime)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>Genre Distribution</CardTitle>
          <CardDescription>Number of games per genre across your entire library.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart accessibilityLayer data={genreData.slice(0, 10)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
