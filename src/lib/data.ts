import type { Game } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const initialGames: Game[] = [
  {
    id: '1',
    userId: 'anonymous',
    title: 'The Witcher 3: Wild Hunt',
    platform: 'PC',
    genres: ['RPG', 'Action', 'Adventure'],
    list: 'Now Playing',
    imageUrl: getImage('witcher-3')?.imageUrl || '',
  },
  {
    id: '2',
    userId: 'anonymous',
    title: 'Cyberpunk 2077',
    platform: 'PlayStation',
    genres: ['RPG', 'Action'],
    list: 'Backlog',
    imageUrl: getImage('cyberpunk-2077')?.imageUrl || '',
  },
  {
    id: '3',
    userId: 'anonymous',
    title: 'Stardew Valley',
    platform: 'PC',
    genres: ['Indie', 'RPG'],
    list: 'Recently Played',
    imageUrl: getImage('stardew-valley')?.imageUrl || '',
  },
  {
    id: '4',
    userId: 'anonymous',
    title: 'Hades',
    platform: 'Nintendo Switch',
    genres: ['Action', 'Indie'],
    list: 'Now Playing',
    imageUrl: getImage('hades')?.imageUrl || '',
  },
  {
    id: '5',
    userId: 'anonymous',
    title: 'The Legend of Zelda: Breath of the Wild',
    platform: 'Nintendo Switch',
    genres: ['Adventure', 'Action'],
    list: 'Recently Played',
    imageUrl: getImage('zelda-botw')?.imageUrl || '',
  },
  {
    id: '6',
    userId: 'anonymous',
    title: 'Elden Ring',
    platform: 'Xbox',
    genres: ['RPG', 'Action'],
    list: 'Wishlist',
    imageUrl: getImage('elden-ring')?.imageUrl || '',
  },
];
