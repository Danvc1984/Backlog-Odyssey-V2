



'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';
import axios from 'axios';
import type { Game, SteamDeckCompat, UserPreferences } from '@/lib/types';

const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RAWG_API_KEY = process.env.NEXT_PUBLIC_RAWG_API_KEY;

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

export async function getSteamDeckCompat(appId: number): Promise<SteamDeckCompat> {
    try {
        const response = await axios.get(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`);
        const tier = response.data?.tier;
        if (['native', 'platinum'].includes(tier)) return 'verified';
        if (tier === 'gold') return 'playable';
        if (tier === 'silver' || tier === 'bronze') return 'unsupported';
        if (tier === 'borked') return 'borked';
        return 'unknown';
    } catch (error) {
        return 'unknown';
    }
}


export async function POST(req: NextRequest) {
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
        
        const [userProfileSnap, prefDocSnap] = await Promise.all([
            userProfileRef.get(),
            prefDocRef.get()
        ]);
        
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
        
        const batch = db.batch();
        const gamePromises = steamGames.map(async (steamGame) => {
            const rawgDetails = await getRawgGameDetails(steamGame.name);
            let steamDeckCompat: SteamDeckCompat = 'unknown';
            if (playsOnSteamDeck && rawgDetails) {
                steamDeckCompat = await getSteamDeckCompat(steamGame.appid);
            }
            return { steamGame, rawgDetails, steamDeckCompat };
        });
        
        const results = await Promise.all(gamePromises);

        let importedCount = 0;
        let failedCount = 0;

        for (const { steamGame, rawgDetails, steamDeckCompat } of results) {
            if (rawgDetails) {
                const gameDocRef = gamesCollectionRef.doc();
                
                const newGame: Omit<Game, 'id'> = {
                    userId: uid,
                    title: rawgDetails.name || steamGame.name,
                    platform: 'PC',
                    genres: rawgDetails.genres?.map((g: any) => g.name) || [],
                    list: 'Backlog',
                    imageUrl: rawgDetails.background_image || `https://media.rawg.io/media/games/${rawgDetails.slug}.jpg`,
                    releaseDate: rawgDetails.released,
                    estimatedPlaytime: rawgDetails.playtime || Math.round(steamGame.playtime_forever / 60) || 0,
                    steamAppId: steamGame.appid,
                    steamDeckCompat: steamDeckCompat,
                };
                batch.set(gameDocRef, newGame);
                importedCount++;
            } else {
                failedCount++;
            }
        }

        await batch.commit();

        return NextResponse.json({ 
            message: 'Import successful', 
            importedCount,
            failedCount,
        });

    } catch (error: any) {
        console.error('Steam import process failed:', error);
        return NextResponse.json({ message: error.message || 'An unknown error occurred during import.' }, { status: 500 });
    }
}
