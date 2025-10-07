
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getIGDBAccessToken } from '@/lib/igdbAuth';

/**
 * Helper to split array into chunks
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

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

    const IGDB_HEADERS = {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    const MULTIQUERY_URL = 'https://api.igdb.com/v4/multiquery';


    const chunks = chunkArray(titles, 10); // 10 queries per multiquery for safety
    const nameToId: Record<string, number> = {};
    const gameIdPromises: Promise<{ title: string; id: number } | null>[] = [];

    for (const chunk of chunks) {
      const body = chunk
        .map((name, idx) => {
          // Changed to remove double quotes, aligning with the provided example
          return `query games "g${idx}" {
  search "${name.replace(/"/g, '')}";
  fields id, name;
  limit 1;
};`;
        })
        .join('\n'); 

      try {
        const response = await fetch(MULTIQUERY_URL, {
          method: 'POST',
          headers: IGDB_HEADERS,
          body: body,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('IGDB Multiquery for game IDs failed:', errorBody);
          await new Promise((r) => setTimeout(r, 300)); 
          continue;
        }

        const responseData = await response.json();

        responseData.forEach((result: any) => {
          if (result.result.length > 0) {
            const game = result.result[0];
            const originalTitle = chunk.find(t => game.name.toLowerCase() === t.toLowerCase());
            if (originalTitle) {
              nameToId[originalTitle] = game.id;
              gameIdPromises.push(Promise.resolve({ title: originalTitle, id: game.id }));
            } else {
                console.warn(`Could not reliably match IGDB game "${game.name}" to an original title in the batch.`);
            }
          }
        });

        await new Promise((r) => setTimeout(r, 300));
      } catch (error: any) {
        console.error('IGDB Multiquery Error:', error.message);
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const gameIds: { title: string, id: number }[] = titles.map(title => {
      const id = nameToId[title];
      return id ? { title, id } : null;
    }).filter(Boolean) as { title: string, id: number }[];

    console.log('Extracted Game IDs (with titles):', JSON.stringify(gameIds, null, 2));


    if (gameIds.length === 0) {
      return NextResponse.json({ playtimes: {} });
    }

    const ttbQuery = gameIds.map(({ id }, index) => `
      query game_time_to_beats "ttb_${index}" {
        fields normally, completely;
        where game_id = ${id};
      };
    `).join('\n'); 

    const ttbResponse = await fetch(MULTIQUERY_URL, {
        method: 'POST',
        headers: IGDB_HEADERS,
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
      } else {
        playtimes[title] = { playtimeNormally: null, playtimeCompletely: null };
      }
    });

    return NextResponse.json({ playtimes });

  } catch (err: any) {
    console.error(`[IGDB Batch Time to Beat API Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
