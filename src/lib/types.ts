export type GameList = "Wishlist" | "Backlog" | "Now Playing" | "Recently Played";

export type Platform = "PC" | "PlayStation" | "Xbox" | "Nintendo Switch";

export type Genre = "Action" | "Adventure" | "Indie" | "MMO" | "Puzzle" | "RPG" | "Sports" | "Strategy";

export interface Game {
  id: string;
  userId: string;
  title: string;
  platform: Platform;
  genre: Genre;
  list: GameList;
  imageUrl: string;
  imageHint: string;
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
