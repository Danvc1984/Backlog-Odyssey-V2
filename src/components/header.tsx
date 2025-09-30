import { Swords } from 'lucide-react';

const AppHeader = () => {
  return (
    <header className="flex items-center gap-3 text-primary">
      <Swords className="h-8 w-8" />
      <h1 className="text-3xl font-bold tracking-tight text-white">
        Backlog <span className="text-primary">Odyssey V2</span>
      </h1>
    </header>
  );
};

export default AppHeader;
