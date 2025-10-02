
"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Library, User, ChevronDown, LogOut } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarBody,
  SidebarContent,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import React from 'react';
import type { GameList } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

const gameLists: GameList[] = ['Now Playing', 'Backlog', 'Wishlist', 'Recently Played'];

const AppSidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();
  const router = useRouter();
  const activeList = searchParams.get('list');
  const { toggleSidebar, state } = useSidebar();

  const isLibraryRoute = pathname === '/library';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state === 'collapsed') {
      // Prevent clicks on actual buttons from toggling the sidebar
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      toggleSidebar();
    }
  };

  return (
    <>
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarBody onClick={handleBodyClick}>
        <SidebarContent className="p-2 flex-grow">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard">
                <SidebarMenuButton isActive={pathname === '/dashboard'} tooltip="Dashboard">
                  <LayoutDashboard />
                  <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <Collapsible asChild defaultOpen={isLibraryRoute}>
              <SidebarMenuItem>
                <div className='flex items-center justify-between pr-2'>
                  <Link href="/library?list=Now%20Playing" className='flex-grow'>
                    <SidebarMenuButton
                      isActive={isLibraryRoute}
                      tooltip="My Library"
                      className="w-full justify-start"
                    >
                      <div className='flex items-center gap-2'>
                        <Library />
                        <span className="group-data-[collapsible=icon]:hidden">My Library</span>
                      </div>
                    </SidebarMenuButton>
                  </Link>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 group-data-[collapsible=icon]:hidden"
                    >
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <ul className="pl-7 py-2 space-y-1 group-data-[collapsible=icon]:hidden">
                    {gameLists.map(list => (
                      <li key={list}>
                         <Link href={`/library?list=${encodeURIComponent(list)}`}>
                           <SidebarMenuButton
                            size="sm"
                            isActive={isLibraryRoute && activeList === list}
                            className={cn("w-full justify-start", (isLibraryRoute && activeList === list) && "bg-accent/50")}
                          >
                             {list}
                           </SidebarMenuButton>
                         </Link>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
            
            <SidebarMenuItem>
              <Link href="/profile">
                <SidebarMenuButton isActive={pathname === '/profile'} tooltip="My Profile">
                  <User />
                  <span className="group-data-[collapsible=icon]:hidden">My Profile</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className='p-2 pb-16'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                <LogOut />
                <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarBody>
    </>
  );
};

export default AppSidebar;
