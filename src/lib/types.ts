
export type GameList = "Wishlist" | "Backlog" | "Now Playing" | "Recently Played";

export const ALL_PLATFORMS = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "ROMs/Other"] as const;
export type Platform = typeof ALL_PLATFORMS[number];

export type Genre = "Action" | "Adventure" | "Indie" | "MMO" | "Puzzle" | "RPG" | "Sports" | "Strategy";

export interface Game {
  id: string;
  userId: string;
  title: string;
  platform: Platform;
  genres: Genre[];
  list: GameList;
  imageUrl: string;
  releaseDate?: string;
  estimatedPlaytime?: number;
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
}
