
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';
import { getSteamDeckCompat } from '@/app/api/steam/utils';

export async function POST(req: NextRequest) {
    const auth = getAdminAuth();
    const db = getAdminFirestore();

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

    try {
        const gamesCollectionRef = db.collection('users').doc(uid).collection('games');
        const pcGamesSnapshot = await gamesCollectionRef.where('platform', '==', 'PC').get();

        if (pcGamesSnapshot.empty) {
            return NextResponse.json({ message: 'No PC games found to update.' });
        }

        const batch = db.batch();
        const updatePromises = pcGamesSnapshot.docs.map(async (doc) => {
            const game = doc.data();
            if (game.steamAppId) {
                const newCompat = await getSteamDeckCompat(game.steamAppId);
                if (newCompat !== game.steamDeckCompat) {
                    batch.update(doc.ref, { steamDeckCompat: newCompat });
                }
            }
        });

        await Promise.all(updatePromises);
        await batch.commit();

        return NextResponse.json({ message: 'Steam Deck compatibility status updated for all PC games.' });

    } catch (error: any) {
        console.error('Error updating Steam Deck compatibility:', error);
        return NextResponse.json({ message: error.message || 'An unknown error occurred.' }, { status: 500 });
    }
}
