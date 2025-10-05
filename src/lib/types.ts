
import type { SteamDeckCompat } from "@/app/api/steam/utils";

export type GameList = "Wishlist" | "Backlog" | "Now Playing" | "Recently Played";

export const USER_SELECTABLE_PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch"] as const;
export const ALL_PLATFORMS = [...USER_SELECTABLE_PLATFORMS, "Others/ROMs"] as const;
export type Platform = typeof ALL_PLATFORMS[number];

export type { SteamDeckCompat };

export type Genre = string;

export interface Game {
  id: string;
  userId: string;
  title: string;
  platform: Platform;
  genres: Genre[];
  list: GameList;
  imageUrl: string;
  releaseDate?: string;
  playtimeMain?: number;
  playtimeMainExtra?: number;
  playtimeCompletionist?: number;
  steamAppId?: number;
  steamDeckCompat?: SteamDeckCompat;
  rating?: number;
}

export type Recommendation = {
  title: string;
  platform: string;
  genre: string;
  reason: string;
};

export type AuthFormValues = {
  email: string;
  password: string
}

export interface UserPreferences {
  platforms: Platform[];
  favoritePlatform: Platform;
  notifyDiscounts?: boolean;
  playsOnSteamDeck?: boolean;
}

export interface UserProfile {
  onboardingComplete: boolean;
  steamId?: string;
}

export interface Challenge {
  id: string;
  userId: string;
  title: string;
  goal: number;
  progress: number;
  status: 'active' | 'completed';
  createdAt: any;
}
