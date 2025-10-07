
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getIGDBAccessToken } from '@/lib/igdbAuth';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const TTB_MULTIQUERY_BATCH_SIZE = 10;
const MULTIQUERY_DELAY_MS = 1000;

export async function POST(req: NextRequest) {
  const { ids } = await req.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ message: 'Missing or invalid game IDs' }, { status: 400 });
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

    const allTtbResults: any[] = [];
    const ttbIdChunks = chunkArray(ids, TTB_MULTIQUERY_BATCH_SIZE);

    for (let i = 0; i < ttbIdChunks.length; i++) {
      const idChunk = ttbIdChunks[i];
      const ttbQuery = idChunk.map((id) => `
        query game_time_to_beats "ttb_${id}" {
          fields normally, completely;
          where game = ${id};
        };
      `).join('');

      const ttbResponse = await fetch(MULTIQUERY_URL, {
        method: 'POST',
        headers: IGDB_HEADERS,
        body: ttbQuery
      });

      if (!ttbResponse.ok) {
        const errorBody = await ttbResponse.text();
        console.error('IGDB multiquery for ttb failed:', errorBody);
        throw new Error(`IGDB multiquery for ttb failed. Status: ${ttbResponse.status}. Body: ${errorBody}`);
      }

      const chunkTtbResults = await ttbResponse.json();
      allTtbResults.push(...chunkTtbResults);

      if (i < ttbIdChunks.length - 1) {
        await new Promise((r) => setTimeout(r, MULTIQUERY_DELAY_MS));
      }
    }
    
    const playtimes: Record<string, { playtimeNormally: number | null, playtimeCompletely: number | null }> = {};
    
    ids.forEach((id) => {
        const ttbResult = allTtbResults.find((r: any) => r.name === `ttb_${id}`);
        if (ttbResult && ttbResult.result.length > 0) {
          const timeData = ttbResult.result[0];
          playtimes[id] = {
              playtimeNormally: timeData.normally ? Math.round(timeData.normally / 3600) : null,
              playtimeCompletely: timeData.completely ? Math.round(timeData.completely / 3600) : null,
          };
        } else {
          playtimes[id] = { playtimeNormally: null, playtimeCompletely: null };
        }
    });

    return NextResponse.json({ playtimes });

  } catch (err: any) {
    console.error(`[Steam Import Batch Time to Beat API Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
