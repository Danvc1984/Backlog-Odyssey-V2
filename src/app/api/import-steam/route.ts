

'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';
import type { Game, UserPreferences } from '@/lib/types';
import { getSteamDeckCompat, SteamDeckCompat } from '@/app/api/steam/utils';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

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

async function getRawgGameDetails(gameName: string): Promise<any> {
    try {
        const response = await axios.get('https://api.rawg.io/api/games', {
            params: { key: RAWG_API_KEY, search: gameName, page_size: 1 },
        });
        if (response.data.results.length > 0) {
            return response.data.results[0];
        }
        return null;
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 401) {
                throw new Error('Invalid RAWG API Key.');
            }
        }
        return null;
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
        
        const gameDetailsPromises = steamGames.map(sg => getRawgGameDetails(sg.name).then(details => ({ steamGame: sg, rawgDetails: details })));
        const gameDetailsResults = await Promise.all(gameDetailsPromises);
        
        const validGameDetails = gameDetailsResults.filter(res => res.rawgDetails);
        const gameTitles = validGameDetails.map(res => res.rawgDetails.name);

        let titleToIgdbId: Record<string, number> = {};
        try {
            const idResponse = await fetch(`${req.nextUrl.origin}/api/steam/get-igdb-ids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles: gameTitles })
            });
            if (idResponse.ok) {
                const idData = await idResponse.json();
                titleToIgdbId = idData.titleToIdMap;
            } else {
                console.error('Could not fetch IGDB IDs for Steam import.');
            }
        } catch (error) {
            console.error('Error fetching IGDB IDs for Steam import:', error);
        }

        const processableGameDetails = validGameDetails.filter(
            detail => detail.rawgDetails && titleToIgdbId[detail.rawgDetails.name]
        );

        let igdbIdToPlaytime: Record<number, { playtimeNormally: number | null, playtimeCompletely: number | null }> = {};
        
        const uniqueIgdbIds = [...new Set(
            processableGameDetails.map(detail => titleToIgdbId[detail.rawgDetails.name])
        )];

        if (uniqueIgdbIds.length > 0) {
            try {
                const timeResponse = await fetch(`${req.nextUrl.origin}/api/steam/get-batch-playtimes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: uniqueIgdbIds })
                });
                if (timeResponse.ok) {
                    const timeData = await timeResponse.json();
                    igdbIdToPlaytime = timeData.playtimes;
                } else {
                    console.error('Could not fetch batch playtimes for Steam import.');
                }
            } catch (error) {
                console.error('Error fetching batch playtimes for Steam import:', error);
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
        let failedCount = gameDetailsResults.length - finalResults.length;

        for (const { steamGame, rawgDetails, steamDeckCompat } of finalResults) {
            const gameDocRef = gamesCollectionRef.doc();
            
            const title = rawgDetails.name;
            const igdbId = titleToIgdbId[title];
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

            if (!newGame.playtimeNormally) {
                newGame.playtimeNormally = rawgDetails.playtime || Math.round(steamGame.playtime_forever / 60) || undefined;
            }
            
            if (!newGame.playtimeNormally) delete newGame.playtimeNormally;
            if (!newGame.playtimeCompletely) delete newGame.playtimeCompletely;

            batch.set(gameDocRef, newGame);
            importedCount++;
        }

        await batch.commit();

        const message = `Import complete. Successfully imported ${importedCount} games. Failed to find matching data for ${failedCount} games.`;

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
