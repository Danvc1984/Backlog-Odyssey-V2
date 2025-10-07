
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getIGDBAccessToken } from '@/lib/igdbAuth';
import { IGDBGame } from '@/lib/igdb';

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

const SEARCH_MULTIQUERY_BATCH_SIZE = 10;
const TTB_MULTIQUERY_BATCH_SIZE = 10;
const MULTIQUERY_DELAY_MS = 1000;

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
    
    const nameToId: Record<string, number> = {};
    const gameIdsToFetchTTB: number[] = [];

    // Sanitize titles for use in query names
    const sanitizedTitle = (title: string) => title.replace(/[^a-zA-Z0-9]/g, '');

    // First, search for each game by title in multiquery batches to get their IGDB IDs
    const titleChunks = chunkArray(titles, SEARCH_MULTIQUERY_BATCH_SIZE);
    
    for (let i = 0; i < titleChunks.length; i++) {
        const chunk = titleChunks[i];
        const searchQuery = chunk.map(title => `
            query games "search_${sanitizedTitle(title)}" {
                search "${title.replace(/"/g, '\"')}";
                fields id, name;
                limit 1;
            };
        `).join('');

        const searchResponse = await fetch(MULTIQUERY_URL, {
            method: 'POST',
            headers: IGDB_HEADERS,
            body: searchQuery
        });

        if (!searchResponse.ok) {
            const errorBody = await searchResponse.text();
            console.error('IGDB multiquery for game search failed:', errorBody);
            throw new Error(`IGDB multiquery for game search failed. Status: ${searchResponse.status}. Body: ${errorBody}`);
        }
        
        const searchResults = await searchResponse.json();

        searchResults.forEach((result: any, index: number) => {
            const originalTitle = chunk[index];
            if (result.result.length > 0) {
                const gameId = result.result[0].id;
                nameToId[originalTitle] = gameId;
                gameIdsToFetchTTB.push(gameId);
            }
        });
        
        if (i < titleChunks.length - 1) {
            await new Promise(r => setTimeout(r, MULTIQUERY_DELAY_MS));
        }
    }


    if (gameIdsToFetchTTB.length === 0) {
      return NextResponse.json({ playtimes: {} });
    }

    const allTtbResults: any[] = [];
    const ttbIdChunks = chunkArray(gameIdsToFetchTTB, TTB_MULTIQUERY_BATCH_SIZE);

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
    
    titles.forEach((title) => {
      const id = nameToId[title];
      if (id) {
        const ttbResult = allTtbResults.find((r: any) => r.name === `ttb_${id}`);
        if (ttbResult && ttbResult.result.length > 0) {
          const timeData = ttbResult.result[0];
          playtimes[title] = {
              playtimeNormally: timeData.normally ? Math.round(timeData.normally / 3600) : null,
              playtimeCompletely: timeData.completely ? Math.round(timeData.completely / 3600) : null,
          };
        } else {
          playtimes[title] = { playtimeNormally: null, playtimeCompletely: null };
        }
      } else {
         playtimes[title] = { playtimeNormally: null, playtimeCompletely: null };
      }
    });

    return NextResponse.json({ playtimes });

  } catch (err: any) {
    console.error(`[Steam Import Batch Time to Beat API Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
