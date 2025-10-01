import {
  Laptop,
  Gamepad2,
  Gamepad,
  Square,
  Swords,
  Bomb,
  Mountain,
  BrainCircuit,
  Puzzle,
  Trophy,
  Users,
  Lightbulb,
  ImageOff,
  type LucideProps
} from 'lucide-react';
import type { Platform, Genre } from '@/lib/types';

export const platformIcons: Record<Platform, React.ComponentType<LucideProps>> = {
  "PC": Laptop,
  "PlayStation": Gamepad2,
  "Xbox": Gamepad,
  "Nintendo Switch": Square,
};

export const genreIcons: Record<Genre, React.ComponentType<LucideProps>> = {
  "RPG": Swords,
  "Action": Bomb,
  "Adventure": Mountain,
  "Strategy": BrainCircuit,
  "Puzzle": Puzzle,
  "Sports": Trophy,
  "MMO": Users,
  "Indie": Lightbulb,
};
