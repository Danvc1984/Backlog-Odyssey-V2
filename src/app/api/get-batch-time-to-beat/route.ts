
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getIGDBAccessToken } from '@/lib/igdbAuth';

export async function POST(req: NextRequest) {
  const { titles } = await req.json();

  if (!titles || !Array.isArray(titles) || titles.length === 0) {
    return NextResponse.json({ message: 'Missing or invalid game titles' }, { status: 400 });
  }

  try {
    const token = await getIGDBAccessToken();
    const clientId = process.env.IGDB_CLIENT_ID;

    if (!clientId) {
      return NextResponse.json({ message: 'IGDB Client ID not configured.' }, { status: 500 });
    }
    
    // Build the multiquery payload to find game IDs
    const gameSearchQuery = titles.map((title, index) => `
      query games "game_${index}" {
        search "${title.replace(/"/g, '\\"')}";
        fields id;
        limit 1;
      };
    `).join('');

    const gameSearchResponse = await fetch('https://api.igdb.com/v4/multiquery', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: gameSearchQuery
    });

    if (!gameSearchResponse.ok) {
        const errorBody = await gameSearchResponse.text();
        console.error('IGDB multiquery for game search failed:', errorBody);
        return NextResponse.json({ message: `IGDB multiquery for game search failed. Status: ${gameSearchResponse.status}`}, { status: gameSearchResponse.status });
    }
    
    const gameResults = await gameSearchResponse.json();
    
    const gameIds: { title: string, id: number }[] = [];
    titles.forEach((title, index) => {
        const gameResult = gameResults.find((r: any) => r.name === `game_${index}`);
        if (gameResult && gameResult.result.length > 0) {
            gameIds.push({ title, id: gameResult.result[0].id });
        }
    });
    
    if (gameIds.length === 0) {
      return NextResponse.json({ playtimes: {} });
    }

    // Build the multiquery payload to get time-to-beat data
    const ttbQuery = gameIds.map(({ id }, index) => `
      query time_to_beats "ttb_${index}" {
        fields normally, completely;
        where game = ${id};
      };
    `).join('');
    
    const ttbResponse = await fetch('https://api.igdb.com/v4/multiquery', {
        method: 'POST',
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        },
        body: ttbQuery
    });

    if (!ttbResponse.ok) {
        const errorBody = await ttbResponse.text();
        console.error('IGDB multiquery for ttb failed:', errorBody);
        return NextResponse.json({ message: `IGDB multiquery for ttb failed. Status: ${ttbResponse.status}`}, { status: ttbResponse.status });
    }

    const ttbResults = await ttbResponse.json();

    const playtimes: Record<string, { playtimeNormally: number | null, playtimeCompletely: number | null }> = {};

    gameIds.forEach(({ title }, index) => {
      const ttbResult = ttbResults.find((r: any) => r.name === `ttb_${index}`);
      if (ttbResult && ttbResult.result.length > 0) {
        const timeData = ttbResult.result[0];
        playtimes[title] = {
            playtimeNormally: timeData.normally ? Math.round(timeData.normally / 3600) : null,
            playtimeCompletely: timeData.completely ? Math.round(timeData.completely / 3600) : null,
        };
      }
    });

    return NextResponse.json({ playtimes });

  } catch (err: any) {
    console.error(`[IGDB Batch Time to Beat API Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
