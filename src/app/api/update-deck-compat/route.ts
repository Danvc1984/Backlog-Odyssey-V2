
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getSteamDeckCompat } from '@/app/api/steam/utils';

// Helper function to initialize Firebase Admin SDK
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
