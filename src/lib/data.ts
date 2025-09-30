import type { Game } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const initialGames: Game[] = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    platform: 'PC',
    genre: 'RPG',
    list: 'Now Playing',
    imageUrl: getImage('witcher-3')?.imageUrl || '',
    imageHint: getImage('witcher-3')?.imageHint || ''
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    platform: 'PlayStation',
    genre: 'RPG',
    list: 'Backlog',
    imageUrl: getImage('cyberpunk-2077')?.imageUrl || '',
    imageHint: getImage('cyberpunk-2077')?.imageHint || ''
  },
  {
    id: '3',
    title: 'Stardew Valley',
    platform: 'PC',
    genre: 'Indie',
    list: 'Recently Played',
    imageUrl: getImage('stardew-valley')?.imageUrl || '',
    imageHint: getImage('stardew-valley')?.imageHint || ''
  },
  {
    id: '4',
    title: 'Hades',
    platform: 'Nintendo Switch',
    genre: 'Action',
    list: 'Now Playing',
    imageUrl: getImage('hades')?.imageUrl || '',
    imageHint: getImage('hades')?.imageHint || ''
  },
  {
    id: '5',
    title: 'The Legend of Zelda: Breath of the Wild',
    platform: 'Nintendo Switch',
    genre: 'Adventure',
    list: 'Recently Played',
    imageUrl: getImage('zelda-botw')?.imageUrl || '',
    imageHint: getImage('zelda-botw')?.imageHint || ''
  },
  {
    id: '6',
    title: 'Elden Ring',
    platform: 'Xbox',
    genre: 'RPG',
    list: 'Wishlist',
    imageUrl: getImage('elden-ring')?.imageUrl || '',
    imageHint: getImage('elden-ring')?.imageHint || ''
  },
];
