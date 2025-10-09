
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Game, Challenge, ChallengeIdea } from '@/lib/types';
import { useMemo } from 'react';
import BacklogFlow from './backlog-flow';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { steamDeckCompatIcons } from './icons';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';
import ChallengeForm from './challenge-form';
import ChallengeCard from './challenge-card';

type DashboardProps = {
  games: Game[];
  activeChallenges: Challenge[];
  isChallengeFormOpen: boolean;
  setChallengeFormOpen: (isOpen: boolean) => void;
  onAddChallenge: (data: ChallengeIdea) => void;
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const Dashboard: React.FC<DashboardProps> = ({ games, activeChallenges, isChallengeFormOpen, setChallengeFormOpen, onAddChallenge }) => {
  
  const { preferences } = useUserPreferences();

  const ownedGames = useMemo(() => games.filter(g => g.list !== 'Wishlist'), [games]);
  const totalGames = ownedGames.length;

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
    }, {} as Record<string, number>);
    
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
            case 'gold':
                data.Verified++;
                break;
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
    playtimeByGenreData.slice(0, 10).forEach((item, index) => {
      config[item.name.replace(/ /g, '-')] = {
        label: item.name,
        color: `hsl(var(--${chartColors[index % chartColors.length]}))`,
      };
    });
    return config;
  }, [playtimeByGenreData]);

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-[700px_1fr_1fr] gap-6">
            <div className="col-span-1">
                <Card className="h-full min-h-[550px]">
                    <CardHeader>
                        <CardTitle>Backlog Hourglass</CardTitle>
                        <CardDescription>An overview of your gaming journey.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px] w-full flex items-center justify-center">
                        <BacklogFlow games={games} />
                    </CardContent>
                </Card>
            </div>

            <div className="col-span-1 space-y-6">
                <Card>
                    <div className="flex justify-around items-center h-full">
                        <div className="text-center p-4 w-1/2">
                            <CardTitle className="text-sm font-medium">Total Owned Games</CardTitle>
                            <div className="text-2xl font-bold mt-2">{totalGames}</div>
                            <p className="text-xs text-muted-foreground">in your active library</p>
                        </div>
                        <Separator orientation="vertical" className="h-20" />
                        <div className="text-center p-4 w-1/2">
                             <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                            <div className="text-2xl font-bold mt-2">{completionRate}%</div>
                            <p className="text-xs text-muted-foreground">Based on owned games</p>
                        </div>
                    </div>
                </Card>
                <Card>
                     <div className="flex justify-around items-center h-full">
                        <div className="text-center p-4 w-1/2">
                            <CardTitle className="text-sm font-medium">Average Playtime</CardTitle>
                            <div className="text-2xl font-bold mt-2">{averagePlaytime}h</div>
                            <p className="text-xs text-muted-foreground">Estimated story length</p>
                        </div>
                        <Separator orientation="vertical" className="h-20" />
                        <div className="text-center p-4 w-1/2">
                           <CardTitle className="text-sm font-medium">Total Playtime</CardTitle>
                            <div className="text-2xl font-bold mt-2">{totalPlaytimeNormally}h</div>
                            <p className="text-xs text-muted-foreground">
                                {totalPlaytimeCompletely > 0 ? `${totalPlaytimeCompletely}h for completionists` : 'Normal story playtime'}
                            </p>
                        </div>
                    </div>
                </Card>
                {preferences?.playsOnSteamDeck && (
                    <Card>
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
                                        <span className="text-lg font-bold">{count}</span>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}
            </div>
            
            <div className="col-span-1">
                <Card className="h-full">
                    <CardHeader>
                        <CardTitle>Platform Distribution</CardTitle>
                        <CardDescription>Your library across platforms.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px]">
                        <ChartContainer config={platformColorConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                    data={platformData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius="80%"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                        return (
                                            <text
                                            x={x}
                                            y={y}
                                            fill="hsl(var(--foreground))"
                                            textAnchor={x > cx ? 'start' : 'end'}
                                            dominantBaseline="central"
                                            className="text-xs"
                                            >
                                            {platformData[index].name} ({value})
                                            </text>
                                        );
                                    }}
                                    >
                                        {platformData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
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

             <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight text-primary">Personal Challenges</h2>
                    <Dialog open={isChallengeFormOpen} onOpenChange={setChallengeFormOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Challenge</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Challenge</DialogTitle>
                            </DialogHeader>
                            <ChallengeForm onSave={onAddChallenge} allGames={games} />
                        </DialogContent>
                    </Dialog>
                </div>
                {activeChallenges.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-1">
                        {activeChallenges.slice(0, 2).map(challenge => (
                            <ChallengeCard key={challenge.id} challenge={challenge} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground bg-card rounded-lg h-full flex items-center justify-center">
                        <p>No active challenges. Why not create one?</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
