
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';
import type { Game, UserPreferences } from '@/lib/types';
import { getSteamDeckCompat, SteamDeckCompat } from '@/app/api/steam/utils';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

export const maxDuration = 400; // 5 minutes

// Helper function to initialize Firebase Admin SDK within this route
function getAdminApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }

    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccount) {
        throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    }

    const serviceAccountJson = JSON.parse(
        Buffer.from(serviceAccount, 'base64').toString('utf-8')
    );

    return initializeApp({
        credential: cert(serviceAccountJson),
        projectId: 'studio-8063658966-c0f00',
    });
}


async function resolveVanityURL(vanityId: string): Promise<string> {
    if (!vanityId) {
        throw new Error('Steam ID or Vanity URL is required.');
    }
    if (/^\d{17}$/.test(vanityId)) {
        return vanityId;
    }

    let vanityName = vanityId;
    if (vanityId.includes('steamcommunity.com/id/')) {
        vanityName = vanityId.substring(vanityId.indexOf('steamcommunity.com/id/') + 'steamcommunity.com/id/'.length).split('/')[0];
    } else if (vanityId.includes('steamcommunity.com/profiles/')) {
         const potentialId = vanityId.substring(vanityId.indexOf('steamcommunity.com/profiles/') + 'steamcommunity.com/profiles/'.length).split('/')[0];
         if (/^\d{17}$/.test(potentialId)) {
            return potentialId;
         }
    }
    
    try {
        const response = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${vanityName}`);
        if (response.data.response.success === 1) {
            return response.data.response.steamid;
        } else {
            throw new Error('Could not resolve Steam vanity URL. Is your profile public and the URL correct?');
        }
    } catch (error: any) {
        console.error(`Error resolving vanity URL: ${error.message}`);
        throw new Error(`Could not resolve Steam vanity URL: ${vanityId}. Is your profile public and the URL correct?`);
    }
}

async function getOwnedGames(steamId64: string): Promise<any[]> {
    try {
        const response = await axios.get(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId64}&format=json&include_appinfo=true`);
        if (response.data.response && response.data.response.games) {
            return response.data.response.games;
        }
        if (response.data.response && Object.keys(response.data.response).length === 0) {
            throw new Error(`Could not fetch owned games. The Steam ID may be incorrect or the user's profile is private.`);
        }
        return [];
    } catch (error: any) {
        console.error(`Error fetching owned games: ${error.message}`);
        throw new Error(error.message || 'Could not fetch owned games from Steam.');
    }
}

