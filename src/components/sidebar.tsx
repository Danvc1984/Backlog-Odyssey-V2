"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Library, User, ChevronDown } from 'lucide-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarBody,
  SidebarContent,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import React from 'react';
import type { GameList } from '@/lib/types';

const gameLists: GameList[] = ['Now Playing', 'Backlog', 'Wishlist', 'Recently Played'];

const AppSidebar = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeList = searchParams.get('list');

  const isLibraryRoute = pathname === '/library';

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      href: '/profile',
      label: 'My Profile',
      icon: User,
    }
  ];

  return (
    <>
      <SidebarHeader>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarBody>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             <Collapsible asChild defaultOpen={isLibraryRoute}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isLibraryRoute}
                    tooltip="My Library"
                    className="justify-between"
                  >
                    <div className='flex items-center gap-2'>
                      <Library />
                      <span className="group-data-[collapsible=icon]:hidden">My Library</span>
                    </div>
                    <ChevronDown className="h-4 w-4 group-data-[collapsible=icon]:hidden transition-transform duration-200 [&[data-state=open]]:-rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
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
          </SidebarMenu>
        </SidebarContent>
        <SidebarRail />
      </SidebarBody>
    </>
  );
};

export default AppSidebar;
