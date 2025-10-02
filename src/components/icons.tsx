
import {
  Laptop,
  Gamepad2,
  Gamepad,
  Square,
  Archive,
  type LucideProps
} from 'lucide-react';
import type { Platform } from '@/lib/types';

export const platformIcons: Record<Platform, React.ComponentType<LucideProps>> = {
  "PC": Laptop,
  "PlayStation": Gamepad2,
  "Xbox": Gamepad,
  "Nintendo Switch": Square,
  "Others/ROMs": Archive,
};