export async function POST(req: NextRequest) {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const authToken = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!authToken) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
        const decodedToken = await auth.verifyIdToken(authToken);
        uid = decodedToken.uid;
    } catch (error) {
        console.error('Error verifying auth token:', error);
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { steamId, importMode } = await req.json();

    if (!STEAM_API_KEY) {
        return NextResponse.json({ message: 'Steam API Key is not configured on the server.' }, { status: 500 });
    }
    if (!RAWG_API_KEY) {
        return NextResponse.json({ message: 'RAWG API Key is not configured on the server.' }, { status: 500 });
    }
    
    try {
        const steamId64 = await resolveVanityURL(steamId);
        
        const userProfileRef = db.collection('users').doc(uid);
        const prefDocRef = db.collection('users').doc(uid).collection('preferences').doc('platform');
        
        const prefDocSnap = await prefDocRef.get();
        const preferences = (prefDocSnap.data() as UserPreferences) || {};
        const playsOnSteamDeck = preferences.playsOnSteamDeck || false;
        
        await userProfileRef.update({ steamId: steamId64 });

        if (playsOnSteamDeck && !preferences.playsOnSteamDeck) {
          await prefDocRef.set({ playsOnSteamDeck: true }, { merge: true });
        }
        
        let steamGames = await getOwnedGames(steamId64);
        const gamesCollectionRef = db.collection('users').doc(uid).collection('games');

        if (importMode === 'new') {
            const existingGamesSnapshot = await gamesCollectionRef.where('steamAppId', '!=', null).get();
            const existingSteamAppIds = new Set(existingGamesSnapshot.docs.map(doc => doc.data().steamAppId));
            steamGames = steamGames.filter(steamGame => !existingSteamAppIds.has(steamGame.appid));
        } else if (importMode === 'full') {
            const existingGamesSnapshot = await gamesCollectionRef.where('platform', '==', 'PC').get();
            const deleteBatch = db.batch();
            existingGamesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
        }

        if (steamGames.length === 0) {
            return NextResponse.json({ 
                message: 'No new games to import.', 
                importedCount: 0,
                failedCount: 0,
            });
        }
        
        const steamGameTitles = steamGames.map(sg => sg.name);
        
        let rawgDetailsMap: Record<string, any> = {};
        try {
            const rawgResponse = await fetch(`${req.nextUrl.origin}/api/rawg/get-batch-details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles: steamGameTitles })
            });
            if (rawgResponse.ok) {
                const rawgData = await rawgResponse.json();
                rawgDetailsMap = rawgData.details;
            } else {
                 console.error('[Steam Import] Could not fetch batch RAWG details. Status:', rawgResponse.status);
            }
        } catch(error) {
            console.error('[Steam Import] Error fetching batch RAWG details:', error);
        }

        const validSteamGames = steamGames.filter(sg => rawgDetailsMap[sg.name]);
        const validGameTitles = validSteamGames.map(sg => rawgDetailsMap[sg.name].name);

        let titleToIdMap: Record<string, number> = {};
        try {
            console.log('[Steam Import] Fetching IGDB IDs for titles:', validGameTitles);
            const idResponse = await fetch(`${req.nextUrl.origin}/api/steam/get-igdb-ids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles: validGameTitles })
            });
            if (idResponse.ok) {
                const idData = await idResponse.json();
                titleToIdMap = idData.titleToIdMap;
                console.log('[Steam Import] Received IGDB ID map:', titleToIdMap);
            } else {
                console.error('[Steam Import] Could not fetch IGDB IDs for Steam import. Status:', idResponse.status);
            }
        } catch (error) {
            console.error('[Steam Import] Error fetching IGDB IDs for Steam import:', error);
        }

        let igdbIdToPlaytime: Record<number, { playtimeNormally: number | null, playtimeCompletely: number | null }> = {};
        
        const processableGameDetails = validSteamGames
            .map(sg => ({ steamGame: sg, rawgDetails: rawgDetailsMap[sg.name] }))
            .filter(detail => detail.rawgDetails && titleToIdMap[detail.rawgDetails.name]);
        
        const uniqueIgdbIds = [...new Set(
            processableGameDetails.map(detail => titleToIdMap[detail.rawgDetails.name])
        )];
        
        console.log('[Steam Import] Fetching playtimes for IGDB IDs:', uniqueIgdbIds);
        if (uniqueIgdbIds.length > 0) {
            try {
                const timeResponse = await fetch(`${req.nextUrl.origin}/api/steam/get-batch-playtimes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: uniqueIgdbIds })
                });
                if (timeResponse.ok) {
                    try {
                        const timeData = await timeResponse.json();
                        igdbIdToPlaytime = timeData.playtimes;
                        console.log('[Steam Import] Received playtimes map:', igdbIdToPlaytime);
                    } catch (e) {
                        console.error('[Steam Import] Failed to parse JSON from playtimes response.', e);
                        const textResponse = await timeResponse.text();
                        console.error('[Steam Import] Playtimes response text:', textResponse);
                    }
                } else {
                    console.error('[Steam Import] Could not fetch batch playtimes for Steam import. Status:', timeResponse.status);
                    const errorText = await timeResponse.text();
                    console.error('[Steam Import] Batch playtimes error response text:', errorText);
                }
            } catch (error) {
                console.error('[Steam Import] Error fetching batch playtimes for Steam import:', error);
            }
        }
        
        const batch = db.batch();
        const finalGamePromises = processableGameDetails.map(async ({ steamGame, rawgDetails }) => {
            let steamDeckCompat: SteamDeckCompat = 'unknown';
            if (playsOnSteamDeck && steamGame.appid) {
                steamDeckCompat = await getSteamDeckCompat(steamGame.appid);
            }
            return { steamGame, rawgDetails, steamDeckCompat };
        });

        const finalResults = await Promise.all(finalGamePromises);

        let importedCount = 0;
        let failedCount = steamGameTitles.length - finalResults.length;

        for (const { steamGame, rawgDetails, steamDeckCompat } of finalResults) {
            const gameDocRef = gamesCollectionRef.doc();
            
            const title = rawgDetails.name;
            const igdbId = titleToIdMap[title];
            const igdbTimes = igdbId ? igdbIdToPlaytime[igdbId] : undefined;
            
            const newGame: Omit<Game, 'id'> = {
                userId: uid,
                title: title,
                platform: 'PC',
                genres: rawgDetails.genres?.map((g: any) => g.name) || [],
                list: 'Backlog',
                imageUrl: rawgDetails.background_image || `https://media.rawg.io/media/games/${rawgDetails.slug}.jpg`,
                releaseDate: rawgDetails.released,
                playtimeNormally: igdbTimes?.playtimeNormally ?? undefined,
                playtimeCompletely: igdbTimes?.playtimeCompletely ?? undefined,
                steamAppId: steamGame.appid,
                steamDeckCompat: steamDeckCompat,
            };

            // Fallback to RAWG playtime or Steam playtime if IGDB fails
            if (newGame.playtimeNormally === undefined) {
                newGame.playtimeNormally = rawgDetails.playtime || Math.round(steamGame.playtime_forever / 60) || undefined;
            }
            
            if (newGame.playtimeNormally === undefined) delete newGame.playtimeNormally;
            if (newGame.playtimeCompletely === undefined) delete newGame.playtimeCompletely;

            batch.set(gameDocRef, newGame);
            importedCount++;
        }

        await batch.commit();

        const message = `Import complete. Successfully imported ${importedCount} games. Failed to find matching data for ${failedCount} games.`;
        
        console.log('[Steam Import] Success:', message);
        return NextResponse.json({ 
            message,
            importedCount,
            failedCount,
        });

    } catch (error: any) {
        console.error('Steam import process failed:', error);
        return NextResponse.json({ message: error.message || 'An unknown error occurred during import.' }, { status: 500 });
    }
}
