
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

const SEARCH_MULTIQUERY_BATCH_SIZE = 10;
const MULTIQUERY_DELAY_MS = 1000;

// Helper to sanitize titles for use in IGDB query names
const sanitizeTitleForQuery = (title: string) => title.replace(/[^a-zA-Z0-9]/g, '');

export async function POST(req: NextRequest) {
  const { titles } = await req.json();
  console.log('[get-igdb-ids] Received titles:', titles);

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
    
    const titleToIdMap: Record<string, number> = {};
    const titleChunks = chunkArray(titles, SEARCH_MULTIQUERY_BATCH_SIZE);
    
    for (let i = 0; i < titleChunks.length; i++) {
        const chunk = titleChunks[i];
        const searchQuery = chunk.map(title => `
            query games "search_${sanitizeTitleForQuery(title)}" {
                search "${title.replace(/"/g, '\"')}";
                fields name, id;
                limit 1;
            };
        `).join('');
        
        console.log(`[get-igdb-ids] IGDB multiquery (chunk ${i+1}/${titleChunks.length}):`, searchQuery);

        const searchResponse = await fetch(MULTIQUERY_URL, {
            method: 'POST',
            headers: IGDB_HEADERS,
            body: searchQuery
        });

        if (!searchResponse.ok) {
            const errorBody = await searchResponse.text();
            console.error('[get-igdb-ids] IGDB multiquery for game search failed:', errorBody);
            throw new Error(`IGDB multiquery for game search failed. Status: ${searchResponse.status}. Body: ${errorBody}`);
        }
        
        const searchResults = await searchResponse.json();

        searchResults.forEach((result: any, index: number) => {
            const originalTitle = chunk[index];
            if (result.result.length > 0) {
                const gameId = result.result[0].id;
                // Use the exact title from IGDB if it's a close match, otherwise use original.
                const returnedTitle = result.result[0].name;
                titleToIdMap[originalTitle] = gameId;
            }
        });
        
        if (i < titleChunks.length - 1) {
            await new Promise(r => setTimeout(r, MULTIQUERY_DELAY_MS));
        }
    }

    console.log('[get-igdb-ids] Returning titleToIdMap:', titleToIdMap);
    return NextResponse.json({ titleToIdMap });

  } catch (err: any) {
    console.error(`[get-igdb-ids API Error] ${err.message}`);
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}
