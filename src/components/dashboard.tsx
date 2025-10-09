
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Game, Genre, Platform } from '@/lib/types';
import { useMemo } from 'react';
import BacklogFlow from './backlog-flow';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { steamDeckCompatIcons } from './icons';
import { cn } from '@/lib/utils';

type DashboardProps = {
  games: Game[];
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const Dashboard: React.FC<DashboardProps> = ({ games }) => {
  
  const { preferences } = useUserPreferences();

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
  const totalGames = ownedGames.length;

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

  const completionRate = useMemo(() => {
    if (totalGames === 0) return 0;
    const completedCount = ownedGames.filter(g => g.list === 'Recently Played').length;
    const relevantTotal = ownedGames.filter(g => g.list !== 'Wishlist').length;
    if (relevantTotal === 0) return 0;
    return Math.round((completedCount / relevantTotal) * 100);
  }, [ownedGames, totalGames]);

  const { totalPlaytimeNormally, totalPlaytimeCompletely, averagePlaytime } = useMemo(() => {
    const gamesWithPlaytime = ownedGames.filter(g => g.playtimeNormally);
    if (gamesWithPlaytime.length === 0) return { totalPlaytimeNormally: 0, totalPlaytimeCompletely: 0, averagePlaytime: 0 };
    
    const totalPlaytimeNormally = ownedGames.reduce((acc, game) => acc + (game.playtimeNormally || 0), 0);
    const totalPlaytimeCompletely = ownedGames.reduce((acc, game) => acc + (game.playtimeCompletely || 0), 0);
    
    const averagePlaytime = Math.round(totalPlaytimeNormally / gamesWithPlaytime.length);
    return { totalPlaytimeNormally, totalPlaytimeCompletely, averagePlaytime };
  }, [ownedGames]);

  const platformData = useMemo(() => {
    const counts = ownedGames.reduce((acc, game) => {
      acc[game.platform] = (acc[game.platform] || 0) + 1;
      return acc;
    }, {} as Record<Platform, number>);
    
    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [ownedGames]);
  
  const platformColorConfig = useMemo(() => {
    const config: any = {};
    platformData.forEach((item, index) => {
        config[item.name] = {
            label: item.name,
            color: `hsl(var(--chart-${(index % 5) + 1}))`
        };
    });
    return config;
  }, [platformData]);

  const deckCompatData = useMemo(() => {
    const pcGames = ownedGames.filter(g => g.platform === 'PC');
    const data = { Verified: 0, Playable: 0, Unsupported: 0, Unknown: 0 };
    pcGames.forEach(game => {
        switch (game.steamDeckCompat) {
            case 'native':
            case 'platinum':
                data.Verified++;
                break;
            case 'gold':
            case 'silver':
            case 'bronze':
                data.Playable++;
                break;
            case 'borked':
                data.Unsupported++;
                break;
            default:
                data.Unknown++;
                break;
        }
    });
    return data;
  }, [ownedGames]);
  
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
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Backlog Hourglass</CardTitle>
            <CardDescription>An overview of your gaming journey.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] w-full flex items-center justify-center">
            <BacklogFlow games={games} />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
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
              <CardTitle className="text-sm font-medium">Average Playtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averagePlaytime}h</div>
              <p className="text-xs text-muted-foreground">Estimated story length</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Playtime</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalPlaytimeNormally}h</div>
                <p className="text-xs text-muted-foreground">
                    {totalPlaytimeCompletely > 0 ? `${totalPlaytimeCompletely}h for completionists` : 'Normal story playtime'}
                </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
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
                   {playtimeByGenreData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
              <CardDescription>Your game library across different platforms.</CardDescription>
          </CardHeader>
          <CardContent>
              <ChartContainer config={platformColorConfig} className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                          <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {platformData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                      </PieChart>
                  </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
         {preferences?.playsOnSteamDeck && (
            <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Steam Deck Compatibility</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {(Object.keys(deckCompatData) as Array<keyof typeof deckCompatData>).map(key => {
                        const compatKey = key === 'Verified' ? 'gold' : key === 'Playable' ? 'silver' : key === 'Unsupported' ? 'borked' : 'unknown';
                        const Icon = steamDeckCompatIcons[compatKey];
                        const count = deckCompatData[key];
                        const colorClass = 
                            key === 'Verified' ? 'text-green-400' :
                            key === 'Playable' ? 'text-yellow-400' :
                            key === 'Unsupported' ? 'text-destructive' :
                            'text-muted-foreground';

                        return (
                            <div key={key} className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", colorClass)} />
                                <span className="font-semibold">{key}:</span>
                                <span>{count}</span>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
