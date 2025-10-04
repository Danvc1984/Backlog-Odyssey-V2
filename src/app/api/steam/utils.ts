'use server';

import axios from 'axios';

export type SteamDeckCompat =
  | 'verified'
  | 'playable'
  | 'unsupported'
  | 'borked'
  | 'unknown';

export async function getSteamDeckCompat(
  appId: number
): Promise<SteamDeckCompat> {
  try {
    const response = await axios.get(
      `https://www.protondb.com/api/v1/reports/summaries/${appId}.json`
    );
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
