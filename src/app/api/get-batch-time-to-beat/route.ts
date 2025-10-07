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
    
    // Build the multiquery payload
    const query = titles.map((title, index) => `
      query games "game_${index}" {
        search "${title.replace(/"/g, '\\"')}";
        fields id;
        limit 1;
      };
      query game_time_to_beats "ttb_${index}" {
        fields normally, completely;
        where game = @game_${index}[0].id;
      };
    `).join('');

    const response = await fetch('https://api.igdb.com/v4/multiquery', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: query
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('IGDB multiquery failed:', errorBody);
        return NextResponse.json({ message: `IGDB multiquery failed. Status: ${response.status}`}, { status: response.status });
    }
    
    const results = await response.json();
    
    const playtimes: Record<string, { playtimeNormally: number | null, playtimeCompletely: number | null }> = {};

    titles.forEach((title, index) => {
      const ttbResult = results.find((r: any) => r.name === `ttb_${index}`);
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
    console.error(`[IGDB Multiquery Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
